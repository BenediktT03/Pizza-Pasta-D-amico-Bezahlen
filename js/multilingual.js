/* ========================================
   PIZZA&PASTA D'AMICO - MEHRSPRACHIGKEIT
   Vollständige Implementierung
   ======================================== */

class MultiLanguage {
    constructor() {
        this.currentLang = 'de';
        this.supportedLangs = ['de', 'fr', 'it', 'es', 'en'];
        this.translations = {};
        this.init();
    }

    // Browser-Spracherkennung
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0].toLowerCase();
        
        if (this.supportedLangs.includes(langCode)) {
            return langCode;
        }
        return 'de'; // Fallback
    }

    // Initialisierung
    init() {
        // Lade Übersetzungen
        this.loadTranslations();
        
        // Bestimme Sprache
        const savedLang = localStorage.getItem('selectedLanguage');
        if (savedLang && this.supportedLangs.includes(savedLang)) {
            this.currentLang = savedLang;
        } else {
            this.currentLang = this.detectBrowserLanguage();
            localStorage.setItem('selectedLanguage', this.currentLang);
        }
        
        // DOM Ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createLanguageSelector();
                this.applyTranslations();
            });
        } else {
            this.createLanguageSelector();
            this.applyTranslations();
        }
    }

    // Übersetzungen laden
    loadTranslations() {
        this.translations = {
            de: {
                // Admin Login
                'admin.login.title': 'Admin Login - Pizza&Pasta D\'amico',
                'admin.login.subtitle': 'Pizza&Pasta D\'amico',
                'admin.login.email': 'E-Mail',
                'admin.login.password': 'Passwort',
                'admin.login.button': 'Anmelden',
                'admin.login.error.generic': 'Login fehlgeschlagen. Bitte versuchen Sie es erneut.',
                'admin.login.error.email': 'Ungültige E-Mail-Adresse',
                'admin.login.error.notfound': 'Benutzer nicht gefunden',
                'admin.login.error.password': 'Falsches Passwort',
                'admin.login.error.toomany': 'Zu viele Versuche. Bitte später erneut versuchen.',
                
                // Admin Navigation
                'admin.nav.dashboard': 'Dashboard',
                'admin.nav.orders': 'Bestellungen',
                'admin.nav.products': 'Produkte',
                'admin.nav.logout': 'Logout',
                
                // Admin Dashboard
                'admin.dashboard.title': 'Admin Dashboard - Pizza&Pasta D\'amico',
                'admin.dashboard.welcome': 'Willkommen im Dashboard',
                'admin.dashboard.subtitle': 'Pizza&Pasta D\'amico Verwaltungssystem',
                
                // Statistiken
                'admin.stats.ordersToday': 'Bestellungen heute',
                'admin.stats.pending': 'Wartende Bestellungen',
                'admin.stats.revenue': 'Heutiger Umsatz (CHF)',
                'admin.stats.waitTime': 'Aktuelle Wartezeit (Min)',
                
                // Allgemein
                'loading': 'Wird geladen...',
                'error': 'Fehler',
                'success': 'Erfolgreich',
                'save': 'Speichern',
                'cancel': 'Abbrechen',
                'delete': 'Löschen',
                'edit': 'Bearbeiten',
                'add': 'Hinzufügen',
                'close': 'Schließen',
                'confirm': 'Bestätigen',
                'back': 'Zurück'
            },
            
            fr: {
                // Admin Login
                'admin.login.title': 'Connexion Admin - Pizza&Pasta D\'amico',
                'admin.login.subtitle': 'Pizza&Pasta D\'amico',
                'admin.login.email': 'E-mail',
                'admin.login.password': 'Mot de passe',
                'admin.login.button': 'Se connecter',
                'admin.login.error.generic': 'Échec de la connexion. Veuillez réessayer.',
                'admin.login.error.email': 'Adresse e-mail invalide',
                'admin.login.error.notfound': 'Utilisateur non trouvé',
                'admin.login.error.password': 'Mot de passe incorrect',
                'admin.login.error.toomany': 'Trop de tentatives. Veuillez réessayer plus tard.',
                
                // Admin Navigation
                'admin.nav.dashboard': 'Tableau de bord',
                'admin.nav.orders': 'Commandes',
                'admin.nav.products': 'Produits',
                'admin.nav.logout': 'Déconnexion',
                
                // Admin Dashboard
                'admin.dashboard.title': 'Tableau de bord Admin - Pizza&Pasta D\'amico',
                'admin.dashboard.welcome': 'Bienvenue dans le tableau de bord',
                'admin.dashboard.subtitle': 'Système de gestion Pizza&Pasta D\'amico',
                
                // Statistiques
                'admin.stats.ordersToday': 'Commandes aujourd\'hui',
                'admin.stats.pending': 'Commandes en attente',
                'admin.stats.revenue': 'Chiffre d\'affaires du jour (CHF)',
                'admin.stats.waitTime': 'Temps d\'attente actuel (Min)',
                
                // Allgemein
                'loading': 'Chargement...',
                'error': 'Erreur',
                'success': 'Succès',
                'save': 'Enregistrer',
                'cancel': 'Annuler',
                'delete': 'Supprimer',
                'edit': 'Modifier',
                'add': 'Ajouter',
                'close': 'Fermer',
                'confirm': 'Confirmer',
                'back': 'Retour'
            },
            
            it: {
                // Admin Login
                'admin.login.title': 'Accesso Admin - Pizza&Pasta D\'amico',
                'admin.login.subtitle': 'Pizza&Pasta D\'amico',
                'admin.login.email': 'E-mail',
                'admin.login.password': 'Password',
                'admin.login.button': 'Accedi',
                'admin.login.error.generic': 'Accesso fallito. Riprova.',
                'admin.login.error.email': 'Indirizzo e-mail non valido',
                'admin.login.error.notfound': 'Utente non trovato',
                'admin.login.error.password': 'Password errata',
                'admin.login.error.toomany': 'Troppi tentativi. Riprova più tardi.',
                
                // Admin Navigation
                'admin.nav.dashboard': 'Dashboard',
                'admin.nav.orders': 'Ordini',
                'admin.nav.products': 'Prodotti',
                'admin.nav.logout': 'Esci',
                
                // Admin Dashboard
                'admin.dashboard.title': 'Dashboard Admin - Pizza&Pasta D\'amico',
                'admin.dashboard.welcome': 'Benvenuto nella dashboard',
                'admin.dashboard.subtitle': 'Sistema di gestione Pizza&Pasta D\'amico',
                
                // Statistiche
                'admin.stats.ordersToday': 'Ordini oggi',
                'admin.stats.pending': 'Ordini in attesa',
                'admin.stats.revenue': 'Fatturato odierno (CHF)',
                'admin.stats.waitTime': 'Tempo di attesa attuale (Min)',
                
                // Allgemein
                'loading': 'Caricamento...',
                'error': 'Errore',
                'success': 'Successo',
                'save': 'Salva',
                'cancel': 'Annulla',
                'delete': 'Elimina',
                'edit': 'Modifica',
                'add': 'Aggiungi',
                'close': 'Chiudi',
                'confirm': 'Conferma',
                'back': 'Indietro'
            },
            
            es: {
                // Admin Login
                'admin.login.title': 'Inicio de sesión Admin - Pizza&Pasta D\'amico',
                'admin.login.subtitle': 'Pizza&Pasta D\'amico',
                'admin.login.email': 'Correo electrónico',
                'admin.login.password': 'Contraseña',
                'admin.login.button': 'Iniciar sesión',
                'admin.login.error.generic': 'Error al iniciar sesión. Por favor, inténtalo de nuevo.',
                'admin.login.error.email': 'Dirección de correo electrónico no válida',
                'admin.login.error.notfound': 'Usuario no encontrado',
                'admin.login.error.password': 'Contraseña incorrecta',
                'admin.login.error.toomany': 'Demasiados intentos. Por favor, inténtalo más tarde.',
                
                // Admin Navigation
                'admin.nav.dashboard': 'Panel',
                'admin.nav.orders': 'Pedidos',
                'admin.nav.products': 'Productos',
                'admin.nav.logout': 'Cerrar sesión',
                
                // Admin Dashboard
                'admin.dashboard.title': 'Panel Admin - Pizza&Pasta D\'amico',
                'admin.dashboard.welcome': 'Bienvenido al panel',
                'admin.dashboard.subtitle': 'Sistema de gestión Pizza&Pasta D\'amico',
                
                // Estadísticas
                'admin.stats.ordersToday': 'Pedidos hoy',
                'admin.stats.pending': 'Pedidos pendientes',
                'admin.stats.revenue': 'Ingresos de hoy (CHF)',
                'admin.stats.waitTime': 'Tiempo de espera actual (Min)',
                
                // General
                'loading': 'Cargando...',
                'error': 'Error',
                'success': 'Éxito',
                'save': 'Guardar',
                'cancel': 'Cancelar',
                'delete': 'Eliminar',
                'edit': 'Editar',
                'add': 'Añadir',
                'close': 'Cerrar',
                'confirm': 'Confirmar',
                'back': 'Atrás'
            },
            
            en: {
                // Admin Login
                'admin.login.title': 'Admin Login - Pizza&Pasta D\'amico',
                'admin.login.subtitle': 'Pizza&Pasta D\'amico',
                'admin.login.email': 'Email',
                'admin.login.password': 'Password',
                'admin.login.button': 'Sign In',
                'admin.login.error.generic': 'Login failed. Please try again.',
                'admin.login.error.email': 'Invalid email address',
                'admin.login.error.notfound': 'User not found',
                'admin.login.error.password': 'Incorrect password',
                'admin.login.error.toomany': 'Too many attempts. Please try again later.',
                
                // Admin Navigation
                'admin.nav.dashboard': 'Dashboard',
                'admin.nav.orders': 'Orders',
                'admin.nav.products': 'Products',
                'admin.nav.logout': 'Logout',
                
                // Admin Dashboard
                'admin.dashboard.title': 'Admin Dashboard - Pizza&Pasta D\'amico',
                'admin.dashboard.welcome': 'Welcome to Dashboard',
                'admin.dashboard.subtitle': 'Pizza&Pasta D\'amico Management System',
                
                // Statistics
                'admin.stats.ordersToday': 'Orders Today',
                'admin.stats.pending': 'Pending Orders',
                'admin.stats.revenue': 'Today\'s Revenue (CHF)',
                'admin.stats.waitTime': 'Current Wait Time (Min)',
                
                // General
                'loading': 'Loading...',
                'error': 'Error',
                'success': 'Success',
                'save': 'Save',
                'cancel': 'Cancel',
                'delete': 'Delete',
                'edit': 'Edit',
                'add': 'Add',
                'close': 'Close',
                'confirm': 'Confirm',
                'back': 'Back'
            }
        };
    }

    // Sprachauswahl-UI erstellen
    createLanguageSelector() {
        // Entferne existierenden Selector falls vorhanden
        const existing = document.querySelector('.language-selector');
        if (existing) {
            existing.remove();
        }

        const selector = document.createElement('div');
        selector.className = 'language-selector';
        selector.innerHTML = `
            <div class="lang-dropdown">
                <button class="lang-btn" id="langBtn">
                    ${this.getLanguageFlag(this.currentLang)} ${this.currentLang.toUpperCase()}
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="lang-menu" id="langMenu">
                    ${this.supportedLangs.map(lang => `
                        <div class="lang-option ${lang === this.currentLang ? 'active' : ''}" data-lang="${lang}">
                            ${this.getLanguageFlag(lang)} ${this.getLanguageName(lang)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(selector);
        
        // CSS für Language Selector
        if (!document.getElementById('ml-styles')) {
            const style = document.createElement('style');
            style.id = 'ml-styles';
            style.textContent = `
                .language-selector {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 1000;
                }
                
                .lang-dropdown {
                    position: relative;
                }
                
                .lang-btn {
                    background: white;
                    border: 2px solid #e0e0e0;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                    font-size: 14px;
                }
                
                .lang-btn:hover {
                    border-color: #d32f2f;
                    background: #f5f5f5;
                }
                
                .lang-btn i {
                    font-size: 10px;
                    transition: transform 0.3s ease;
                }
                
                .lang-menu {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background: white;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    margin-top: 5px;
                    display: none;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    min-width: 150px;
                }
                
                .lang-menu.show {
                    display: block;
                    animation: fadeIn 0.3s ease;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .lang-option {
                    padding: 10px 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                }
                
                .lang-option:hover {
                    background: #f5f5f5;
                }
                
                .lang-option.active {
                    background: #d32f2f;
                    color: white;
                }
                
                /* Dark mode for login page */
                body.dark-bg .lang-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                }
                
                body.dark-bg .lang-menu {
                    background: rgba(30, 30, 40, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                body.dark-bg .lang-option {
                    color: white;
                }
                
                body.dark-bg .lang-option:hover {
                    background: rgba(59, 130, 246, 0.2);
                }
            `;
            document.head.appendChild(style);
        }
        
        this.setupLanguageEvents();
    }

    // Event-Listener für Sprachauswahl
    setupLanguageEvents() {
        const langBtn = document.getElementById('langBtn');
        const langMenu = document.getElementById('langMenu');
        
        if (!langBtn || !langMenu) return;
        
        // Dropdown Toggle
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langMenu.classList.toggle('show');
            langBtn.querySelector('i').style.transform = langMenu.classList.contains('show') ? 'rotate(180deg)' : '';
        });
        
        // Außerhalb klicken schließt Dropdown
        document.addEventListener('click', () => {
            langMenu.classList.remove('show');
            langBtn.querySelector('i').style.transform = '';
        });
        
        // Sprachauswahl
        document.querySelectorAll('.lang-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const selectedLang = e.currentTarget.dataset.lang;
                this.changeLanguage(selectedLang);
                langMenu.classList.remove('show');
            });
        });
    }

    // Sprache wechseln
    changeLanguage(langCode) {
        if (!this.supportedLangs.includes(langCode)) return;
        
        this.currentLang = langCode;
        localStorage.setItem('selectedLanguage', langCode);
        
        // UI aktualisieren
        const langBtn = document.getElementById('langBtn');
        if (langBtn) {
            langBtn.innerHTML = `
                ${this.getLanguageFlag(langCode)} ${langCode.toUpperCase()}
                <i class="fas fa-chevron-down"></i>
            `;
        }
        
        // Active-Status aktualisieren
        document.querySelectorAll('.lang-option').forEach(option => {
            option.classList.toggle('active', option.dataset.lang === langCode);
        });
        
        // Übersetzungen anwenden
        this.applyTranslations();
        
        // HTML lang-Attribut setzen
        document.documentElement.lang = langCode;
    }

    // Übersetzungen auf der Seite anwenden
    applyTranslations() {
        // Alle Elemente mit data-i18n Attribut übersetzen
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.placeholder) {
                    element.placeholder = translation;
                }
            } else if (element.tagName === 'TITLE') {
                document.title = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Title aktualisieren wenn vorhanden
        const titleKey = document.querySelector('title')?.getAttribute('data-i18n');
        if (titleKey) {
            document.title = this.t(titleKey);
        }
    }

    // Übersetzung abrufen
    t(key, params = {}) {
        let translation = this.translations[this.currentLang]?.[key] || 
                         this.translations['de']?.[key] || 
                         key;
        
        // Platzhalter ersetzen
        Object.keys(params).forEach(param => {
            translation = translation.replace(new RegExp(`{${param}}`, 'g'), params[param]);
        });
        
        return translation;
    }

    // Sprach-Flags
    getLanguageFlag(langCode) {
        const flags = {
            'de': '🇩🇪',
            'fr': '🇫🇷',
            'it': '🇮🇹',
            'es': '🇪🇸',
            'en': '🇬🇧'
        };
        return flags[langCode] || '🌍';
    }

    // Sprach-Namen
    getLanguageName(langCode) {
        const names = {
            'de': 'Deutsch',
            'fr': 'Français',
            'it': 'Italiano',
            'es': 'Español',
            'en': 'English'
        };
        return names[langCode] || langCode.toUpperCase();
    }
}

// Globale Instanz erstellen
window.ml = new MultiLanguage();

// Hilfsfunktion für einfachere Verwendung
window.t = (key, params) => window.ml ? window.ml.t(key, params) : key;

// Check ob Seite dunklen Hintergrund hat (für Login)
if (document.body.style.background && document.body.style.background.includes('gradient')) {
    document.body.classList.add('dark-bg');
}