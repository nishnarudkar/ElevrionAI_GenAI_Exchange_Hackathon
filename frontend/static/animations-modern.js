// Modern UI Animations and Interactions

// Particle Background Effect
const createParticleBackground = () => {
    const header = document.querySelector('.modern-header');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        header.appendChild(particle);
        
        // Random positioning and animation
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 5}s`;
        particle.style.animationDuration = `${5 + Math.random() * 10}s`;
    }
};

// Smooth Scroll Animation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for Scroll Animations
const observeElements = () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.glass-card, .skill-tag, .button-modern').forEach(el => {
        observer.observe(el);
    });
};

// Upload Area Interactions
const setupUploadArea = () => {
    const uploadArea = document.querySelector('.upload-area');
    if (!uploadArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('drag-over');
        });
    });
};

// Skills Input Enhancement
const enhanceSkillsInput = () => {
    const skillInput = document.querySelector('.input-modern[type="text"]');
    if (!skillInput) return;

    skillInput.addEventListener('focus', () => {
        skillInput.parentElement.classList.add('focused');
    });

    skillInput.addEventListener('blur', () => {
        skillInput.parentElement.classList.remove('focused');
    });
};

// Button Ripple Effect
const addButtonRippleEffect = () => {
    document.querySelectorAll('.button-modern').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('div');
            ripple.className = 'ripple';
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 1000);
        });
    });
};

// Initialize all animations and interactions
document.addEventListener('DOMContentLoaded', () => {
    createParticleBackground();
    observeElements();
    setupUploadArea();
    enhanceSkillsInput();
    addButtonRippleEffect();
});

// Add smooth transitions when showing/hiding elements
const fadeIn = (element, duration = 300) => {
    element.style.opacity = 0;
    element.style.display = 'block';
    
    let start = null;
    const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        
        element.style.opacity = Math.min(progress / duration, 1);
        
        if (progress < duration) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
};

const fadeOut = (element, duration = 300) => {
    let start = null;
    const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        
        element.style.opacity = Math.max(1 - progress / duration, 0);
        
        if (progress < duration) {
            requestAnimationFrame(animate);
        } else {
            element.style.display = 'none';
        }
    };
    
    requestAnimationFrame(animate);
};