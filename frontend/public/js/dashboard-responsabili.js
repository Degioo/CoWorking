/* ===== DASHBOARD RESPONSABILI - FUNZIONALITÀ COMPLETE ===== */

class DashboardResponsabili {
    constructor() {
        this.currentSection = 'overview';
        this.currentSede = null;
        this.charts = {};
        this.currentMonth = new Date();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserInfo();
        this.loadSedi();
        this.loadOverviewData();
        this.setupCharts();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Sede selector
        document.getElementById('sedeSelector').addEventListener('change', (e) => {
            this.currentSede = e.target.value;
            this.loadOverviewData();
            this.loadPrenotazioni();
            this.loadUtenti();
        });

        // Filter buttons
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadPrenotazioni();
            });
        });

        // Dark mode toggle
        document.getElementById('darkMode').addEventListener('change', (e) => {
            this.toggleDarkMode(e.target.checked);
        });
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        document.getElementById(sectionName).classList.add('active');

        // Update sidebar active state
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        this.currentSection = sectionName;

        // Load section-specific data
        switch (sectionName) {
            case 'overview':
                this.loadOverviewData();
                break;
            case 'disponibilita':
                this.loadDisponibilita();
                break;
            case 'prenotazioni':
                this.loadPrenotazioni();
                break;
            case 'utenti':
                this.loadUtenti();
                break;
            case 'reportistica':
                this.loadReportistica();
                break;
        }
    }

    async loadUserInfo() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                document.getElementById('userName').textContent = `${user.nome} ${user.cognome}`;
            }
        } catch (error) {
            console.error('Errore caricamento info utente:', error);
        }
    }

    async loadSedi() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/sedi`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const sedi = await response.json();
                const selector = document.getElementById('sedeSelector');

                selector.innerHTML = '<option value="">Seleziona Sede</option>';
                sedi.forEach(sede => {
                    const option = document.createElement('option');
                    option.value = sede.id_sede;
                    option.textContent = `${sede.nome} - ${sede.citta}`;
                    selector.appendChild(option);
                });

                // Populate other selectors
                this.populateSpaziSelectors(sedi);
            }
        } catch (error) {
            console.error('Errore caricamento sedi:', error);
        }
    }

    populateSpaziSelectors(sedi) {
        const spaziSelectors = ['modalSpazio', 'filterSpazio'];

        spaziSelectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                selector.innerHTML = '<option value="">Tutti gli spazi</option>';
                sedi.forEach(sede => {
                    if (sede.spazi) {
                        sede.spazi.forEach(spazio => {
                            const option = document.createElement('option');
                            option.value = spazio.id_spazio;
                            option.textContent = `${spazio.nome} - ${sede.nome}`;
                            selector.appendChild(option);
                        });
                    }
                });
            }
        });
    }

    async loadOverviewData() {
        try {
            // Load quick stats
            await this.loadQuickStats();

            // Load charts data
            await this.loadChartsData();

            // Load recent activity
            await this.loadRecentActivity();
        } catch (error) {
            console.error('Errore caricamento overview:', error);
        }
    }

    async loadQuickStats() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/dashboard/stats?tipo=responsabile&sede=${this.currentSede || ''}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const stats = await response.json();

                document.getElementById('prenotazioniOggi').textContent = stats.prenotazioni_oggi || 0;
                document.getElementById('utentiAttivi').textContent = stats.utenti_attivi || 0;
                document.getElementById('fatturatoGiorno').textContent = `€${stats.fatturato_giorno || 0}`;
                document.getElementById('occupazioneMedia').textContent = `${stats.occupazione_media || 0}%`;
            }
        } catch (error) {
            console.error('Errore caricamento stats:', error);
        }
    }

    async loadChartsData() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/dashboard/charts?tipo=responsabile&sede=${this.currentSede || ''}&periodo=7`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.updateCharts(data);
            }
        } catch (error) {
            console.error('Errore caricamento charts:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/dashboard/activity?tipo=responsabile&sede=${this.currentSede || ''}&limit=10`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const activities = await response.json();
                this.displayRecentActivity(activities);
            }
        } catch (error) {
            console.error('Errore caricamento attività:', error);
        }
    }

    displayRecentActivity(activities) {
        const container = document.getElementById('activityList');
        container.innerHTML = '';

        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';

            const iconClass = this.getActivityIconClass(activity.tipo);
            const iconColor = this.getActivityIconColor(activity.tipo);

            activityItem.innerHTML = `
                <div class="activity-icon ${iconClass}" style="background: ${iconColor}">
                    <i class="fas ${this.getActivityIcon(activity.tipo)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.descrizione}</div>
                    <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
                </div>
            `;

            container.appendChild(activityItem);
        });
    }

    getActivityIconClass(tipo) {
        const iconMap = {
            'prenotazione': 'booking',
            'cancellazione': 'cancellation',
            'utente': 'user',
            'pagamento': 'payment'
        };
        return iconMap[tipo] || 'info';
    }

    getActivityIconColor(tipo) {
        const colorMap = {
            'prenotazione': 'rgba(16, 185, 129, 0.1)',
            'cancellazione': 'rgba(239, 68, 68, 0.1)',
            'utente': 'rgba(59, 130, 246, 0.1)',
            'pagamento': 'rgba(16, 185, 129, 0.1)'
        };
        return colorMap[tipo] || 'rgba(107, 114, 128, 0.1)';
    }

    getActivityIcon(tipo) {
        const iconMap = {
            'prenotazione': 'fa-calendar-check',
            'cancellazione': 'fa-calendar-times',
            'utente': 'fa-user-plus',
            'pagamento': 'fa-credit-card'
        };
        return iconMap[tipo] || 'fa-info-circle';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Adesso';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min fa`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ore fa`;
        return date.toLocaleDateString('it-IT');
    }

    setupCharts() {
        // Prenotazioni Chart
        const prenotazioniCtx = document.getElementById('prenotazioniChart');
        if (prenotazioniCtx) {
            this.charts.prenotazioni = new Chart(prenotazioniCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Prenotazioni',
                        data: [],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Occupazione Chart
        const occupazioneCtx = document.getElementById('occupazioneChart');
        if (occupazioneCtx) {
            this.charts.occupazione = new Chart(occupazioneCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#2563eb',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                            '#8b5cf6'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    }

    updateCharts(data) {
        // Update prenotazioni chart
        if (this.charts.prenotazioni && data.prenotazioni) {
            this.charts.prenotazioni.data.labels = data.prenotazioni.labels;
            this.charts.prenotazioni.data.datasets[0].data = data.prenotazioni.data;
            this.charts.prenotazioni.update();
        }

        // Update occupazione chart
        if (this.charts.occupazione && data.occupazione) {
            this.charts.occupazione.data.labels = data.occupazione.labels;
            this.charts.occupazione.data.datasets[0].data = data.occupazione.data;
            this.charts.occupazione.update();
        }
    }

    async loadDisponibilita() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/disponibilita?tipo=responsabile&sede=${this.currentSede || ''}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const disponibilita = await response.json();
                this.generateCalendar(disponibilita);
                this.displayDisponibilitaRules(disponibilita.regole);
            }
        } catch (error) {
            console.error('Errore caricamento disponibilità:', error);
        }
    }

    generateCalendar(disponibilita) {
        const calendarBody = document.getElementById('calendarBody');
        const currentMonth = this.currentMonth;

        // Generate calendar grid
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        calendarBody.innerHTML = '';

        // Generate 6 weeks of calendar
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + (week * 7) + day);

                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day';

                if (date.getMonth() === currentMonth.getMonth()) {
                    dayElement.textContent = date.getDate();

                    // Check if today
                    if (this.isToday(date)) {
                        dayElement.classList.add('today');
                    }

                    // Check availability
                    const availability = this.getDayAvailability(date, disponibilita);
                    if (availability === 'unavailable') {
                        dayElement.classList.add('unavailable');
                    } else if (availability === 'partial') {
                        dayElement.classList.add('partial');
                    }

                    dayElement.addEventListener('click', () => this.showDayDetails(date));
                } else {
                    dayElement.textContent = '';
                    dayElement.style.visibility = 'hidden';
                }

                calendarBody.appendChild(dayElement);
            }
        }

        // Update month display
        document.getElementById('currentMonth').textContent = currentMonth.toLocaleDateString('it-IT', {
            month: 'long',
            year: 'numeric'
        });
    }

    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }

    getDayAvailability(date, disponibilita) {
        const dateStr = date.toISOString().split('T')[0];
        const dayRules = disponibilita.regole.filter(rule =>
            rule.data_inizio <= dateStr && rule.data_fine >= dateStr
        );

        if (dayRules.length === 0) return 'available';
        if (dayRules.some(rule => rule.tipo === 'manutenzione')) return 'unavailable';
        return 'partial';
    }

    displayDisponibilitaRules(regole) {
        const container = document.getElementById('rulesList');
        container.innerHTML = '';

        regole.forEach(regola => {
            const ruleItem = document.createElement('div');
            ruleItem.className = 'rule-item';

            ruleItem.innerHTML = `
                <div class="rule-header">
                    <span class="rule-type">${regola.tipo}</span>
                    <div class="rule-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="editRegola(${regola.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteRegola(${regola.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="rule-details">
                    ${regola.data_inizio} - ${regola.data_fine}<br>
                    ${regola.motivo}
                </div>
            `;

            container.appendChild(ruleItem);
        });
    }

    async loadPrenotazioni() {
        try {
            const filters = this.getPrenotazioniFilters();
            const response = await fetch(`${window.CONFIG.API_BASE}/prenotazioni?tipo=responsabile&sede=${this.currentSede || ''}&${new URLSearchParams(filters)}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const prenotazioni = await response.json();
                this.displayPrenotazioni(prenotazioni);
            }
        } catch (error) {
            console.error('Errore caricamento prenotazioni:', error);
        }
    }

    getPrenotazioniFilters() {
        const filters = {};

        const dataInizio = document.getElementById('filterDataInizio').value;
        const dataFine = document.getElementById('filterDataFine').value;
        const spazio = document.getElementById('filterSpazio').value;
        const stato = document.getElementById('filterStato').value;

        if (dataInizio) filters.data_inizio = dataInizio;
        if (dataFine) filters.data_fine = dataFine;
        if (spazio) filters.spazio = spazio;
        if (stato) filters.stato = stato;

        return filters;
    }

    displayPrenotazioni(prenotazioni) {
        const tbody = document.getElementById('prenotazioniTableBody');
        tbody.innerHTML = '';

        prenotazioni.forEach(prenotazione => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prenotazione.id_prenotazione}</td>
                <td>${prenotazione.nome_utente} ${prenotazione.cognome_utente}</td>
                <td>${prenotazione.nome_spazio}</td>
                <td>${this.formatDateTime(prenotazione.data_inizio)}</td>
                <td>${this.formatDateTime(prenotazione.data_fine)}</td>
                <td><span class="badge badge-${this.getStatusBadgeClass(prenotazione.stato)}">${prenotazione.stato}</span></td>
                <td>€${prenotazione.importo}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewPrenotazione(${prenotazione.id_prenotazione})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="confirmPrenotazione(${prenotazione.id_prenotazione})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="cancelPrenotazione(${prenotazione.id_prenotazione})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getStatusBadgeClass(stato) {
        const statusMap = {
            'confermata': 'success',
            'in attesa': 'warning',
            'cancellata': 'error',
            'in sospeso': 'pending'
        };
        return statusMap[stato] || 'info';
    }

    formatDateTime(dateTimeStr) {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async loadUtenti() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/utenti?tipo=responsabile&sede=${this.currentSede || ''}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.displayUtentiStats(data.stats);
                this.displayUtenti(data.utenti);
            }
        } catch (error) {
            console.error('Errore caricamento utenti:', error);
        }
    }

    displayUtentiStats(stats) {
        document.getElementById('utentiTotali').textContent = stats.totali || 0;
        document.getElementById('utentiAttiviMese').textContent = stats.attivi_mese || 0;
        document.getElementById('nuoviUtenti').textContent = stats.nuovi_mese || 0;
        document.getElementById('utentiPremium').textContent = stats.premium || 0;
    }

    displayUtenti(utenti) {
        const tbody = document.getElementById('utentiTableBody');
        tbody.innerHTML = '';

        utenti.forEach(utente => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${utente.id_utente}</td>
                <td>${utente.nome} ${utente.cognome}</td>
                <td>${utente.email}</td>
                <td><span class="badge badge-${this.getRoleBadgeClass(utente.ruolo)}">${utente.ruolo}</span></td>
                <td>${this.formatDate(utente.data_registrazione)}</td>
                <td>${this.formatDate(utente.ultimo_accesso)}</td>
                <td><span class="badge badge-${this.getStatusBadgeClass(utente.stato)}">${utente.stato}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewUtente(${utente.id_utente})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="editUtente(${utente.id_utente})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteUtente(${utente.id_utente})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getRoleBadgeClass(ruolo) {
        const roleMap = {
            'cliente': 'info',
            'responsabile': 'warning',
            'admin': 'danger'
        };
        return roleMap[ruolo] || 'secondary';
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT');
    }

    async loadReportistica() {
        try {
            const filters = this.getReportFilters();
            const response = await fetch(`${window.CONFIG.API_BASE}/reportistica?tipo=responsabile&sede=${this.currentSede || ''}&${new URLSearchParams(filters)}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.generateReportCharts(data);
                this.displayReportSummary(data.summary);
            }
        } catch (error) {
            console.error('Errore caricamento reportistica:', error);
        }
    }

    getReportFilters() {
        const filters = {};

        const periodo = document.getElementById('reportPeriodo').value;
        const sede = document.getElementById('reportSede').value;
        const tipo = document.getElementById('reportTipo').value;
        const dataInizio = document.getElementById('reportDataInizio').value;
        const dataFine = document.getElementById('reportDataFine').value;

        if (periodo) filters.periodo = periodo;
        if (sede) filters.sede = sede;
        if (tipo) filters.tipo = tipo;
        if (dataInizio) filters.data_inizio = dataInizio;
        if (dataFine) filters.data_fine = dataFine;

        return filters;
    }

    generateReportCharts(data) {
        // Main chart
        if (data.main_chart) {
            this.updateMainChart(data.main_chart);
        }

        // Spazio chart
        if (data.spazio_chart) {
            this.updateSpazioChart(data.spazio_chart);
        }

        // Sede chart
        if (data.sede_chart) {
            this.updateSedeChart(data.sede_chart);
        }

        // Utenti chart
        if (data.utenti_chart) {
            this.updateUtentiChart(data.utenti_chart);
        }
    }

    updateMainChart(data) {
        const ctx = document.getElementById('mainReportChart');
        if (!ctx) return;

        if (this.charts.mainReport) {
            this.charts.mainReport.destroy();
        }

        this.charts.mainReport = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label,
                    data: data.data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateSpazioChart(data) {
        const ctx = document.getElementById('spazioChart');
        if (!ctx) return;

        if (this.charts.spazio) {
            this.charts.spazio.destroy();
        }

        this.charts.spazio = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.data,
                    backgroundColor: [
                        '#2563eb',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateSedeChart(data) {
        const ctx = document.getElementById('sedeChart');
        if (!ctx) return;

        if (this.charts.sede) {
            this.charts.sede.destroy();
        }

        this.charts.sede = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label,
                    data: data.data,
                    backgroundColor: '#2563eb'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateUtentiChart(data) {
        const ctx = document.getElementById('utentiChart');
        if (!ctx) return;

        if (this.charts.utenti) {
            this.charts.utenti.destroy();
        }

        this.charts.utenti = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label,
                    data: data.data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    displayReportSummary(summary) {
        const container = document.getElementById('reportSummary');
        container.innerHTML = '';

        Object.entries(summary).forEach(([key, value]) => {
            const summaryItem = document.createElement('div');
            summaryItem.className = 'summary-item';

            summaryItem.innerHTML = `
                <div class="summary-value">${value}</div>
                <div class="summary-label">${this.formatSummaryLabel(key)}</div>
            `;

            container.appendChild(summaryItem);
        });
    }

    formatSummaryLabel(key) {
        const labelMap = {
            'prenotazioni_totali': 'Prenotazioni Totali',
            'fatturato_totale': 'Fatturato Totale',
            'occupazione_media': 'Occupazione Media',
            'utenti_nuovi': 'Utenti Nuovi',
            'tasso_conversione': 'Tasso Conversione'
        };
        return labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    startAutoRefresh() {
        if (document.getElementById('autoRefresh').checked) {
            setInterval(() => {
                if (this.currentSection === 'overview') {
                    this.loadQuickStats();
                }
            }, 30000); // Refresh every 30 seconds
        }
    }

    toggleDarkMode(enabled) {
        if (enabled) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
        localStorage.setItem('darkMode', enabled);
    }

    // Calendar navigation
    previousMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.loadDisponibilita();
    }

    nextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.loadDisponibilita();
    }

    // Utility functions
    showDayDetails(date) {
        // Implementation for showing day details
        console.log('Show details for:', date);
    }

    refreshOverview() {
        this.loadOverviewData();
    }

    applicaFiltri() {
        this.loadPrenotazioni();
    }

    resetFiltri() {
        document.getElementById('filterDataInizio').value = '';
        document.getElementById('filterDataFine').value = '';
        document.getElementById('filterSpazio').value = '';
        document.getElementById('filterStato').value = '';
        this.loadPrenotazioni();
    }

    generaReport() {
        this.loadReportistica();
    }

    salvaImpostazioni() {
        const settings = {
            notifPrenotazioni: document.getElementById('notifPrenotazioni').checked,
            notifCancellazioni: document.getElementById('notifCancellazioni').checked,
            notifUtenti: document.getElementById('notifUtenti').checked,
            notifReport: document.getElementById('notifReport').checked,
            autoRefresh: document.getElementById('autoRefresh').checked,
            darkMode: document.getElementById('darkMode').checked,
            compactView: document.getElementById('compactView').checked,
            exportPDF: document.getElementById('exportPDF').checked,
            exportExcel: document.getElementById('exportExcel').checked,
            exportCSV: document.getElementById('exportCSV').checked
        };

        localStorage.setItem('dashboardSettings', JSON.stringify(settings));

        // Show success message
        if (window.modernUI) {
            window.modernUI.showToast('Impostazioni salvate con successo!', 'success');
        }
    }

    resetImpostazioni() {
        // Reset to default values
        document.getElementById('notifPrenotazioni').checked = true;
        document.getElementById('notifCancellazioni').checked = true;
        document.getElementById('notifUtenti').checked = true;
        document.getElementById('notifReport').checked = true;
        document.getElementById('autoRefresh').checked = true;
        document.getElementById('darkMode').checked = false;
        document.getElementById('compactView').checked = false;
        document.getElementById('exportPDF').checked = true;
        document.getElementById('exportExcel').checked = true;
        document.getElementById('exportCSV').checked = false;

        this.salvaImpostazioni();
    }
}

// Global functions for modals and actions
function showDisponibilitaModal() {
    const modal = new bootstrap.Modal(document.getElementById('disponibilitaModal'));
    modal.show();
}

function showUtenteModal() {
    const modal = new bootstrap.Modal(document.getElementById('utenteModal'));
    modal.show();
}

function salvaDisponibilita() {
    // Implementation for saving disponibilità rule
    console.log('Salva disponibilità');
    const modal = bootstrap.Modal.getInstance(document.getElementById('disponibilitaModal'));
    modal.hide();
}

function salvaUtente() {
    // Implementation for saving user
    console.log('Salva utente');
    const modal = bootstrap.Modal.getInstance(document.getElementById('utenteModal'));
    modal.hide();
}

// Action functions
function viewPrenotazione(id) {
    console.log('View prenotazione:', id);
}

function confirmPrenotazione(id) {
    console.log('Confirm prenotazione:', id);
}

function cancelPrenotazione(id) {
    console.log('Cancel prenotazione:', id);
}

function viewUtente(id) {
    console.log('View utente:', id);
}

function editUtente(id) {
    console.log('Edit utente:', id);
}

function deleteUtente(id) {
    console.log('Delete utente:', id);
}

function editRegola(id) {
    console.log('Edit regola:', id);
}

function deleteRegola(id) {
    console.log('Delete regola:', id);
}

function exportReport() {
    console.log('Export report');
}

function scheduleReport() {
    console.log('Schedule report');
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardResponsabili = new DashboardResponsabili();
});
