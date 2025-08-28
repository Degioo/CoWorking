/* ===== A/B TESTING SYSTEM - OTTIMIZZAZIONE CONVERSIONI ===== */

class ABTestingSystem {
    constructor() {
        this.tests = new Map();
        this.userVariants = new Map();
        this.testResults = new Map();
        this.init();
    }

    init() {
        this.loadTestConfigurations();
        this.assignUserVariants();
        this.runActiveTests();
        this.setupEventTracking();
        this.startResultsCollection();
    }

    loadTestConfigurations() {
        // Test configurations - can be loaded from server
        const testConfigs = [
            {
                id: 'cta_button_test',
                name: 'Test Pulsante CTA',
                description: 'Testa diversi testi e colori per il pulsante principale',
                status: 'active',
                startDate: '2025-01-01',
                endDate: '2025-12-31',
                trafficSplit: 0.5, // 50% of users
                variants: [
                    {
                        id: 'control',
                        name: 'Controllo',
                        description: 'Versione originale',
                        weight: 0.5,
                        changes: {}
                    },
                    {
                        id: 'variant_a',
                        name: 'Variante A',
                        description: 'Testo più urgente',
                        weight: 0.25,
                        changes: {
                            'button_text': 'PRENOTA SUBITO!',
                            'button_color': '#ef4444',
                            'button_animation': 'pulse'
                        }
                    },
                    {
                        id: 'variant_b',
                        name: 'Variante B',
                        description: 'Testo più descrittivo',
                        weight: 0.25,
                        changes: {
                            'button_text': 'Inizia la Tua Esperienza',
                            'button_color': '#10b981',
                            'button_icon': 'fas fa-rocket'
                        }
                    }
                ],
                goals: [
                    {
                        id: 'button_click',
                        name: 'Click sul Pulsante',
                        type: 'click',
                        selector: '.hero .btn-primary'
                    },
                    {
                        id: 'page_navigation',
                        name: 'Navigazione alla Pagina',
                        type: 'navigation',
                        target: '/selezione-slot.html'
                    }
                ]
            },
            {
                id: 'hero_layout_test',
                name: 'Test Layout Hero',
                description: 'Testa diverse disposizioni della sezione hero',
                status: 'active',
                startDate: '2025-01-01',
                endDate: '2025-12-31',
                trafficSplit: 0.3, // 30% of users
                variants: [
                    {
                        id: 'control',
                        name: 'Controllo',
                        description: 'Layout originale',
                        weight: 0.5,
                        changes: {}
                    },
                    {
                        id: 'variant_a',
                        name: 'Variante A',
                        description: 'Hero centrato',
                        weight: 0.25,
                        changes: {
                            'hero_alignment': 'center',
                            'hero_layout': 'stacked',
                            'hero_image_position': 'bottom'
                        }
                    },
                    {
                        id: 'variant_b',
                        name: 'Variante B',
                        description: 'Hero con video',
                        weight: 0.25,
                        changes: {
                            'hero_media': 'video',
                            'hero_content_width': 'narrow',
                            'hero_cta_position': 'floating'
                        }
                    }
                ],
                goals: [
                    {
                        id: 'scroll_depth',
                        name: 'Profondità di Scroll',
                        type: 'scroll',
                        threshold: 75
                    },
                    {
                        id: 'time_on_page',
                        name: 'Tempo sulla Pagina',
                        type: 'time',
                        threshold: 30000
                    }
                ]
            },
            {
                id: 'pricing_display_test',
                name: 'Test Visualizzazione Prezzi',
                description: 'Testa diverse modalità di mostrare i prezzi',
                status: 'active',
                startDate: '2025-01-01',
                endDate: '2025-12-31',
                trafficSplit: 0.4, // 40% of users
                variants: [
                    {
                        id: 'control',
                        name: 'Controllo',
                        description: 'Prezzi standard',
                        weight: 0.5,
                        changes: {}
                    },
                    {
                        id: 'variant_a',
                        name: 'Variante A',
                        description: 'Prezzi con sconto evidenziato',
                        weight: 0.25,
                        changes: {
                            'price_display': 'discount_highlighted',
                            'price_comparison': 'before_after',
                            'price_urgency': 'limited_time'
                        }
                    },
                    {
                        id: 'variant_b',
                        name: 'Variante B',
                        description: 'Prezzi per pacchetti',
                        weight: 0.25,
                        changes: {
                            'price_display': 'package_based',
                            'price_feature_list': 'visible',
                            'price_popular_badge': 'enabled'
                        }
                    }
                ],
                goals: [
                    {
                        id: 'price_click',
                        name: 'Click sui Prezzi',
                        type: 'click',
                        selector: '.price, [data-price]'
                    },
                    {
                        id: 'pricing_page_visit',
                        name: 'Visita Pagina Prezzi',
                        type: 'navigation',
                        target: '/prezzi.html'
                    }
                ]
            }
        ];

        testConfigs.forEach(config => {
            this.tests.set(config.id, config);
        });
    }

    assignUserVariants() {
        const userId = this.getUserId();
        const sessionId = this.getSessionId();

        this.tests.forEach((test, testId) => {
            if (test.status !== 'active') return;

            // Check if user should participate in this test
            if (this.shouldUserParticipate(test, userId, sessionId)) {
                const variant = this.selectVariant(test);
                this.userVariants.set(testId, variant);

                // Store variant assignment
                this.storeVariantAssignment(testId, variant.id, userId, sessionId);
            }
        });
    }

    shouldUserParticipate(test, userId, sessionId) {
        // Check if test is active and within date range
        const now = new Date();
        const startDate = new Date(test.startDate);
        const endDate = new Date(test.endDate);

        if (now < startDate || now > endDate) return false;

        // Check traffic split
        const userHash = this.hashString(`${userId || 'anonymous'}_${sessionId}_${test.id}`);
        const userPercentage = userHash % 100;

        return userPercentage < (test.trafficSplit * 100);
    }

    selectVariant(test) {
        const random = Math.random();
        let cumulativeWeight = 0;

        for (const variant of test.variants) {
            cumulativeWeight += variant.weight;
            if (random <= cumulativeWeight) {
                return variant;
            }
        }

        // Fallback to control
        return test.variants.find(v => v.id === 'control');
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    getUserId() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            return user ? user.id_utente : null;
        } catch (error) {
            return null;
        }
    }

    getSessionId() {
        return sessionStorage.getItem('session_id') || this.generateSessionId();
    }

    generateSessionId() {
        const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('session_id', sessionId);
        return sessionId;
    }

    storeVariantAssignment(testId, variantId, userId, sessionId) {
        const assignment = {
            test_id: testId,
            variant_id: variantId,
            user_id: userId,
            session_id: sessionId,
            timestamp: new Date().toISOString()
        };

        try {
            const assignments = JSON.parse(localStorage.getItem('ab_test_assignments') || '[]');
            assignments.push(assignment);
            localStorage.setItem('ab_test_assignments', JSON.stringify(assignments));
        } catch (error) {
            console.error('Errore salvataggio assegnazione variante:', error);
        }

        // Send to server
        this.sendVariantAssignment(assignment);
    }

    async sendVariantAssignment(assignment) {
        try {
            await fetch(`${window.CONFIG.API_BASE}/ab-testing/assignment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(assignment)
            });
        } catch (error) {
            console.warn('Errore invio assegnazione variante:', error);
        }
    }

    runActiveTests() {
        this.tests.forEach((test, testId) => {
            if (test.status !== 'active') return;

            const variant = this.userVariants.get(testId);
            if (variant) {
                this.applyVariant(test, variant);
            }
        });
    }

    applyVariant(test, variant) {
        console.log(`🧪 A/B Test "${test.name}": Applicando variante "${variant.name}"`);

        // Apply CSS changes
        this.applyCSSChanges(test.id, variant.changes);

        // Apply content changes
        this.applyContentChanges(test.id, variant.changes);

        // Apply behavior changes
        this.applyBehaviorChanges(test.id, variant.changes);

        // Track variant application
        this.trackVariantApplication(test.id, variant.id);
    }

    applyCSSChanges(testId, changes) {
        if (!changes.button_color && !changes.hero_alignment) return;

        const styleId = `ab-test-${testId}`;
        let style = document.getElementById(styleId);

        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        let css = '';

        if (changes.button_color) {
            css += `
                .hero .btn-primary {
                    background-color: ${changes.button_color} !important;
                    border-color: ${changes.button_color} !important;
                }
                .hero .btn-primary:hover {
                    background-color: ${this.darkenColor(changes.button_color, 10)} !important;
                    border-color: ${this.darkenColor(changes.button_color, 10)} !important;
                }
            `;
        }

        if (changes.hero_alignment === 'center') {
            css += `
                .hero-content {
                    text-align: center !important;
                }
                .hero-buttons {
                    justify-content: center !important;
                }
            `;
        }

        if (changes.hero_layout === 'stacked') {
            css += `
                .hero .row {
                    flex-direction: column !important;
                }
                .hero .col-lg-6 {
                    width: 100% !important;
                    margin-bottom: 2rem !important;
                }
            `;
        }

        style.textContent = css;
    }

    applyContentChanges(testId, changes) {
        if (changes.button_text) {
            const buttons = document.querySelectorAll('.hero .btn-primary');
            buttons.forEach(button => {
                button.textContent = changes.button_text;
            });
        }

        if (changes.button_icon) {
            const buttons = document.querySelectorAll('.hero .btn-primary');
            buttons.forEach(button => {
                const icon = document.createElement('i');
                icon.className = `${changes.button_icon} me-2`;
                button.prepend(icon);
            });
        }

        if (changes.hero_media === 'video') {
            const heroImage = document.querySelector('.hero-image');
            if (heroImage) {
                heroImage.innerHTML = `
                    <video autoplay muted loop class="w-100 h-100" style="object-fit: cover; border-radius: 1rem;">
                        <source src="/videos/hero-video.mp4" type="video/mp4">
                        Il tuo browser non supporta i video.
                    </video>
                `;
            }
        }
    }

    applyBehaviorChanges(testId, changes) {
        if (changes.button_animation === 'pulse') {
            const buttons = document.querySelectorAll('.hero .btn-primary');
            buttons.forEach(button => {
                button.style.animation = 'pulse 2s infinite';
            });

            // Add pulse animation CSS
            if (!document.getElementById('ab-test-pulse-animation')) {
                const style = document.createElement('style');
                style.id = 'ab-test-pulse-animation';
                style.textContent = `
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                        100% { transform: scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        if (changes.price_urgency === 'limited_time') {
            this.addPriceUrgency();
        }

        if (changes.price_popular_badge === 'enabled') {
            this.addPopularBadges();
        }
    }

    addPriceUrgency() {
        const priceElements = document.querySelectorAll('.price, [data-price]');
        priceElements.forEach(element => {
            const urgencyBadge = document.createElement('div');
            urgencyBadge.className = 'badge badge-warning position-absolute';
            urgencyBadge.style.top = '-10px';
            urgencyBadge.style.right = '-10px';
            urgencyBadge.textContent = 'Offerta Limitata!';

            const container = element.closest('.card, .pricing-item') || element.parentElement;
            if (container.style.position !== 'relative') {
                container.style.position = 'relative';
            }
            container.appendChild(urgencyBadge);
        });
    }

    addPopularBadges() {
        const pricingItems = document.querySelectorAll('.pricing-item, .card');
        if (pricingItems.length >= 3) {
            // Mark middle item as popular
            const middleIndex = Math.floor(pricingItems.length / 2);
            const popularItem = pricingItems[middleIndex];

            const popularBadge = document.createElement('div');
            popularBadge.className = 'badge badge-primary position-absolute';
            popularBadge.style.top = '-15px';
            popularBadge.style.left = '50%';
            popularBadge.style.transform = 'translateX(-50%)';
            popularBadge.textContent = 'PIÙ POPOLARE';

            if (popularItem.style.position !== 'relative') {
                popularItem.style.position = 'relative';
            }
            popularItem.appendChild(popularBadge);
        }
    }

    setupEventTracking() {
        this.tests.forEach((test, testId) => {
            if (test.status !== 'active') return;

            test.goals.forEach(goal => {
                this.setupGoalTracking(testId, goal);
            });
        });
    }

    setupGoalTracking(testId, goal) {
        switch (goal.type) {
            case 'click':
                this.setupClickTracking(testId, goal);
                break;
            case 'navigation':
                this.setupNavigationTracking(testId, goal);
                break;
            case 'scroll':
                this.setupScrollTracking(testId, goal);
                break;
            case 'time':
                this.setupTimeTracking(testId, goal);
                break;
        }
    }

    setupClickTracking(testId, goal) {
        document.addEventListener('click', (e) => {
            if (e.target.matches(goal.selector) || e.target.closest(goal.selector)) {
                this.trackGoal(testId, goal.id, {
                    element: goal.selector,
                    click_position: {
                        x: e.clientX,
                        y: e.clientY
                    }
                });
            }
        });
    }

    setupNavigationTracking(testId, goal) {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function (...args) {
            originalPushState.apply(history, args);
            this.checkNavigation(testId, goal, args[2]);
        }.bind(this);

        history.replaceState = function (...args) {
            originalReplaceState.apply(history, args);
            this.checkNavigation(testId, goal, args[2]);
        }.bind(this);

        // Check initial navigation
        this.checkNavigation(testId, goal, window.location.pathname);
    }

    checkNavigation(testId, goal, path) {
        if (path === goal.target) {
            this.trackGoal(testId, goal.id, {
                target_path: goal.target,
                current_path: path
            });
        }
    }

    setupScrollTracking(testId, goal) {
        let maxScroll = 0;
        let scrollTimeout;

        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
                if (scrollPercent > maxScroll) {
                    maxScroll = scrollPercent;
                    if (maxScroll >= goal.threshold) {
                        this.trackGoal(testId, goal.id, {
                            scroll_depth: maxScroll,
                            threshold: goal.threshold
                        });
                    }
                }
            }, 150);
        });
    }

    setupTimeTracking(testId, goal) {
        let startTime = Date.now();
        let goalTracked = false;

        const checkTime = () => {
            const timeOnPage = Date.now() - startTime;
            if (timeOnPage >= goal.threshold && !goalTracked) {
                this.trackGoal(testId, goal.id, {
                    time_on_page: timeOnPage,
                    threshold: goal.threshold
                });
                goalTracked = true;
            }
        };

        // Check every 5 seconds
        const interval = setInterval(checkTime, 5000);

        // Check on page unload
        window.addEventListener('beforeunload', () => {
            clearInterval(interval);
            checkTime();
        });
    }

    trackGoal(testId, goalId, data = {}) {
        const variant = this.userVariants.get(testId);
        if (!variant) return;

        const goalEvent = {
            test_id: testId,
            variant_id: variant.id,
            goal_id: goalId,
            user_id: this.getUserId(),
            session_id: this.getSessionId(),
            timestamp: new Date().toISOString(),
            data: data
        };

        // Store locally
        this.storeGoalEvent(goalEvent);

        // Send to server
        this.sendGoalEvent(goalEvent);

        // Track with analytics if available
        if (window.analytics) {
            window.analytics.trackEvent('ab_test_goal', goalEvent);
        }

        console.log(`🎯 A/B Test Goal raggiunto: ${testId} - ${goalId}`, goalEvent);
    }

    storeGoalEvent(goalEvent) {
        try {
            const events = JSON.parse(localStorage.getItem('ab_test_goals') || '[]');
            events.push(goalEvent);
            localStorage.setItem('ab_test_goals', JSON.stringify(events));
        } catch (error) {
            console.error('Errore salvataggio goal event:', error);
        }
    }

    async sendGoalEvent(goalEvent) {
        try {
            await fetch(`${window.CONFIG.API_BASE}/ab-testing/goal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(goalEvent)
            });
        } catch (error) {
            console.warn('Errore invio goal event:', error);
        }
    }

    startResultsCollection() {
        // Collect results every 5 minutes
        setInterval(() => {
            this.collectTestResults();
        }, 300000);

        // Initial collection
        this.collectTestResults();
    }

    async collectTestResults() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/ab-testing/results`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const results = await response.json();
                this.updateTestResults(results);
            }
        } catch (error) {
            console.warn('Errore raccolta risultati test:', error);
        }
    }

    updateTestResults(results) {
<<<<<<< HEAD
        results.forEach(result => {
            this.testResults.set(result.test_id, result);
        });

        // Update UI if results dashboard is visible
        this.updateResultsUI();
=======
        // L'API restituisce un oggetto, non un array
        // results ha questa struttura:
        // { test_name, variants, total_impressions, total_conversions, overall_rate }

        if (results && results.variants) {
            // Salva i risultati del test corrente
            this.testResults.set(results.test_name, results);

            // Update UI if results dashboard is visible
            this.updateResultsUI();
        }
>>>>>>> upstream/main
    }

    updateResultsUI() {
        // Implementation for updating results UI
        // This would be called when the results dashboard is visible
    }

    // Utility methods
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    trackVariantApplication(testId, variantId) {
        if (window.analytics) {
            window.analytics.trackEvent('ab_test_variant_applied', {
                test_id: testId,
                variant_id: variantId,
                user_id: this.getUserId(),
                session_id: this.getSessionId()
            });
        }
    }

    // Public API methods
    getCurrentVariants() {
        const variants = {};
        this.userVariants.forEach((variant, testId) => {
            variants[testId] = variant;
        });
        return variants;
    }

    getTestResults(testId = null) {
        if (testId) {
            return this.testResults.get(testId);
        }
        return Array.from(this.testResults.values());
    }

    isUserInTest(testId) {
        return this.userVariants.has(testId);
    }

    getUserVariant(testId) {
        return this.userVariants.get(testId);
    }

    // Manual test control (for development)
    forceVariant(testId, variantId) {
        const test = this.tests.get(testId);
        if (!test) return false;

        const variant = test.variants.find(v => v.id === variantId);
        if (!variant) return false;

        this.userVariants.set(testId, variant);
        this.applyVariant(test, variant);

        console.log(`🧪 Forzata variante ${variantId} per test ${testId}`);
        return true;
    }

    resetTest(testId) {
        this.userVariants.delete(testId);

        // Remove applied changes
        const styleId = `ab-test-${testId}`;
        const style = document.getElementById(styleId);
        if (style) {
            style.remove();
        }

        console.log(`🧪 Reset test ${testId}`);
    }
}

// Initialize A/B testing system
document.addEventListener('DOMContentLoaded', () => {
    window.abTesting = new ABTestingSystem();
});

// Global A/B testing functions
window.getABTestVariant = (testId) => {
    if (window.abTesting) {
        return window.abTesting.getUserVariant(testId);
    }
    return null;
};

window.isInABTest = (testId) => {
    if (window.abTesting) {
        return window.abTesting.isUserInTest(testId);
    }
    return false;
};

window.forceABTestVariant = (testId, variantId) => {
    if (window.abTesting) {
        return window.abTesting.forceVariant(testId, variantId);
    }
    return false;
};

// Development helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.abTestingDebug = {
        getCurrentVariants: () => window.abTesting?.getCurrentVariants(),
        getTestResults: () => window.abTesting?.getTestResults(),
        forceVariant: (testId, variantId) => window.abTesting?.forceVariant(testId, variantId),
        resetTest: (testId) => window.abTesting?.resetTest(testId)
    };

    console.log('🧪 A/B Testing Debug Mode attivo. Usa window.abTestingDebug per controllare i test.');
}
