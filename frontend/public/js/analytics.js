/* ===== ANALYTICS SYSTEM - TRACKING COMPLETO EVENTI E CONVERSIONI ===== */

class AnalyticsSystem {
    constructor() {
        this.events = [];
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.init();
    }

    init() {
        this.setupEventTracking();
        this.setupConversionTracking();
        this.setupPerformanceTracking();
        this.setupUserBehaviorTracking();
        this.loadStoredEvents();
        this.startPeriodicSync();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getUserId() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            return user ? user.id_utente : null;
        } catch (error) {
            return null;
        }
    }

    setupEventTracking() {
        // Track page views
        this.trackPageView();
        
        // Track button clicks
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                const button = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
                this.trackEvent('button_click', {
                    button_text: button.textContent.trim(),
                    button_class: button.className,
                    button_id: button.id,
                    page: window.location.pathname
                });
            }
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            this.trackEvent('form_submit', {
                form_id: e.target.id,
                form_action: e.target.action,
                page: window.location.pathname
            });
        });

        // Track navigation
        window.addEventListener('popstate', () => {
            this.trackPageView();
        });

        // Track scroll depth
        this.trackScrollDepth();

        // Track time on page
        this.trackTimeOnPage();
    }

    setupConversionTracking() {
        // Track booking completion
        this.trackConversionEvent('prenotazione_completata', {
            trigger: 'payment_success',
            value: this.extractBookingValue()
        });

        // Track user registration
        this.trackConversionEvent('utente_registrato', {
            trigger: 'registration_success',
            value: 0
        });

        // Track login
        this.trackConversionEvent('utente_login', {
            trigger: 'login_success',
            value: 0
        });

        // Track space selection
        this.trackConversionEvent('spazio_selezionato', {
            trigger: 'space_selection',
            value: this.extractSpaceValue()
        });
    }

    setupPerformanceTracking() {
        // Track page load performance
        window.addEventListener('load', () => {
            const performance = window.performance;
            if (performance && performance.timing) {
                const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                this.trackEvent('page_performance', {
                    load_time: loadTime,
                    page: window.location.pathname,
                    user_agent: navigator.userAgent
                });
            }
        });

        // Track API response times
        this.interceptAPICalls();
    }

    setupUserBehaviorTracking() {
        // Track mouse movements (heatmap data)
        this.trackMouseMovements();
        
        // Track keyboard interactions
        this.trackKeyboardInteractions();
        
        // Track focus events
        this.trackFocusEvents();
    }

    trackPageView() {
        this.trackEvent('page_view', {
            page: window.location.pathname,
            referrer: document.referrer,
            title: document.title,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });
    }

    trackScrollDepth() {
        let maxScroll = 0;
        let scrollTimeout;

        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
                if (scrollPercent > maxScroll) {
                    maxScroll = scrollPercent;
                    if (maxScroll % 25 === 0) { // Track at 25%, 50%, 75%, 100%
                        this.trackEvent('scroll_depth', {
                            depth: maxScroll,
                            page: window.location.pathname
                        });
                    }
                }
            }, 150);
        });
    }

    trackTimeOnPage() {
        let startTime = Date.now();
        
        window.addEventListener('beforeunload', () => {
            const timeOnPage = Date.now() - startTime;
            this.trackEvent('time_on_page', {
                duration: timeOnPage,
                page: window.location.pathname
            });
        });

        // Track every 30 seconds
        setInterval(() => {
            const timeOnPage = Date.now() - startTime;
            this.trackEvent('time_on_page_interval', {
                duration: timeOnPage,
                page: window.location.pathname
            });
        }, 30000);
    }

    trackMouseMovements() {
        let mouseData = [];
        let mouseTimeout;

        document.addEventListener('mousemove', (e) => {
            mouseData.push({
                x: e.clientX,
                y: e.clientY,
                timestamp: Date.now()
            });

            clearTimeout(mouseTimeout);
            mouseTimeout = setTimeout(() => {
                if (mouseData.length > 10) {
                    this.trackEvent('mouse_movement', {
                        movements: mouseData.length,
                        page: window.location.pathname,
                        data: mouseData.slice(-10) // Keep last 10 movements
                    });
                    mouseData = [];
                }
            }, 5000);
        });
    }

    trackKeyboardInteractions() {
        document.addEventListener('keydown', (e) => {
            this.trackEvent('keyboard_interaction', {
                key: e.key,
                key_code: e.keyCode,
                ctrl_key: e.ctrlKey,
                shift_key: e.shiftKey,
                alt_key: e.altKey,
                page: window.location.pathname
            });
        });
    }

    trackFocusEvents() {
        document.addEventListener('focusin', (e) => {
            this.trackEvent('element_focus', {
                element_type: e.target.tagName,
                element_id: e.target.id,
                element_class: e.target.className,
                page: window.location.pathname
            });
        });

        document.addEventListener('focusout', (e) => {
            this.trackEvent('element_blur', {
                element_type: e.target.tagName,
                element_id: e.target.id,
                element_class: e.target.className,
                page: window.location.pathname
            });
        });
    }

    interceptAPICalls() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = Date.now();
            try {
                const response = await originalFetch(...args);
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                this.trackEvent('api_call', {
                    url: args[0],
                    method: args[1]?.method || 'GET',
                    duration: duration,
                    status: response.status,
                    success: response.ok
                });
                
                return response;
            } catch (error) {
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                this.trackEvent('api_error', {
                    url: args[0],
                    method: args[1]?.method || 'GET',
                    duration: duration,
                    error: error.message
                });
                
                throw error;
            }
        };
    }

    trackEvent(eventName, data = {}) {
        const event = {
            event_name: eventName,
            event_data: data,
            user_id: this.userId,
            session_id: this.sessionId,
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
            user_agent: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        this.events.push(event);
        this.storeEvent(event);
        this.sendEventToServer(event);
        
        // Console log for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('📊 Analytics Event:', event);
        }
    }

    trackConversionEvent(eventName, data = {}) {
        // Enhanced conversion tracking
        const conversionData = {
            ...data,
            conversion_type: eventName,
            conversion_value: data.value || 0,
            conversion_currency: 'EUR',
            conversion_source: this.getConversionSource(),
            conversion_medium: this.getConversionMedium(),
            conversion_campaign: this.getConversionCampaign()
        };

        this.trackEvent(eventName, conversionData);
        
        // Send to external analytics if configured
        this.sendToExternalAnalytics(eventName, conversionData);
    }

    getConversionSource() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('utm_source') || 'direct';
    }

    getConversionMedium() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('utm_medium') || 'none';
    }

    getConversionCampaign() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('utm_campaign') || 'none';
    }

    extractBookingValue() {
        // Try to extract booking value from page
        const priceElement = document.querySelector('[data-price], .price, #confermaPrezzo');
        if (priceElement) {
            const priceText = priceElement.textContent;
            const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));
            return isNaN(price) ? 0 : price;
        }
        return 0;
    }

    extractSpaceValue() {
        // Try to extract space value from page
        const spaceElement = document.querySelector('[data-space-value], .space-value');
        if (spaceElement) {
            const value = parseFloat(spaceElement.dataset.spaceValue || spaceElement.textContent);
            return isNaN(value) ? 0 : value;
        }
        return 0;
    }

    storeEvent(event) {
        try {
            const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
            storedEvents.push(event);
            
            // Keep only last 100 events to prevent localStorage overflow
            if (storedEvents.length > 100) {
                storedEvents.splice(0, storedEvents.length - 100);
            }
            
            localStorage.setItem('analytics_events', JSON.stringify(storedEvents));
        } catch (error) {
            console.error('Errore salvataggio evento analytics:', error);
        }
    }

    loadStoredEvents() {
        try {
            const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
            this.events = [...this.events, ...storedEvents];
        } catch (error) {
            console.error('Errore caricamento eventi analytics:', error);
        }
    }

    async sendEventToServer(event) {
        try {
            const response = await fetch(`${API_BASE}/analytics/event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(event)
            });

            if (!response.ok) {
                console.warn('Evento analytics non inviato al server');
            }
        } catch (error) {
            console.warn('Errore invio evento analytics:', error);
        }
    }

    sendToExternalAnalytics(eventName, data) {
        // Google Analytics 4
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'conversion',
                event_label: data.conversion_source,
                value: data.conversion_value,
                currency: data.conversion_currency
            });
        }

        // Facebook Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', eventName, {
                value: data.conversion_value,
                currency: data.conversion_currency
            });
        }

        // LinkedIn Insight Tag
        if (typeof lintrk !== 'undefined') {
            lintrk('track', {
                conversion_id: eventName,
                value: data.conversion_value
            });
        }
    }

    startPeriodicSync() {
        // Sync events every 5 minutes
        setInterval(() => {
            this.syncEvents();
        }, 300000);
    }

    async syncEvents() {
        try {
            const unsyncedEvents = this.events.filter(event => !event.synced);
            if (unsyncedEvents.length === 0) return;

            const response = await fetch(`${API_BASE}/analytics/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    events: unsyncedEvents,
                    session_id: this.sessionId,
                    user_id: this.userId
                })
            });

            if (response.ok) {
                // Mark events as synced
                unsyncedEvents.forEach(event => event.synced = true);
                this.updateStoredEvents();
            }
        } catch (error) {
            console.error('Errore sincronizzazione analytics:', error);
        }
    }

    updateStoredEvents() {
        try {
            localStorage.setItem('analytics_events', JSON.stringify(this.events));
        } catch (error) {
            console.error('Errore aggiornamento eventi analytics:', error);
        }
    }

    // Analytics Dashboard Methods
    getConversionRate(period = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);
        
        const events = this.events.filter(event => 
            new Date(event.timestamp) >= startDate
        );
        
        const pageViews = events.filter(e => e.event_name === 'page_view').length;
        const conversions = events.filter(e => e.event_name.includes('conversion')).length;
        
        return pageViews > 0 ? (conversions / pageViews) * 100 : 0;
    }

    getTopPages(period = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);
        
        const pageViews = this.events.filter(event => 
            event.event_name === 'page_view' && 
            new Date(event.timestamp) >= startDate
        );
        
        const pageCounts = {};
        pageViews.forEach(event => {
            pageCounts[event.page] = (pageCounts[event.page] || 0) + 1;
        });
        
        return Object.entries(pageCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
    }

    getUserJourney(userId = null) {
        const targetUserId = userId || this.userId;
        const userEvents = this.events.filter(event => 
            event.user_id === targetUserId
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return userEvents.map(event => ({
            event: event.event_name,
            page: event.page,
            timestamp: event.timestamp,
            data: event.event_data
        }));
    }

    getSessionAnalytics() {
        const sessions = {};
        
        this.events.forEach(event => {
            if (!sessions[event.session_id]) {
                sessions[event.session_id] = {
                    start_time: event.timestamp,
                    end_time: event.timestamp,
                    events: [],
                    pages: new Set(),
                    user_id: event.user_id
                };
            }
            
            sessions[event.session_id].events.push(event);
            sessions[event.session_id].pages.add(event.page);
            sessions[event.session_id].end_time = event.timestamp;
        });
        
        return Object.values(sessions).map(session => ({
            ...session,
            pages: Array.from(session.pages),
            duration: new Date(session.end_time) - new Date(session.start_time),
            event_count: session.events.length
        }));
    }

    // Export and Reporting
    exportAnalyticsData(format = 'json') {
        const data = {
            summary: {
                total_events: this.events.length,
                conversion_rate: this.getConversionRate(),
                top_pages: this.getTopPages(),
                session_count: this.getSessionAnalytics().length
            },
            events: this.events,
            sessions: this.getSessionAnalytics()
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data);
            case 'pdf':
                return this.generatePDF(data);
            default:
                return data;
        }
    }

    convertToCSV(data) {
        // Implementation for CSV conversion
        const headers = ['Event', 'Page', 'Timestamp', 'User ID', 'Session ID'];
        const rows = data.events.map(event => [
            event.event_name,
            event.page,
            event.timestamp,
            event.user_id,
            event.session_id
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    generatePDF(data) {
        // Implementation for PDF generation
        console.log('PDF generation not implemented yet');
        return null;
    }

    // Privacy and GDPR Compliance
    clearUserData(userId) {
        this.events = this.events.filter(event => event.user_id !== userId);
        this.updateStoredEvents();
        
        // Clear from server
        fetch(`${API_BASE}/analytics/clear-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ user_id: userId })
        }).catch(error => {
            console.error('Errore cancellazione dati utente:', error);
        });
    }

    getPrivacySettings() {
        return {
            tracking_enabled: true,
            data_retention_days: 90,
            anonymize_data: false,
            allow_cookies: true
        };
    }

    updatePrivacySettings(settings) {
        // Implementation for privacy settings update
        console.log('Privacy settings updated:', settings);
    }
}

// Initialize analytics system
document.addEventListener('DOMContentLoaded', () => {
    window.analytics = new AnalyticsSystem();
});

// Global analytics functions
window.trackEvent = (eventName, data) => {
    if (window.analytics) {
        window.analytics.trackEvent(eventName, data);
    }
};

window.trackConversion = (eventName, data) => {
    if (window.analytics) {
        window.analytics.trackConversionEvent(eventName, data);
    }
};

window.getAnalyticsData = () => {
    if (window.analytics) {
        return window.analytics.exportAnalyticsData();
    }
    return null;
};
