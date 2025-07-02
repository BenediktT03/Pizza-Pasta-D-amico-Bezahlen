// ============================================================================
// EATECH - WEATHER API INTEGRATION
// Version: 1.0.0
// Description: Dynamische Wartezeit-Anpassung basierend auf Wetterdaten
// Features: OpenWeatherMap API, Auto-Updates, Wartezeit-Multiplikatoren
// ============================================================================

class WeatherIntegration {
    constructor() {
        // OpenWeatherMap API Configuration
        this.config = {
            apiKey: '', // Wird in Settings gesetzt
            apiUrl: 'https://api.openweathermap.org/data/2.5/weather',
            updateInterval: 600000, // 10 Minuten
            enabled: false,
            location: {
                lat: 46.9480, // Bern
                lon: 7.4474
            }
        };
        
        // Weather Impact Factors
        this.weatherFactors = {
            rain: {
                light: 1.2,      // +20% Wartezeit
                moderate: 1.5,   // +50% Wartezeit
                heavy: 2.0       // +100% Wartezeit
            },
            temperature: {
                cold: 1.3,       // < 5°C: +30% Wartezeit
                perfect: 0.9,    // 20-25°C: -10% Wartezeit
                hot: 1.4         // > 30°C: +40% Wartezeit
            },
            wind: {
                strong: 1.2      // > 40 km/h: +20% Wartezeit
            },
            snow: 1.8           // +80% Wartezeit
        };
        
        // Current Weather Data
        this.currentWeather = null;
        this.weatherMultiplier = 1.0;
        this.updateTimer = null;
        
        this.init();
    }
    
    // Initialize
    init() {
        this.loadSettings();
        
        if (this.config.enabled && this.config.apiKey) {
            this.startWeatherUpdates();
        }
    }
    
    // Load settings from localStorage
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('weatherSettings') || '{}');
        this.config.apiKey = settings.apiKey || '';
        this.config.enabled = settings.enabled || false;
        this.config.location = settings.location || this.config.location;
    }
    
    // Save settings
    saveSettings(settings) {
        this.config = { ...this.config, ...settings };
        localStorage.setItem('weatherSettings', JSON.stringify(settings));
        
        // Restart updates if needed
        if (this.config.enabled && this.config.apiKey) {
            this.startWeatherUpdates();
        } else {
            this.stopWeatherUpdates();
        }
    }
    
    // Start weather updates
    startWeatherUpdates() {
        // Initial fetch
        this.fetchWeatherData();
        
        // Clear existing timer
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        // Set up interval
        this.updateTimer = setInterval(() => {
            this.fetchWeatherData();
        }, this.config.updateInterval);
    }
    
    // Stop weather updates
    stopWeatherUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    
    // Fetch weather data
    async fetchWeatherData() {
        if (!this.config.apiKey) return;
        
        try {
            const url = `${this.config.apiUrl}?lat=${this.config.location.lat}&lon=${this.config.location.lon}&appid=${this.config.apiKey}&units=metric&lang=de`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Weather API error');
            }
            
            const data = await response.json();
            this.processWeatherData(data);
            
        } catch (error) {
            console.error('Weather fetch error:', error);
            this.showNotification('Wetterdaten konnten nicht geladen werden', 'error');
        }
    }
    
    // Process weather data
    processWeatherData(data) {
        this.currentWeather = {
            temp: data.main.temp,
            feels_like: data.main.feels_like,
            humidity: data.main.humidity,
            wind_speed: data.wind.speed * 3.6, // m/s to km/h
            weather: data.weather[0].main,
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            rain: data.rain ? data.rain['1h'] || 0 : 0,
            snow: data.snow ? data.snow['1h'] || 0 : 0,
            timestamp: Date.now()
        };
        
        // Calculate multiplier
        this.calculateWeatherMultiplier();
        
        // Update UI
        this.updateWeatherDisplay();
        
        // Update wait time if needed
        if (window.firebase && this.weatherMultiplier !== 1.0) {
            this.updateWaitTime();
        }
        
        // Save to Firebase for history
        this.saveWeatherData();
    }
    
    // Calculate weather multiplier
    calculateWeatherMultiplier() {
        let multiplier = 1.0;
        
        // Temperature impact
        if (this.currentWeather.temp < 5) {
            multiplier *= this.weatherFactors.temperature.cold;
        } else if (this.currentWeather.temp >= 20 && this.currentWeather.temp <= 25) {
            multiplier *= this.weatherFactors.temperature.perfect;
        } else if (this.currentWeather.temp > 30) {
            multiplier *= this.weatherFactors.temperature.hot;
        }
        
        // Rain impact
        if (this.currentWeather.rain > 0) {
            if (this.currentWeather.rain < 2.5) {
                multiplier *= this.weatherFactors.rain.light;
            } else if (this.currentWeather.rain < 7.5) {
                multiplier *= this.weatherFactors.rain.moderate;
            } else {
                multiplier *= this.weatherFactors.rain.heavy;
            }
        }
        
        // Snow impact
        if (this.currentWeather.snow > 0) {
            multiplier *= this.weatherFactors.snow;
        }
        
        // Wind impact
        if (this.currentWeather.wind_speed > 40) {
            multiplier *= this.weatherFactors.wind.strong;
        }
        
        // Round to 2 decimals
        this.weatherMultiplier = Math.round(multiplier * 100) / 100;
    }
    
    // Update wait time based on weather
    async updateWaitTime() {
        try {
            const settingsRef = firebase.database().ref('settings');
            const snapshot = await settingsRef.once('value');
            const settings = snapshot.val() || {};
            
            const baseWaitTime = settings.baseWaitTime || settings.waitTime || 5;
            const weatherAdjustedTime = Math.round(baseWaitTime * this.weatherMultiplier);
            
            // Only update if different
            if (weatherAdjustedTime !== settings.waitTime) {
                await settingsRef.update({
                    waitTime: weatherAdjustedTime,
                    baseWaitTime: baseWaitTime,
                    weatherMultiplier: this.weatherMultiplier,
                    lastWeatherUpdate: firebase.database.ServerValue.TIMESTAMP
                });
                
                this.showNotification(`Wartezeit angepasst: ${weatherAdjustedTime} Min (Wetter: x${this.weatherMultiplier})`, 'info');
            }
        } catch (error) {
            console.error('Wait time update error:', error);
        }
    }
    
    // Save weather data to Firebase
    async saveWeatherData() {
        if (!window.firebase) return;
        
        try {
            await firebase.database().ref('weather-history').push({
                ...this.currentWeather,
                multiplier: this.weatherMultiplier
            });
            
            // Keep only last 100 entries
            const historyRef = firebase.database().ref('weather-history');
            const snapshot = await historyRef.orderByChild('timestamp').once('value');
            const entries = snapshot.val() || {};
            const keys = Object.keys(entries);
            
            if (keys.length > 100) {
                const toDelete = keys.slice(0, keys.length - 100);
                const updates = {};
                toDelete.forEach(key => {
                    updates[key] = null;
                });
                await historyRef.update(updates);
            }
        } catch (error) {
            console.error('Weather history save error:', error);
        }
    }
    
    // Update weather display
    updateWeatherDisplay() {
        const display = document.getElementById('weatherDisplay');
        if (!display) return;
        
        const iconUrl = `https://openweathermap.org/img/wn/${this.currentWeather.icon}@2x.png`;
        
        display.innerHTML = `
            <div class="weather-info">
                <img src="${iconUrl}" alt="${this.currentWeather.description}" class="weather-icon">
                <div class="weather-details">
                    <div class="weather-temp">${Math.round(this.currentWeather.temp)}°C</div>
                    <div class="weather-desc">${this.currentWeather.description}</div>
                </div>
                <div class="weather-impact">
                    <span class="impact-label">Einfluss:</span>
                    <span class="impact-value ${this.getImpactClass()}">
                        ${this.getImpactText()}
                    </span>
                </div>
            </div>
        `;
        
        // Update admin dashboard if exists
        this.updateAdminDisplay();
    }
    
    // Update admin display
    updateAdminDisplay() {
        const adminWeather = document.getElementById('adminWeatherInfo');
        if (!adminWeather) return;
        
        adminWeather.innerHTML = `
            <div class="admin-weather-card">
                <h4><i class="fas fa-cloud-sun"></i> Wetter-Einfluss</h4>
                <div class="weather-grid">
                    <div class="weather-stat">
                        <span class="label">Temperatur:</span>
                        <span class="value">${Math.round(this.currentWeather.temp)}°C</span>
                    </div>
                    <div class="weather-stat">
                        <span class="label">Bedingung:</span>
                        <span class="value">${this.currentWeather.description}</span>
                    </div>
                    <div class="weather-stat">
                        <span class="label">Multiplikator:</span>
                        <span class="value ${this.getImpactClass()}">x${this.weatherMultiplier}</span>
                    </div>
                    <div class="weather-stat">
                        <span class="label">Wartezeit-Effekt:</span>
                        <span class="value">${this.getImpactText()}</span>
                    </div>
                </div>
                <div class="weather-details-grid">
                    ${this.currentWeather.rain > 0 ? `
                        <div class="detail-item">
                            <i class="fas fa-cloud-rain"></i>
                            <span>Regen: ${this.currentWeather.rain}mm/h</span>
                        </div>
                    ` : ''}
                    ${this.currentWeather.wind_speed > 20 ? `
                        <div class="detail-item">
                            <i class="fas fa-wind"></i>
                            <span>Wind: ${Math.round(this.currentWeather.wind_speed)}km/h</span>
                        </div>
                    ` : ''}
                    ${this.currentWeather.snow > 0 ? `
                        <div class="detail-item">
                            <i class="fas fa-snowflake"></i>
                            <span>Schnee: ${this.currentWeather.snow}mm/h</span>
                        </div>
                    ` : ''}
                </div>
                <div class="weather-update-time">
                    <i class="fas fa-clock"></i>
                    Aktualisiert: ${new Date(this.currentWeather.timestamp).toLocaleTimeString()}
                </div>
            </div>
        `;
    }
    
    // Get impact class for styling
    getImpactClass() {
        if (this.weatherMultiplier < 1) return 'positive';
        if (this.weatherMultiplier > 1.3) return 'negative';
        if (this.weatherMultiplier > 1) return 'moderate';
        return 'neutral';
    }
    
    // Get impact text
    getImpactText() {
        if (this.weatherMultiplier < 1) return 'Schnellere Zubereitung';
        if (this.weatherMultiplier > 1.5) return 'Deutlich längere Wartezeit';
        if (this.weatherMultiplier > 1.2) return 'Längere Wartezeit';
        if (this.weatherMultiplier > 1) return 'Leicht längere Wartezeit';
        return 'Kein Einfluss';
    }
    
    // Create settings UI
    createSettingsUI() {
        return `
            <div class="settings-section">
                <h3><i class="fas fa-cloud-sun"></i> Wetter-Integration</h3>
                
                <div class="form-group">
                    <label class="switch">
                        <input type="checkbox" id="weatherEnabled" ${this.config.enabled ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                    <label for="weatherEnabled">Wetter-basierte Wartezeiten aktivieren</label>
                </div>
                
                <div class="form-group">
                    <label for="weatherApiKey">OpenWeatherMap API Key:</label>
                    <input type="text" 
                           id="weatherApiKey" 
                           placeholder="Ihr API Key"
                           value="${this.config.apiKey}">
                    <small>Kostenlos erhältlich auf <a href="https://openweathermap.org/api" target="_blank">openweathermap.org</a></small>
                </div>
                
                <div class="form-group">
                    <label>Standort:</label>
                    <div class="location-input">
                        <input type="number" 
                               id="weatherLat" 
                               placeholder="Latitude"
                               value="${this.config.location.lat}"
                               step="0.0001">
                        <input type="number" 
                               id="weatherLon" 
                               placeholder="Longitude"
                               value="${this.config.location.lon}"
                               step="0.0001">
                        <button class="btn-secondary" onclick="weatherIntegration.detectLocation()">
                            <i class="fas fa-map-marker-alt"></i> Erkennen
                        </button>
                    </div>
                </div>
                
                <div class="weather-factors">
                    <h4>Wetter-Faktoren:</h4>
                    <ul>
                        <li><i class="fas fa-cloud-rain"></i> Leichter Regen: +20% Wartezeit</li>
                        <li><i class="fas fa-cloud-showers-heavy"></i> Starker Regen: +100% Wartezeit</li>
                        <li><i class="fas fa-temperature-low"></i> Kälte (<5°C): +30% Wartezeit</li>
                        <li><i class="fas fa-temperature-high"></i> Hitze (>30°C): +40% Wartezeit</li>
                        <li><i class="fas fa-wind"></i> Starker Wind: +20% Wartezeit</li>
                        <li><i class="fas fa-snowflake"></i> Schnee: +80% Wartezeit</li>
                    </ul>
                </div>
                
                <button class="btn-primary" onclick="weatherIntegration.saveSettingsFromUI()">
                    <i class="fas fa-save"></i> Einstellungen speichern
                </button>
                
                ${this.currentWeather ? `
                    <div class="current-weather-preview">
                        <h4>Aktuelles Wetter:</h4>
                        <div class="weather-preview-content">
                            <img src="https://openweathermap.org/img/wn/${this.currentWeather.icon}@2x.png" 
                                 alt="${this.currentWeather.description}">
                            <div>
                                <strong>${Math.round(this.currentWeather.temp)}°C</strong>
                                <p>${this.currentWeather.description}</p>
                                <p>Multiplikator: x${this.weatherMultiplier}</p>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Save settings from UI
    saveSettingsFromUI() {
        const settings = {
            enabled: document.getElementById('weatherEnabled').checked,
            apiKey: document.getElementById('weatherApiKey').value,
            location: {
                lat: parseFloat(document.getElementById('weatherLat').value),
                lon: parseFloat(document.getElementById('weatherLon').value)
            }
        };
        
        this.saveSettings(settings);
        this.showNotification('Wetter-Einstellungen gespeichert', 'success');
        
        if (settings.enabled && settings.apiKey) {
            this.fetchWeatherData();
        }
    }
    
    // Detect location
    detectLocation() {
        if (!navigator.geolocation) {
            this.showNotification('Geolocation wird nicht unterstützt', 'error');
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('weatherLat').value = position.coords.latitude.toFixed(4);
                document.getElementById('weatherLon').value = position.coords.longitude.toFixed(4);
                this.showNotification('Standort erkannt', 'success');
            },
            (error) => {
                this.showNotification('Standort konnte nicht ermittelt werden', 'error');
            }
        );
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `weather-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Get weather summary for display
    getWeatherSummary() {
        if (!this.currentWeather) return null;
        
        return {
            temp: Math.round(this.currentWeather.temp),
            description: this.currentWeather.description,
            icon: this.currentWeather.icon,
            multiplier: this.weatherMultiplier,
            impact: this.getImpactText()
        };
    }
}

// Initialize globally
window.weatherIntegration = new WeatherIntegration();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherIntegration;
}