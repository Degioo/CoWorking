# ARCHITETTURA BACKEND E DATABASE - CoWorking

## Diagramma Architetturale - Schema ad Alto Livello

```mermaid
graph TD
    %% CLIENT
    CLIENT[🌐 Frontend Web/Mobile]
    
    %% LOAD BALANCER
    LB[⚖️ Load Balancer]
    
    %% API GATEWAY
    GATEWAY[🚪 API Gateway - Express Server]
    
    %% MIDDLEWARE
    MIDDLEWARE[🛡️ Middleware - CORS, Auth, JWT]
    
    %% CORE LAYERS
    ROUTES[🛣️ Routes Layer - 11 API Endpoints]
    CONTROLLERS[🎮 Controllers Layer - 10 Controllers]
    SERVICES[🔧 Services Layer - Business Logic]
    
    %% DATABASE
    DB[🗄️ PostgreSQL Database]
    
    %% EXTERNAL SERVICES
    STRIPE[💳 Stripe - Pagamenti]
    JWT_SERVICE[🔑 JWT - Autenticazione]
    
    %% BACKGROUND PROCESSES
    CRON[⏰ Cron Jobs - Scadenze Automatiche]
    SSE[📡 SSE - Real-time Updates]
    
    %% CONFIGURATION
    CONFIG[⚙️ Configuration - Environment Variables]
    
    %% FLOW
    CLIENT --> LB
    LB --> GATEWAY
    GATEWAY --> MIDDLEWARE
    MIDDLEWARE --> ROUTES
    ROUTES --> CONTROLLERS
    CONTROLLERS --> SERVICES
    SERVICES --> DB
    
    %% EXTERNAL CONNECTIONS
    CONTROLLERS --> STRIPE
    CONTROLLERS --> JWT_SERVICE
    SERVICES --> CRON
    SERVICES --> SSE
    
    %% CONFIGURATION
    GATEWAY --> CONFIG
    
    %% STYLING
    classDef client fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,color:#000000
    classDef infrastructure fill:#fff3e0,stroke:#f57c00,stroke-width:3px,color:#000000
    classDef application fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,color:#000000
    classDef data fill:#e8f5e8,stroke:#388e3c,stroke-width:3px,color:#000000
    classDef external fill:#ffebee,stroke:#d32f2f,stroke-width:3px,color:#000000
    
    class CLIENT client
    class LB,GATEWAY infrastructure
    class MIDDLEWARE,ROUTES,CONTROLLERS,SERVICES,CRON,SSE application
    class DB data
    class STRIPE,JWT_SERVICE,CONFIG external
```

## Descrizione dell'Architettura

### **🏗️ Livelli Principali**

1. **🌐 Frontend**: Interfaccia web e mobile per gli utenti
2. **⚖️ Load Balancer**: Distribuzione del carico e bilanciamento
3. **🚪 API Gateway**: Server Express principale con gestione richieste
4. **🛡️ Middleware**: CORS, autenticazione JWT, validazione
5. **🛣️ Routes**: 11 endpoint API organizzati per funzionalità
6. **🎮 Controllers**: 10 controller per la logica di business
7. **🔧 Services**: Servizi specializzati e business logic
8. **🗄️ Database**: PostgreSQL per persistenza dati
9. **💳 Stripe**: Integrazione pagamenti online
10. **🔑 JWT**: Gestione autenticazione e token
11. **⏰ Cron Jobs**: Processi automatici per scadenze
12. **📡 SSE**: Server-Sent Events per aggiornamenti real-time

### **🔄 Flusso Principale**

```
Frontend → Load Balancer → API Gateway → Middleware → Routes → Controllers → Services → Database
```

### **🔗 Connessioni Chiave**

- **Autenticazione**: Controllers ↔ JWT Service
- **Pagamenti**: Controllers ↔ Stripe API
- **Real-time**: Services ↔ SSE
- **Automazione**: Services ↔ Cron Jobs
- **Configurazione**: Gateway ↔ Environment Variables

### **📊 Caratteristiche Architetturali**

- **Modulare**: Separazione chiara delle responsabilità
- **Scalabile**: Ogni livello può essere scalato indipendentemente
- **Sicuro**: Middleware di autenticazione e autorizzazione
- **Performante**: Pool di connessioni database e ottimizzazioni
- **Manutenibile**: Struttura pulita e ben organizzata

---

*Schema architetturale ad alto livello per il progetto CoWorking - Sistema di Gestione Spazi di Coworking*
