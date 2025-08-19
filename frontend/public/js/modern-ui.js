/* ===== MODERN UI ENHANCEMENTS ===== */

class ModernUI {
    constructor() {
        this.init();
    }

    init() {
        this.setupAnimations();
        this.setupMicroInteractions();
        this.setupSmoothScrolling();
        this.setupLazyLoading();
        this.setupParallaxEffects();
        this.setupToastNotifications();
        this.setupProgressBars();
        this.setupTooltips();
        this.setupLoadingStates();
    }

    // ===== ANIMATIONS =====
    setupAnimations() {
        // Intersection Observer per animazioni al scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in-up');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Osserva elementi per animazioni
        document.querySelectorAll('.card, .feature-card, .stat-card').forEach(el => {
            observer.observe(el);
        });

        // Animazioni per elementi che entrano nella viewport
        this.animateOnScroll();
    }

    animateOnScroll() {
        const elements = document.querySelectorAll('[data-animate]');

        elements.forEach(element => {
            const animation = element.getAttribute('data-animate');
            const delay = element.getAttribute('data-delay') || 0;

            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';

            setTimeout(() => {
                element.style.transition = 'all 0.6s ease-out';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, delay);
        });
    }

    // ===== MICRO INTERACTIONS =====
    setupMicroInteractions() {
        // Hover effects per cards
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('mouseenter', this.handleCardHover);
            card.addEventListener('mouseleave', this.handleCardLeave);
        });

        // Button ripple effects
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', this.createRippleEffect);
        });

        // Form focus effects
        document.querySelectorAll('.form-control').forEach(input => {
            input.addEventListener('focus', this.handleInputFocus);
            input.addEventListener('blur', this.handleInputBlur);
        });

        // Navigation hover effects
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('mouseenter', this.handleNavHover);
        });
    }

    handleCardHover(e) {
        const card = e.currentTarget;
        card.style.transform = 'translateY(-8px) scale(1.02)';
        card.style.boxShadow = 'var(--shadow-xl)';
    }

    handleCardLeave(e) {
        const card = e.currentTarget;
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = 'var(--shadow-md)';
    }

    createRippleEffect(e) {
        const button = e.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');

        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    handleInputFocus(e) {
        const input = e.currentTarget;
        input.parentElement.classList.add('focused');
    }

    handleInputBlur(e) {
        const input = e.currentTarget;
        if (!input.value) {
            input.parentElement.classList.remove('focused');
        }
    }

    handleNavHover(e) {
        const link = e.currentTarget;
        link.style.transform = 'translateY(-2px)';
    }

    // ===== SMOOTH SCROLLING =====
    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const href = anchor.getAttribute('href');
                // Verifica che l'href non sia solo "#" e abbia un ID valido
                if (href && href !== '#' && href.length > 1) {
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }

    // ===== LAZY LOADING =====
    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    // ===== PARALLAX EFFECTS =====
    setupParallaxEffects() {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('[data-parallax]');

            parallaxElements.forEach(element => {
                const speed = element.dataset.parallax || 0.5;
                const yPos = -(scrolled * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
        });
    }

    // ===== TOAST NOTIFICATIONS =====
    setupToastNotifications() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;

        this.toastContainer.appendChild(toast);

        // Anima l'entrata
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto-remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }

    // ===== PROGRESS BARS =====
    setupProgressBars() {
        document.querySelectorAll('.progress-bar').forEach(bar => {
            const progress = bar.dataset.progress || 0;
            this.animateProgressBar(bar, progress);
        });
    }

    animateProgressBar(bar, targetProgress) {
        let currentProgress = 0;
        const increment = targetProgress / 50;

        const animate = () => {
            if (currentProgress < targetProgress) {
                currentProgress += increment;
                bar.style.width = currentProgress + '%';
                requestAnimationFrame(animate);
            } else {
                bar.style.width = targetProgress + '%';
            }
        };

        animate();
    }

    // ===== TOOLTIPS =====
    setupTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip);
            element.addEventListener('mouseleave', this.hideTooltip);
        });
    }

    showTooltip(e) {
        const element = e.currentTarget;
        const tooltipText = element.dataset.tooltip;

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = tooltipText;

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';

        element.tooltip = tooltip;
    }

    hideTooltip(e) {
        const element = e.currentTarget;
        if (element.tooltip) {
            element.tooltip.remove();
            element.tooltip = null;
        }
    }

    // ===== LOADING STATES =====
    setupLoadingStates() {
        // Global loading overlay
        this.createLoadingOverlay();

        // Button loading states
        document.querySelectorAll('.btn[data-loading]').forEach(btn => {
            btn.addEventListener('click', this.handleButtonLoading);
        });
    }

    createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'loading-overlay';
        this.loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p class="loading-text">Caricamento...</p>
            </div>
        `;
        this.loadingOverlay.style.display = 'none';
        document.body.appendChild(this.loadingOverlay);
    }

    showLoading(message = 'Caricamento...') {
        this.loadingOverlay.querySelector('.loading-text').textContent = message;
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    handleButtonLoading(e) {
        const btn = e.currentTarget;
        const originalText = btn.textContent;

        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Caricamento...';

        // Simula operazione asincrona
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = originalText;
        }, 2000);
    }

    // ===== UTILITY METHODS =====
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // ===== THEME SWITCHER =====
    setupThemeSwitcher() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.toggleTheme);
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Anima il cambio tema
        document.body.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }

    // ===== RESPONSIVE HELPERS =====
    setupResponsiveHelpers() {
        // Resize handler
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
    }

    handleResize() {
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            document.body.classList.add('mobile');
        } else {
            document.body.classList.remove('mobile');
        }
    }

    // ===== ACCESSIBILITY =====
    setupAccessibility() {
        // Focus management
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });

        // ARIA labels
        this.setupARIALabels();
    }

    setupARIALabels() {
        // Aggiungi aria-label ai form
        document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]').forEach(input => {
            if (!input.getAttribute('aria-label') && !input.getAttribute('id')) {
                const label = input.previousElementSibling;
                if (label && label.tagName === 'LABEL') {
                    input.setAttribute('aria-label', label.textContent);
                }
            }
        });
    }
}

// ===== CSS FOR DYNAMIC ELEMENTS =====
const dynamicStyles = `
    <style>
        /* Ripple Effect */
        .btn {
            position: relative;
            overflow: hidden;
        }
        
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        /* Toast Notifications */
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        }
        
        .toast {
            background: var(--white);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            margin-bottom: 10px;
            padding: var(--space-md);
            min-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: auto;
            border-left: 4px solid var(--info);
        }
        
        .toast.show {
            transform: translateX(0);
        }
        
        .toast-success { border-left-color: var(--success); }
        .toast-warning { border-left-color: var(--warning); }
        .toast-error { border-left-color: var(--error); }
        
        .toast-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .toast-close {
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            color: var(--gray-500);
            padding: 0;
            margin-left: var(--space-md);
        }
        
        /* Tooltips */
        .tooltip {
            position: absolute;
            background: var(--gray-800);
            color: var(--white);
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-sm);
            font-size: 0.875rem;
            z-index: 1000;
            pointer-events: none;
            white-space: nowrap;
        }
        
        .tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: var(--gray-800);
        }
        
        /* Loading States */
        .btn[disabled] {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        .loading-content {
            text-align: center;
            color: var(--gray-600);
        }
        
        .loading-text {
            margin-top: var(--space-md);
            font-weight: 500;
        }
        
        /* Keyboard Navigation */
        .keyboard-navigation *:focus {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
        }
        

    </style>
`;

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inserisci gli stili dinamici
    document.head.insertAdjacentHTML('beforeend', dynamicStyles);

    // Inizializza ModernUI
    window.modernUI = new ModernUI();

    // Setup aggiuntivi
    window.modernUI.setupThemeSwitcher();
    window.modernUI.setupResponsiveHelpers();
    window.modernUI.setupAccessibility();
});

// Esporta per uso globale
window.ModernUI = ModernUI;
