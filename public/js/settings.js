// ============================================================================
// EATECH - SETTINGS MANAGEMENT SYSTEM
// Version: 1.0.0
// Description: Vollständiges Einstellungs-System für Foodtruck-Betreiber
// Features: Multi-Tenant, Themes, Payment Integration, AI Image Search
// ============================================================================

class SettingsManager {
    constructor() {
        this.currentTab = 'business';
        this.hasChanges = false;
        this.currentTheme = 'dark-elegant';
        this.locations = [];
        this.settings = {};
        
        // Get tenant ID from subdomain or URL parameter
        this.tenantId = this.getTenantId();
        
        this.init();
    }
    
    // Initialize
    async init() {
        // Check authentication
        auth.onAuthStateChanged(user => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                this.loadSettings();
                this.setupEventListeners();
                this.setupAutoSave();
            }
        });
    }
    
    // Get tenant ID (for multi-tenant setup)
    getTenantId() {
        // Option 1: From subdomain (tenant.eatech.ch)
        const subdomain = window.location.hostname.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'eatech') {
            return subdomain;
        }
        
        // Option 2: From URL parameter (?tenant=xyz)
        const urlParams = new URLSearchParams(window.location.search);
        const tenantParam = urlParams.get('tenant');
        if (tenantParam) {
            return tenantParam;
        }
        
        // Option 3: From localStorage (for development)
        return localStorage.getItem('tenantId') || 'default';
    }
    
    // Load all settings
    async loadSettings() {
        try {
            const snapshot = await database.ref(`tenants/${this.tenantId}/settings`).once('value');
            this.settings = snapshot.val() || this.getDefaultSettings();
            
            // Apply settings to UI
            this.applySettingsToUI();
            
            // Load locations separately
            this.loadLocations();
            
            // Apply theme
            this.applyTheme(this.settings.design?.theme || 'dark-elegant');
            
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showToast('Fehler beim Laden der Einstellungen', 'error');
        }
    }
    
    // Get default settings
    getDefaultSettings() {
        return {
            business: {
                name: '',
                slogan: '',
                email: '',
                phone: '',
                logo: null,
                social: {
                    facebook: '',
                    instagram: '',
                    tiktok: ''
                },
                openingHours: {
                    monday: { open: true, from: '11:00', to: '20:00' },
                    tuesday: { open: true, from: '11:00', to: '20:00' },
                    wednesday: { open: true, from: '11:00', to: '20:00' },
                    thursday: { open: true, from: '11:00', to: '20:00' },
                    friday: { open: true, from: '11:00', to: '22:00' },
                    saturday: { open: true, from: '11:00', to: '22:00' },
                    sunday: { open: false, from: '11:00', to: '20:00' }
                },
                pauseMode: false
            },
            payment: {
                stripe: {
                    enabled: false,
                    publishableKey: '',
                    secretKey: ''
                },
                twint: {
                    enabled: false,
                    merchantId: '',
                    storeId: '',
                    terminalId: ''
                },
                minOrderAmount: 15,
                defaultWaitTime: 15
            },
            design: {
                theme: 'dark-elegant',
                colors: {
                    primary: '#ff6b6b',
                    secondary: '#4ecdc4',
                    background: '#1a1a1a'
                },
                font: 'Inter',
                adminTheme: 'dark'
            },
            communication: {
                whatsapp: {
                    enabled: false,
                    number: '',
                    token: ''
                },
                sms: {
                    enabled: false,
                    provider: 'twilio',
                    apiKey: '',
                    apiSecret: ''
                },
                email: {
                    from: '',
                    replyTo: ''
                }
            },
            features: {
                voice: true,
                weather: false,
                offline: true,
                aiImages: true,
                qrTable: false,
                analytics: true
            }
        };
    }
    
    // Apply settings to UI
    applySettingsToUI() {
        // Business tab
        this.setInputValue('businessName', this.settings.business?.name);
        this.setInputValue('businessSlogan', this.settings.business?.slogan);
        this.setInputValue('businessEmail', this.settings.business?.email);
        this.setInputValue('businessPhone', this.settings.business?.phone);
        
        // Logo
        if (this.settings.business?.logo) {
            this.displayLogo(this.settings.business.logo);
        }
        
        // Social Media
        this.setInputValue('socialFacebook', this.settings.business?.social?.facebook);
        this.setInputValue('socialInstagram', this.settings.business?.social?.instagram);
        this.setInputValue('socialTiktok', this.settings.business?.social?.tiktok);
        
        // Opening Hours
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
            const hours = this.settings.business?.openingHours?.[day];
            if (hours) {
                this.setCheckboxValue(`${day}-open`, hours.open);
                this.setInputValue(`${day}-from`, hours.from);
                this.setInputValue(`${day}-to`, hours.to);
                
                // Enable/disable time inputs based on open status
                document.getElementById(`${day}-from`).disabled = !hours.open;
                document.getElementById(`${day}-to`).disabled = !hours.open;
            }
        });
        
        // Pause Mode
        this.setCheckboxValue('pauseMode', this.settings.business?.pauseMode);
        
        // Payment settings
        this.setCheckboxValue('stripeEnabled', this.settings.payment?.stripe?.enabled);
        this.setInputValue('stripePublishableKey', this.settings.payment?.stripe?.publishableKey);
        this.setInputValue('stripeSecretKey', this.settings.payment?.stripe?.secretKey);
        
        this.setCheckboxValue('twintEnabled', this.settings.payment?.twint?.enabled);
        this.setInputValue('twintMerchantId', this.settings.payment?.twint?.merchantId);
        this.setInputValue('twintStoreId', this.settings.payment?.twint?.storeId);
        this.setInputValue('twintTerminalId', this.settings.payment?.twint?.terminalId);
        
        this.setInputValue('minOrderAmount', this.settings.payment?.minOrderAmount);
        this.setInputValue('defaultWaitTime', this.settings.payment?.defaultWaitTime);
        
        // Design settings
        this.currentTheme = this.settings.design?.theme || 'dark-elegant';
        this.selectTheme(this.currentTheme);
        
        this.setInputValue('primaryColor', this.settings.design?.colors?.primary);
        this.setInputValue('primaryColorHex', this.settings.design?.colors?.primary);
        this.setInputValue('secondaryColor', this.settings.design?.colors?.secondary);
        this.setInputValue('secondaryColorHex', this.settings.design?.colors?.secondary);
        this.setInputValue('backgroundColor', this.settings.design?.colors?.background);
        this.setInputValue('backgroundColorHex', this.settings.design?.colors?.background);
        
        this.setInputValue('primaryFont', this.settings.design?.font);
        this.setInputValue('adminTheme', this.settings.design?.adminTheme);
        
        // Communication settings
        this.setCheckboxValue('whatsappEnabled', this.settings.communication?.whatsapp?.enabled);
        this.setInputValue('whatsappNumber', this.settings.communication?.whatsapp?.number);
        this.setInputValue('whatsappToken', this.settings.communication?.whatsapp?.token);
        
        this.setCheckboxValue('smsEnabled', this.settings.communication?.sms?.enabled);
        this.setInputValue('smsProvider', this.settings.communication?.sms?.provider);
        this.setInputValue('smsApiKey', this.settings.communication?.sms?.apiKey);
        this.setInputValue('smsApiSecret', this.settings.communication?.sms?.apiSecret);
        
        this.setInputValue('emailFrom', this.settings.communication?.email?.from);
        this.setInputValue('emailReplyTo', this.settings.communication?.email?.replyTo);
        
        // Features
        this.setCheckboxValue('voiceEnabled', this.settings.features?.voice);
        this.setCheckboxValue('weatherEnabled', this.settings.features?.weather);
        this.setCheckboxValue('offlineEnabled', this.settings.features?.offline);
        this.setCheckboxValue('aiImagesEnabled', this.settings.features?.aiImages);
        this.setCheckboxValue('qrTableEnabled', this.settings.features?.qrTable);
        this.setCheckboxValue('analyticsEnabled', this.settings.features?.analytics);
    }
    
    // Helper methods for setting values
    setInputValue(id, value) {
        const element = document.getElementById(id);
        if (element && value !== undefined && value !== null) {
            element.value = value;
        }
    }
    
    setCheckboxValue(id, checked) {
        const element = document.getElementById(id);
        if (element) {
            element.checked = !!checked;
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('onclick').match(/switchTab\('(.+)'\)/)[1];
                this.switchTab(tab);
            });
        });
        
        // Input changes
        document.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('change', () => this.markAsChanged());
        });
        
        // Logo upload
        document.getElementById('logoUpload').addEventListener('change', (e) => this.handleLogoUpload(e));
        
        // Opening hours checkboxes
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
            const checkbox = document.getElementById(`${day}-open`);
            checkbox.addEventListener('change', (e) => {
                document.getElementById(`${day}-from`).disabled = !e.target.checked;
                document.getElementById(`${day}-to`).disabled = !e.target.checked;
            });
        });
        
        // Color sync
        document.querySelectorAll('input[type="color"]').forEach(colorInput => {
            colorInput.addEventListener('change', (e) => {
                const hexInput = document.getElementById(e.target.id + 'Hex');
                if (hexInput) hexInput.value = e.target.value;
            });
        });
        
        document.querySelectorAll('input[id$="ColorHex"]').forEach(hexInput => {
            hexInput.addEventListener('change', (e) => {
                const colorInput = document.getElementById(e.target.id.replace('Hex', ''));
                if (colorInput && /^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    colorInput.value = e.target.value;
                }
            });
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Wirklich ausloggen?')) {
                auth.signOut();
            }
        });
    }
    
    // Switch tab
    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}-tab`).classList.add('active');
    }
    
    // Mark as changed
    markAsChanged() {
        this.hasChanges = true;
        const saveBtn = document.querySelector('.btn-save');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Änderungen speichern';
        saveBtn.classList.add('has-changes');
    }
    
    // Handle logo upload
    async handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            this.showToast('Bitte nur Bilddateien hochladen', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showToast('Bild ist zu groß (max. 5MB)', 'error');
            return;
        }
        
        try {
            // Show loading
            const logoContainer = document.getElementById('currentLogo');
            logoContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Wird hochgeladen...</div>';
            
            // Upload to Firebase Storage
            const storageRef = storage.ref(`tenants/${this.tenantId}/logo/${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            const logoUrl = await snapshot.ref.getDownloadURL();
            
            // Update settings
            this.settings.business.logo = logoUrl;
            this.displayLogo(logoUrl);
            this.markAsChanged();
            
            this.showToast('Logo erfolgreich hochgeladen', 'success');
            
        } catch (error) {
            console.error('Logo upload error:', error);
            this.showToast('Fehler beim Hochladen des Logos', 'error');
        }
    }
    
    // Display logo
    displayLogo(url) {
        const logoContainer = document.getElementById('currentLogo');
        logoContainer.innerHTML = `<img src="${url}" alt="Logo">`;
    }
    
    // Select theme
    selectTheme(theme) {
        this.currentTheme = theme;
        
        // Update UI
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[onclick="selectTheme('${theme}')"]`).classList.add('active');
        
        // Apply theme preview
        this.applyTheme(theme);
        this.markAsChanged();
    }
    
    // Apply theme
    applyTheme(theme) {
        // This would apply the theme to the customer-facing site
        // For now, just update the preview
        document.body.setAttribute('data-theme', theme);
    }
    
    // Load locations
    async loadLocations() {
        try {
            const snapshot = await database.ref(`tenants/${this.tenantId}/locations`).once('value');
            this.locations = [];
            
            snapshot.forEach(child => {
                this.locations.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            this.renderLocations();
            
        } catch (error) {
            console.error('Error loading locations:', error);
        }
    }
    
    // Render locations
    renderLocations() {
        const container = document.getElementById('locationsList');
        
        if (this.locations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-map-marker-alt"></i>
                    <p>Noch keine Standorte definiert</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.locations.map(location => `
            <div class="location-card">
                <div class="location-info">
                    <h4>${location.name}</h4>
                    <p>${location.address}</p>
                    <span class="location-schedule">
                        ${this.getDayName(location.day)} ${location.timeFrom} - ${location.timeTo}
                    </span>
                </div>
                <div class="location-actions">
                    <button onclick="settingsManager.editLocation('${location.id}')" class="btn-icon">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="settingsManager.deleteLocation('${location.id}')" class="btn-icon danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Get day name in German
    getDayName(day) {
        const days = {
            monday: 'Montag',
            tuesday: 'Dienstag',
            wednesday: 'Mittwoch',
            thursday: 'Donnerstag',
            friday: 'Freitag',
            saturday: 'Samstag',
            sunday: 'Sonntag'
        };
        return days[day] || day;
    }
    
    // Add new location
    addNewLocation() {
        this.currentLocationId = null;
        document.getElementById('locationModal').style.display = 'flex';
        
        // Reset form
        document.getElementById('locationName').value = '';
        document.getElementById('locationAddress').value = '';
        document.getElementById('locationDay').value = 'monday';
        document.getElementById('locationTimeFrom').value = '11:00';
        document.getElementById('locationTimeTo').value = '20:00';
        document.getElementById('locationInfo').value = '';
    }
    
    // Edit location
    editLocation(id) {
        const location = this.locations.find(l => l.id === id);
        if (!location) return;
        
        this.currentLocationId = id;
        
        // Fill form
        document.getElementById('locationName').value = location.name;
        document.getElementById('locationAddress').value = location.address;
        document.getElementById('locationDay').value = location.day;
        document.getElementById('locationTimeFrom').value = location.timeFrom;
        document.getElementById('locationTimeTo').value = location.timeTo;
        document.getElementById('locationInfo').value = location.info || '';
        
        document.getElementById('locationModal').style.display = 'flex';
    }
    
    // Save location
    async saveLocation() {
        const locationData = {
            name: document.getElementById('locationName').value,
            address: document.getElementById('locationAddress').value,
            day: document.getElementById('locationDay').value,
            timeFrom: document.getElementById('locationTimeFrom').value,
            timeTo: document.getElementById('locationTimeTo').value,
            info: document.getElementById('locationInfo').value
        };
        
        if (!locationData.name || !locationData.address) {
            this.showToast('Bitte Name und Adresse eingeben', 'error');
            return;
        }
        
        try {
            if (this.currentLocationId) {
                // Update existing
                await database.ref(`tenants/${this.tenantId}/locations/${this.currentLocationId}`).update(locationData);
            } else {
                // Create new
                await database.ref(`tenants/${this.tenantId}/locations`).push(locationData);
            }
            
            this.closeLocationModal();
            this.loadLocations();
            this.showToast('Standort gespeichert', 'success');
            
        } catch (error) {
            console.error('Error saving location:', error);
            this.showToast('Fehler beim Speichern', 'error');
        }
    }
    
    // Delete location
    async deleteLocation(id) {
        if (!confirm('Diesen Standort wirklich löschen?')) return;
        
        try {
            await database.ref(`tenants/${this.tenantId}/locations/${id}`).remove();
            this.loadLocations();
            this.showToast('Standort gelöscht', 'success');
        } catch (error) {
            console.error('Error deleting location:', error);
            this.showToast('Fehler beim Löschen', 'error');
        }
    }
    
    // Close location modal
    closeLocationModal() {
        document.getElementById('locationModal').style.display = 'none';
    }
    
    // Save all settings
    async saveAllSettings() {
        // Gather all settings from form
        this.settings = {
            business: {
                name: document.getElementById('businessName').value,
                slogan: document.getElementById('businessSlogan').value,
                email: document.getElementById('businessEmail').value,
                phone: document.getElementById('businessPhone').value,
                logo: this.settings.business?.logo,
                social: {
                    facebook: document.getElementById('socialFacebook').value,
                    instagram: document.getElementById('socialInstagram').value,
                    tiktok: document.getElementById('socialTiktok').value
                },
                openingHours: {},
                pauseMode: document.getElementById('pauseMode').checked
            },
            payment: {
                stripe: {
                    enabled: document.getElementById('stripeEnabled').checked,
                    publishableKey: document.getElementById('stripePublishableKey').value,
                    secretKey: document.getElementById('stripeSecretKey').value
                },
                twint: {
                    enabled: document.getElementById('twintEnabled').checked,
                    merchantId: document.getElementById('twintMerchantId').value,
                    storeId: document.getElementById('twintStoreId').value,
                    terminalId: document.getElementById('twintTerminalId').value
                },
                minOrderAmount: parseFloat(document.getElementById('minOrderAmount').value) || 0,
                defaultWaitTime: parseInt(document.getElementById('defaultWaitTime').value) || 15
            },
            design: {
                theme: this.currentTheme,
                colors: {
                    primary: document.getElementById('primaryColor').value,
                    secondary: document.getElementById('secondaryColor').value,
                    background: document.getElementById('backgroundColor').value
                },
                font: document.getElementById('primaryFont').value,
                adminTheme: document.getElementById('adminTheme').value
            },
            communication: {
                whatsapp: {
                    enabled: document.getElementById('whatsappEnabled').checked,
                    number: document.getElementById('whatsappNumber').value,
                    token: document.getElementById('whatsappToken').value
                },
                sms: {
                    enabled: document.getElementById('smsEnabled').checked,
                    provider: document.getElementById('smsProvider').value,
                    apiKey: document.getElementById('smsApiKey').value,
                    apiSecret: document.getElementById('smsApiSecret').value
                },
                email: {
                    from: document.getElementById('emailFrom').value,
                    replyTo: document.getElementById('emailReplyTo').value
                }
            },
            features: {
                voice: document.getElementById('voiceEnabled').checked,
                weather: document.getElementById('weatherEnabled').checked,
                offline: document.getElementById('offlineEnabled').checked,
                aiImages: document.getElementById('aiImagesEnabled').checked,
                qrTable: document.getElementById('qrTableEnabled').checked,
                analytics: document.getElementById('analyticsEnabled').checked
            }
        };
        
        // Gather opening hours
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
            this.settings.business.openingHours[day] = {
                open: document.getElementById(`${day}-open`).checked,
                from: document.getElementById(`${day}-from`).value,
                to: document.getElementById(`${day}-to`).value
            };
        });
        
        try {
            // Save to Firebase
            await database.ref(`tenants/${this.tenantId}/settings`).set(this.settings);
            
            // Update UI
            this.hasChanges = false;
            const saveBtn = document.querySelector('.btn-save');
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Gespeichert';
            saveBtn.classList.remove('has-changes');
            
            this.showToast('Einstellungen erfolgreich gespeichert', 'success');
            
            // Apply settings to customer site
            this.applySettingsToCustomerSite();
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast('Fehler beim Speichern der Einstellungen', 'error');
        }
    }
    
    // Apply settings to customer site
    applySettingsToCustomerSite() {
        // This would update the customer-facing site with new settings
        // For now, just log
        console.log('Settings applied to customer site:', this.settings);
        
        // In production, this would:
        // 1. Update theme CSS variables
        // 2. Update payment configurations
        // 3. Update business information
        // 4. Enable/disable features
    }
    
    // Setup auto-save
    setupAutoSave() {
        // Auto-save every 5 minutes if there are changes
        setInterval(() => {
            if (this.hasChanges) {
                this.saveAllSettings();
            }
        }, 5 * 60 * 1000);
    }
    
    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});

// Global functions for onclick handlers
window.switchTab = (tab) => window.settingsManager.switchTab(tab);
window.selectTheme = (theme) => window.settingsManager.selectTheme(theme);
window.saveAllSettings = () => window.settingsManager.saveAllSettings();
window.addNewLocation = () => window.settingsManager.addNewLocation();
window.saveLocation = () => window.settingsManager.saveLocation();
window.closeLocationModal = () => window.settingsManager.closeLocationModal();