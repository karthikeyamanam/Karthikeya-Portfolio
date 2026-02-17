// Three.js Background Shader
const canvas = document.querySelector('#hero-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Cinematic Fog
scene.fog = new THREE.Fog(0x0a0b1e, 1, 15);

// Shader Material
const vertexShader = `
    varying vec2 vUv;
    varying float vElevation;
    uniform float uTime;
    uniform vec2 uMouse;

    void main() {
        vUv = uv;
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        
        // Complex smooth wave displacement
        float elevation = sin(modelPosition.x * 0.8 + uTime * 0.5) * 0.15
                        + sin(modelPosition.z * 0.5 + uTime * 0.3) * 0.15
                        + sin((modelPosition.x + modelPosition.z) * 0.3 + uTime * 0.2) * 0.1;
        
        modelPosition.y += elevation;
        
        // Smooth Mouse influence
        float dist = distance(vec2(modelPosition.x, modelPosition.z), uMouse * 6.0);
        float mouseInfluence = smoothstep(5.0, 0.0, dist) * 0.4;
        modelPosition.y += mouseInfluence;

        vElevation = elevation + mouseInfluence;
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectedPosition = projectionMatrix * viewPosition;
        gl_Position = projectedPosition;
    }
`;

const fragmentShader = `
    varying vec2 vUv;
    varying float vElevation;
    uniform float uTime;

    void main() {
        vec3 baseColor = vec3(0.01, 0.01, 0.07);
        vec3 accentColor = vec3(0.12, 0.02, 0.24);
        vec3 neonColor = vec3(1.0, 0.0, 0.6);
        
        float mixStrength = vElevation * 1.5 + 0.2;
        vec3 color = mix(baseColor, accentColor, clamp(mixStrength, 0.0, 1.0));
        
        vec2 g = abs(fract(vUv * 44.0 - 0.5) - 0.5) / fwidth(vUv * 44.0);
        float line = min(g.x, g.y);
        float gridLine = 1.0 - min(line, 1.0);
        float neonPulse = 0.6 + 0.4 * sin(uTime * 1.5 + vUv.x * 10.0 + vUv.y * 8.0);
        color = mix(color, neonColor, clamp(gridLine * 0.25 * neonPulse, 0.0, 0.6));
        
        float peak = smoothstep(0.12, 0.35, vElevation);
        color = mix(color, neonColor, peak * 0.2);
        
        float horizon = smoothstep(0.2, 0.9, vUv.y);
        color += vec3(0.08, 0.0, 0.18) * horizon * 0.25;
        
        float vignette = distance(vUv, vec2(0.5));
        color *= 1.2 - smoothstep(0.2, 0.8, vignette);
        
        float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
        color += noise * 0.012;

        gl_FragColor = vec4(color, 1.0);
    }
`;

const geometry = new THREE.PlaneGeometry(40, 40, 160, 160);
const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    transparent: true,
    side: THREE.DoubleSide
});

const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI * 0.45; // More flat for infinite feel
mesh.position.y = -1.5;
scene.add(mesh);

camera.position.z = 6;
camera.position.y = 2.5;
camera.lookAt(0, -1, 0);

// Mouse Move Tracking with Lerp
const mouse = new THREE.Vector2();
const targetMouse = new THREE.Vector2();
const lerpSpeed = 0.05;
let rawMouseX = window.innerWidth / 2;
let rawMouseY = window.innerHeight / 2;
let ringX = rawMouseX;
let ringY = rawMouseY;
const cursorDot = document.querySelector('.cursor-dot');
const cursorRing = document.querySelector('.cursor-ring');
let ringScale = 1;

window.addEventListener('mousemove', (event) => {
    targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    rawMouseX = event.clientX;
    rawMouseY = event.clientY;
});

if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

const clock = new THREE.Clock();
const animate = () => {
    const elapsedTime = clock.getElapsedTime();
    material.uniforms.uTime.value = elapsedTime;
    
    // Lerp mouse movement
    mouse.x += (targetMouse.x - mouse.x) * lerpSpeed;
    mouse.y += (targetMouse.y - mouse.y) * lerpSpeed;
    
    material.uniforms.uMouse.value.set(mouse.x, mouse.y);
    
    // Parallax & Tilt effects
    if (window.innerWidth > 768) {
        gsap.to('.hero-content', {
            x: mouse.x * 25,
            y: -mouse.y * 25,
            duration: 1,
            ease: 'power2.out'
        });
        
        // Code panel removed
    }
    
    if (cursorDot && cursorRing && window.innerWidth > 768) {
        cursorDot.style.transform = `translate3d(${rawMouseX}px, ${rawMouseY}px, 0)`;
        ringX += (rawMouseX - ringX) * 0.2;
        ringY += (rawMouseY - ringY) * 0.2;
        cursorRing.style.transform = `translate3d(${ringX - 16}px, ${ringY - 16}px, 0) scale(${ringScale})`;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
};
animate();

// GSAP Reveal Animations Timeline
window.addEventListener('load', () => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 1.1 } });

    tl.to('#hero-canvas', { opacity: 1, duration: 2 })
      .to('.main-title', { opacity: 1, y: 0 }, 0.8)
      .to('.subheading', { opacity: 1, y: 0, duration: 1 }, 1.1) // 1.1s Subtitle
      .to('.cta-buttons', { opacity: 1, y: 0, duration: 1 }, 1.6); // 1.6s Buttons

    // Tagline typewriter: exact text "Creating Interactive UI..."
    const typewriterElement = document.getElementById('typewriter');
    const taglinePhrase = "Creating Interactive UI...";
    let taglineIndex = 0;
    function typeTagline() {
        typewriterElement.textContent = taglinePhrase.slice(0, taglineIndex);
        taglineIndex++;
        if (taglineIndex <= taglinePhrase.length) {
            setTimeout(typeTagline, 45);
        }
    }
    gsap.delayedCall(1.3, typeTagline);

    // Code panel removed

    // Title background typing removed
    const hoverTargets = document.querySelectorAll('a, button, .btn, .service-cta, .nav-link');
    hoverTargets.forEach((el) => {
        el.addEventListener('mouseenter', () => {
            ringScale = 1.18;
            cursorDot && cursorDot.classList.add('interactive');
            cursorRing && cursorRing.classList.add('interactive');
        });
        el.addEventListener('mouseleave', () => {
            ringScale = 1.0;
            cursorDot && cursorDot.classList.remove('interactive');
            cursorRing && cursorRing.classList.remove('interactive');
        });
    });
    window.addEventListener('mousedown', () => {
        ringScale = 0.95;
    });
    window.addEventListener('mouseup', () => {
        ringScale = 1.0;
    });

    const sectionScrollConfigs = [
        {
            id: 'what-i-do',
            itemsSelector: '.services-grid .service-card',
            stagger: 0.12
        },
        {
            id: 'skills',
            itemsSelector: '.skills-slider',
            stagger: 0
        },
        {
            id: 'projects',
            itemsSelector: '.projects-grid .project-card',
            stagger: 0.12
        },
        {
            id: 'about',
            itemsSelector: '.about-left, .about-right',
            stagger: 0.15
        }
    ];

    sectionScrollConfigs.forEach((cfg) => {
        const sectionEl = document.getElementById(cfg.id);
        if (!sectionEl) return;

        if (typeof ScrollTrigger !== 'undefined') {
            const title = sectionEl.querySelector('.section-title');
            const subtitle = sectionEl.querySelector('.section-subtitle');
            const items = cfg.itemsSelector
                ? sectionEl.querySelectorAll(cfg.itemsSelector)
                : null;

            const baseElements = [];
            if (title) baseElements.push(title);
            if (subtitle) baseElements.push(subtitle);
            if (items && items.length) {
                items.forEach((el) => baseElements.push(el));
            }
            if (baseElements.length) {
                gsap.set(baseElements, { opacity: 0, y: 24 });
            }

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionEl,
                    start: 'top 80%',
                    end: 'bottom 20%',
                    toggleActions: 'play reverse play reverse'
                }
            });

            if (title) {
                tl.to(title, {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    ease: 'power2.out'
                });
            }

            if (subtitle) {
                tl.to(subtitle, {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    ease: 'power2.out'
                }, '-=0.3');
            }

            if (items && items.length) {
                if (cfg.stagger && cfg.stagger > 0) {
                    tl.to(items, {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                        stagger: cfg.stagger,
                        ease: 'power2.out'
                    }, '-=0.2');
                } else {
                    tl.to(items, {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                        ease: 'power2.out'
                    }, '-=0.2');
                }
            }
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting || entry.target !== sectionEl) return;
                const title = sectionEl.querySelector('.section-title');
                const subtitle = sectionEl.querySelector('.section-subtitle');
                const items = cfg.itemsSelector
                    ? sectionEl.querySelectorAll(cfg.itemsSelector)
                    : null;
                if (title) {
                    gsap.to(title, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' });
                }
                if (subtitle) {
                    gsap.to(subtitle, {
                        opacity: 1,
                        y: 0,
                        duration: 0.7,
                        delay: 0.15,
                        ease: 'power2.out'
                    });
                }
                if (items && items.length) {
                    if (cfg.stagger && cfg.stagger > 0) {
                        gsap.from(items, {
                            opacity: 0,
                            y: 24,
                            duration: 0.6,
                            stagger: cfg.stagger,
                            ease: 'power2.out'
                        });
                    } else {
                        gsap.from(items, {
                            opacity: 0,
                            y: 24,
                            duration: 0.7,
                            ease: 'power2.out'
                        });
                    }
                }
                obs.unobserve(sectionEl);
            });
        }, { threshold: 0.25 });
        observer.observe(sectionEl);
    });

    const services = document.querySelector('#what-i-do');

    const pixelsLayer = document.querySelector('#what-i-do .bg-pixels');
    if (pixelsLayer && services) {
        const count = 22;
        for (let i = 0; i < count; i++) {
            const s = document.createElement('span');
            s.className = 'pixel';
            const size = Math.round(6 + Math.random() * 12);
            const left = Math.round(Math.random() * 100);
            const top = Math.round(Math.random() * 100);
            s.style.width = size + 'px';
            s.style.height = size + 'px';
            s.style.left = left + '%';
            s.style.top = top + '%';
            s.style.animation = `floatPixel ${6 + Math.random() * 6}s linear infinite`;
            s.style.opacity = (0.08 + Math.random() * 0.1).toFixed(2);
            pixelsLayer.appendChild(s);
        }
        window.addEventListener('scroll', () => {
            const y = window.scrollY;
            const factor = 0.02;
            pixelsLayer.style.transform = `translateY(${y * factor}px)`;
        });
    }

    const cards = document.querySelectorAll('.service-card');
    cards.forEach((card) => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            card.style.setProperty('--px', `${Math.round(x * 100)}%`);
            card.style.setProperty('--py', `${Math.round(y * 100)}%`);
            const rx = (0.5 - y) * 8;
            const ry = (x - 0.5) * 12;
            card.style.setProperty('--rx', `${rx}deg`);
            card.style.setProperty('--ry', `${ry}deg`);
        });
        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--px', `50%`);
            card.style.setProperty('--py', `50%`);
            card.style.setProperty('--rx', `0deg`);
            card.style.setProperty('--ry', `0deg`);
        });
    });

    const serviceModal = document.querySelector('.service-modal');
    if (serviceModal) {
        const modalTitle = serviceModal.querySelector('.service-modal-title');
        const modalBody = serviceModal.querySelector('.service-modal-body');
        const closeButton = serviceModal.querySelector('.service-modal-close');
        const triggers = document.querySelectorAll('.service-card .service-cta');

        const openModal = (title, text) => {
            if (modalTitle) modalTitle.textContent = title;
            if (modalBody) modalBody.textContent = text;
            serviceModal.classList.add('active');
            serviceModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        };

        const closeModal = () => {
            serviceModal.classList.remove('active');
            serviceModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        };

        triggers.forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const card = link.closest('.service-card');
                const titleEl = card ? card.querySelector('.card-title') : null;
                const descEl = card ? card.querySelector('.card-desc') : null;
                const title = titleEl ? titleEl.textContent.trim() : 'More details';
                const text = link.getAttribute('data-modal-text') || (descEl ? descEl.textContent.trim() : '');
                openModal(title, text);
            });
        });

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                closeModal();
            });
        }

        serviceModal.addEventListener('click', (e) => {
            if (e.target === serviceModal) {
                closeModal();
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && serviceModal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    const skillsSection = document.querySelector('#skills');
    if (skillsSection) {
        const track = skillsSection.querySelector('.skills-cards');
        const skillCards = Array.from(skillsSection.querySelectorAll('.skill-card'));
        if (track && skillCards.length > 1) {
            const total = skillCards.length;
            let active = 0;
            const layout = () => {
                const first = skillCards[0];
                if (!first) return;
                const rect = first.getBoundingClientRect();
                const trackRect = track.getBoundingClientRect();
                let baseX = rect.width + 32;
                const maxBase = (trackRect.width - rect.width) / 2;
                if (!Number.isNaN(maxBase) && maxBase > 0) {
                    baseX = Math.min(baseX, Math.max(maxBase, rect.width * 0.7));
                }
                track.style.height = `${rect.height}px`;
                skillCards.forEach((card, i) => {
                    let d = (i - active + total) % total;
                    let x = 0;
                    let scale = 1;
                    let opacity = 0;
                    let z = 0;
                    let pe = 'none';
                    if (d === total - 1) {
                        x = -baseX;
                        scale = 1;
                        opacity = 0.85;
                        z = 1;
                        pe = 'auto';
                    } else if (d === 0) {
                        x = 0;
                        scale = 1;
                        opacity = 1;
                        z = 2;
                        pe = 'auto';
                    } else if (d === 1) {
                        x = baseX;
                        scale = 1;
                        opacity = 0.85;
                        z = 1;
                        pe = 'auto';
                    } else if (d === 2) {
                        x = baseX * 2;
                        scale = 1;
                        opacity = 0;
                        z = 0;
                    } else {
                        x = -baseX * 2;
                        scale = 1;
                        opacity = 0;
                        z = 0;
                    }
                    card.style.setProperty('--x', `${x}px`);
                    card.style.setProperty('--scale', scale);
                    card.style.opacity = opacity;
                    card.style.zIndex = z;
                    card.style.pointerEvents = pe;
                });
            };
            layout();
            window.addEventListener('resize', layout);
            setInterval(() => {
                active = (active + 1) % total;
                layout();
            }, 2000);
        }
    }

    const journeySection = document.querySelector('#journey');
    if (journeySection && typeof ScrollTrigger !== 'undefined') {
        const path = journeySection.querySelector('#journey-path-active');
        const container = journeySection.querySelector('.timeline-container');
        const milestones = Array.from(journeySection.querySelectorAll('.milestone')).map((item) => {
            const node = item.querySelector('.node');
            const year = item.querySelector('.year');
            const card = item.querySelector('.journey-card');
            const isLeft = item.classList.contains('left');

            const tl = gsap.timeline({ paused: true });

            if (node) {
                tl.fromTo(node, { scale: 0, opacity: 0 }, {
                    scale: 1,
                    opacity: 1,
                    duration: 0.35,
                    ease: 'back.out(1.7)'
                });
            }

            if (year) {
                tl.to(year, {
                    opacity: 1,
                    duration: 0.25,
                    ease: 'power2.out'
                }, '-=0.1');
            }

            if (card) {
                tl.fromTo(card, {
                    opacity: 0,
                    x: isLeft ? -40 : 40
                }, {
                    opacity: 1,
                    x: 0,
                    duration: 0.6,
                    ease: 'power2.out'
                }, '-=0.05');
            }

            return { el: item, tl, threshold: 0 };
        });

        if (path) {
            let sectionHeight = 1;
            if (container) {
                const rect = container.getBoundingClientRect();
                sectionHeight = rect.height || 1;
                milestones.forEach((m) => {
                    const mRect = m.el.getBoundingClientRect();
                    const raw = (mRect.top - rect.top) / sectionHeight;
                    m.threshold = Math.min(1, Math.max(0, raw));
                });
            }

            const length = path.getTotalLength();
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;
            gsap.fromTo(path, { strokeDashoffset: length }, {
                strokeDashoffset: 0,
                ease: 'none',
                scrollTrigger: {
                    trigger: journeySection,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 1,
                    pin: true,
                    onUpdate: (self) => {
                        const progress = self.progress;
                        const direction = self.direction;

                        if (container && sectionHeight > 0) {
                            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
                            const maxOffset = Math.max(0, sectionHeight - viewportHeight);
                            const offset = maxOffset * progress;
                            container.style.transform = `translateY(${-offset}px)`;
                        }

                        milestones.forEach((m) => {
                            if (direction === 1 && progress >= m.threshold) {
                                m.tl.play();
                            } else if (direction === -1 && progress < m.threshold) {
                                m.tl.reverse();
                            }
                        });
                    }
                }
            });
        }

        const title = journeySection.querySelector('.section-title');
        if (title && typeof ScrollTrigger !== 'undefined') {
            gsap.fromTo(title, { opacity: 0, y: -16 }, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: journeySection,
                    start: 'top 80%',
                    toggleActions: 'play reverse play reverse'
                }
            });
        }
    }

    const contactSection = document.querySelector('#contact');
    if (contactSection) {
        if (typeof ScrollTrigger !== 'undefined') {
            const title = contactSection.querySelector('.section-title');
            const subtitle = contactSection.querySelector('.section-subtitle');
            const left = contactSection.querySelector('.contact-left');
            const right = contactSection.querySelector('.contact-right');

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: contactSection,
                    start: 'top 80%',
                        toggleActions: 'play reverse play reverse'
                }
            });

            if (title) {
                tl.fromTo(title, { opacity: 0, y: 12 }, {
                    opacity: 1,
                    y: 0,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }

            if (subtitle) {
                tl.fromTo(subtitle, { opacity: 0, y: 12 }, {
                    opacity: 1,
                    y: 0,
                    duration: 0.4,
                    ease: 'power2.out'
                }, '-=0.2');
            }

            if (left) {
                tl.fromTo(left, { opacity: 0, x: -30 }, {
                    opacity: 1,
                    x: 0,
                    duration: 0.5,
                    ease: 'power2.out'
                }, '-=0.1');
            }

            if (right) {
                tl.fromTo(right, { opacity: 0, x: 30 }, {
                    opacity: 1,
                    x: 0,
                    duration: 0.5,
                    ease: 'power2.out'
                }, '-=0.3');
            }
        }

        const contactForm = contactSection.querySelector('.contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const formData = new FormData(contactForm);
                const name = (formData.get('name') || '').toString().trim();
                const email = (formData.get('email') || '').toString().trim();
                const message = (formData.get('message') || '').toString().trim();

                const subject = encodeURIComponent('New message from portfolio');
                const bodyLines = [
                    `Name: ${name || 'N/A'}`,
                    `Email: ${email || 'N/A'}`,
                    '',
                    message || ''
                ];
                const body = encodeURIComponent(bodyLines.join('\n'));

                window.location.href = `mailto:karthikeyamanam00@gmail.com?subject=${subject}&body=${body}`;
            });
        }
    }
});
