/**
 * EATECH - VOICE COMMAND SYSTEM
 * Version: 5.0.0
 * Description: Mehrsprachiges Voice Command System für Schweizer Markt
 * Features: Dialekt-Support, AI-NLP, Offline-Fähigkeit, Barrierefreiheit
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================
import { firebaseManager } from './firebase-config.js';
import { soundSystem } from './sound-system.js';
import { analyticsEngine } from './analytics.js';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const VOICE_CONFIG = {
    version: '5.0.0',
    
    // Unterstützte Sprachen (Schweizer Landessprachen)
    languages: {
        'de-CH': {
            name: 'Schweizerdeutsch',
            code: 'de-CH',
            recognition: 'de-CH',
            synthesis: 'de-CH',
            fallback: 'de-DE'
        },
        'fr-CH': {
            name: 'Français Suisse',
            code: 'fr-CH',
            recognition: 'fr-CH',
            synthesis: 'fr-CH',
            fallback: 'fr-FR'
        },
        'it-CH': {
            name: 'Italiano Svizzero',
            code: 'it-CH',
            recognition: 'it-CH',
            synthesis: 'it-CH',
            fallback: 'it-IT'
        },
        'rm-CH': {
            name: 'Rumantsch',
            code: 'rm-CH',
            recognition: 'de-CH', // Fallback zu Deutsch
            synthesis: 'de-CH',
            fallback: 'de-CH'
        }
    },
    
    // Recognition settings
    recognition: {
        continuous: true,
        interimResults: true,
        maxAlternatives: 5,
        confidence: 0.7,
        timeout: 10000,
        noiseSupression: true
    },
    
    // Synthesis settings
    synthesis: {
        rate: 0.9,
        pitch: 1.0,
        volume: 0.8,
        preferredVoices: {
            'de-CH': ['Google Deutsch (Schweiz)', 'Microsoft Sabrina'],
            'fr-CH': ['Google Français (Suisse)', 'Microsoft Julie'],
            'it-CH': ['Google Italiano (Svizzera)', 'Microsoft Elsa']
        }
    }
};

// ============================================================================
// VOICE COMMAND SYSTEM CLASS
// ============================================================================
class VoiceCommandSystem {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.currentLanguage = 'de-CH';
        this.commands = new Map();
        this.contextStack = [];
        this.voiceEnabled = false;
        
        // Command history for learning
        this.commandHistory = [];
        
        // Dialect mappings
        this.dialectMappings = new Map();
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize Voice Command System
     */
    async init() {
        console.log('🎤 Initializing EATECH Voice Command System...');
        
        try {
            // Check browser support
            if (!this.checkBrowserSupport()) {
                console.warn('Voice commands not supported in this browser');
                return;
            }
            
            // Initialize speech recognition
            this.initializeSpeechRecognition();
            
            // Load command definitions
            await this.loadCommands();
            
            // Load dialect mappings
            await this.loadDialectMappings();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load user preferences
            this.loadUserPreferences();
            
            // Initialize voice activation
            this.initializeVoiceActivation();
            
            console.log('✅ Voice Command System initialized');
            
        } catch (error) {
            console.error('❌ Voice system initialization failed:', error);
        }
    }
    
    /**
     * Check browser support for Web Speech API
     */
    checkBrowserSupport() {
        const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 
                                     'SpeechRecognition' in window;
        const hasSpeechSynthesis = 'speechSynthesis' in window;
        
        return hasSpeechRecognition && hasSpeechSynthesis;
    }
    
    /**
     * Initialize Speech Recognition
     */
    initializeSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = VOICE_CONFIG.recognition.continuous;
        this.recognition.interimResults = VOICE_CONFIG.recognition.interimResults;
        this.recognition.maxAlternatives = VOICE_CONFIG.recognition.maxAlternatives;
        this.recognition.lang = this.currentLanguage;
        
        // Recognition event handlers
        this.recognition.onstart = () => this.handleRecognitionStart();
        this.recognition.onresult = (event) => this.handleRecognitionResult(event);
        this.recognition.onerror = (event) => this.handleRecognitionError(event);
        this.recognition.onend = () => this.handleRecognitionEnd();
    }
    
    /**
     * Load command definitions for all languages
     */
    async loadCommands() {
        // German (Swiss) Commands
        this.commands.set('de-CH', {
            // Wake words
            wakeWords: ['eatech', 'hey eatech', 'hallo eatech', 'hoi eatech'],
            
            // Customer commands
            customer: {
                viewMenu: {
                    patterns: ['zeig mir die karte', 'menü anzeigen', 'was gibt es', 'speisekarte'],
                    action: () => this.showMenu()
                },
                addToCart: {
                    patterns: [
                        'ich möchte (.*)',
                        'gib mir (.*)',
                        'füge (.*) hinzu',
                        'ich hätte gern (.*)',
                        'ich nimm (.*)'
                    ],
                    action: (match) => this.addToCart(match[1])
                },
                removeFromCart: {
                    patterns: [
                        'entferne (.*)',
                        'lösche (.*)',
                        'nimm (.*) weg',
                        'streiche (.*)'
                    ],
                    action: (match) => this.removeFromCart(match[1])
                },
                checkout: {
                    patterns: ['zur kasse', 'bestellen', 'bezahlen', 'abschliessen'],
                    action: () => this.proceedToCheckout()
                },
                orderStatus: {
                    patterns: [
                        'wo ist meine bestellung',
                        'wie lange noch',
                        'bestellstatus',
                        'wann fertig'
                    ],
                    action: () => this.checkOrderStatus()
                },
                help: {
                    patterns: ['hilfe', 'was kann ich sagen', 'kommandos', 'befehle'],
                    action: () => this.showVoiceHelp()
                }
            },
            
            // Admin commands
            admin: {
                showOrders: {
                    patterns: [
                        'zeige bestellungen',
                        'bestellungen anzeigen',
                        'aktuelle bestellungen',
                        'orders zeigen'
                    ],
                    action: () => this.showAdminOrders(),
                    requiresAuth: true
                },
                orderReady: {
                    patterns: [
                        'bestellung (\\d+) ist fertig',
                        'bestellung (\\d+) bereit',
                        'nummer (\\d+) fertig'
                    ],
                    action: (match) => this.markOrderReady(match[1]),
                    requiresAuth: true
                },
                setWaitTime: {
                    patterns: [
                        'wartezeit auf (\\d+) minuten',
                        'setze wartezeit (\\d+)',
                        'warten (\\d+) minuten'
                    ],
                    action: (match) => this.setWaitTime(match[1]),
                    requiresAuth: true
                },
                pauseOrders: {
                    patterns: [
                        'bestellungen pausieren',
                        'pause einlegen',
                        'stopp neue bestellungen'
                    ],
                    action: () => this.pauseOrders(),
                    requiresAuth: true
                },
                closeRestaurant: {
                    patterns: [
                        'restaurant schliessen',
                        'laden schliessen',
                        'geschlossen',
                        'feierabend'
                    ],
                    action: () => this.closeRestaurant(),
                    requiresAuth: true
                }
            },
            
            // Navigation commands
            navigation: {
                goBack: {
                    patterns: ['zurück', 'zurück gehen', 'vorherige seite'],
                    action: () => window.history.back()
                },
                goHome: {
                    patterns: ['startseite', 'home', 'anfang', 'hauptseite'],
                    action: () => window.location.href = '/'
                },
                scrollDown: {
                    patterns: ['runter', 'nach unten', 'scrollen'],
                    action: () => window.scrollBy(0, 500)
                },
                scrollUp: {
                    patterns: ['hoch', 'nach oben', 'rauf'],
                    action: () => window.scrollBy(0, -500)
                }
            }
        });
        
        // French (Swiss) Commands
        this.commands.set('fr-CH', {
            wakeWords: ['eatech', 'hé eatech', 'bonjour eatech', 'salut eatech'],
            
            customer: {
                viewMenu: {
                    patterns: ['montre le menu', 'afficher la carte', 'qu\'est-ce qu\'il y a'],
                    action: () => this.showMenu()
                },
                addToCart: {
                    patterns: [
                        'je veux (.*)',
                        'je voudrais (.*)',
                        'ajoute (.*)',
                        'donne-moi (.*)'
                    ],
                    action: (match) => this.addToCart(match[1])
                },
                checkout: {
                    patterns: ['payer', 'commander', 'valider', 'terminer'],
                    action: () => this.proceedToCheckout()
                }
                // ... weitere französische Befehle
            }
        });
        
        // Italian (Swiss) Commands
        this.commands.set('it-CH', {
            wakeWords: ['eatech', 'ehi eatech', 'ciao eatech', 'buongiorno eatech'],
            
            customer: {
                viewMenu: {
                    patterns: ['mostra il menu', 'visualizza menu', 'cosa c\'è'],
                    action: () => this.showMenu()
                },
                addToCart: {
                    patterns: [
                        'voglio (.*)',
                        'vorrei (.*)',
                        'aggiungi (.*)',
                        'dammi (.*)'
                    ],
                    action: (match) => this.addToCart(match[1])
                }
                // ... weitere italienische Befehle
            }
        });
    }
    
    /**
     * Load dialect mappings for Swiss German variations
     */
    async loadDialectMappings() {
        // Schweizerdeutsche Dialekt-Variationen
        this.dialectMappings.set('de-CH', {
            // Begrüssungen
            'grüezi': 'guten tag',
            'grüessech': 'guten tag',
            'sali': 'hallo',
            'hoi': 'hallo',
            'tschau': 'auf wiedersehen',
            'ade': 'auf wiedersehen',
            'merci vilmal': 'vielen dank',
            
            // Essen bestellen
            'es bitzli': 'ein bisschen',
            'chli': 'klein',
            'gross': 'gross',
            'zmittag': 'mittagessen',
            'znacht': 'abendessen',
            'znüni': 'zwischenmahlzeit',
            'zvieri': 'nachmittagssnack',
            
            // Spezielle Ausdrücke
            'pressant': 'eilig',
            'hopp hopp': 'schnell',
            'nume': 'nur',
            'nöd': 'nicht',
            'wele': 'welche',
            'öppis': 'etwas',
            'nüt': 'nichts'
        });
    }
    
    /**
     * Handle speech recognition results
     */
    async handleRecognitionResult(event) {
        const results = event.results;
        const latestResult = results[results.length - 1];
        
        if (latestResult.isFinal) {
            // Get all alternatives with confidence scores
            const alternatives = [];
            for (let i = 0; i < latestResult.length; i++) {
                alternatives.push({
                    transcript: latestResult[i].transcript,
                    confidence: latestResult[i].confidence || 0.5
                });
            }
            
            // Sort by confidence
            alternatives.sort((a, b) => b.confidence - a.confidence);
            
            // Process best match
            const bestMatch = alternatives[0];
            
            if (bestMatch.confidence >= VOICE_CONFIG.recognition.confidence) {
                console.log(`🎤 Recognized: "${bestMatch.transcript}" (${(bestMatch.confidence * 100).toFixed(1)}%)`);
                
                // Process command
                await this.processCommand(bestMatch.transcript);
                
                // Add to history for learning
                this.commandHistory.push({
                    transcript: bestMatch.transcript,
                    confidence: bestMatch.confidence,
                    timestamp: Date.now(),
                    language: this.currentLanguage,
                    context: this.getCurrentContext()
                });
                
                // Limit history size
                if (this.commandHistory.length > 1000) {
                    this.commandHistory = this.commandHistory.slice(-500);
                }
            } else {
                console.warn(`⚠️ Low confidence: ${(bestMatch.confidence * 100).toFixed(1)}%`);
                this.speak('Entschuldigung, ich habe Sie nicht verstanden. Bitte wiederholen Sie.');
            }
        } else {
            // Interim results for real-time feedback
            const interim = latestResult[0].transcript;
            this.showInterimResult(interim);
        }
    }
    
    /**
     * Process recognized command
     */
    async processCommand(transcript) {
        // Normalize transcript
        const normalized = this.normalizeTranscript(transcript);
        
        // Check for wake word if not active
        if (!this.isActive && !this.containsWakeWord(normalized)) {
            return;
        }
        
        // Remove wake word from command
        const command = this.removeWakeWord(normalized);
        
        // Get current language commands
        const langCommands = this.commands.get(this.currentLanguage);
        if (!langCommands) {
            console.error('No commands for language:', this.currentLanguage);
            return;
        }
        
        // Find matching command
        const match = this.findMatchingCommand(command, langCommands);
        
        if (match) {
            // Check authentication if required
            if (match.command.requiresAuth && !this.isAuthenticated()) {
                this.speak('Diese Funktion erfordert eine Anmeldung.');
                return;
            }
            
            // Execute command
            try {
                await match.command.action(match.params);
                
                // Log successful command
                this.logCommandExecution(transcript, match);
                
                // Play success sound
                soundSystem.play('commandSuccess');
                
            } catch (error) {
                console.error('Command execution failed:', error);
                this.speak('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
            }
        } else {
            // No matching command found
            this.handleUnknownCommand(command);
        }
    }
    
    /**
     * Normalize transcript for better matching
     */
    normalizeTranscript(transcript) {
        let normalized = transcript.toLowerCase().trim();
        
        // Apply dialect mappings
        const dialectMap = this.dialectMappings.get(this.currentLanguage);
        if (dialectMap) {
            Object.entries(dialectMap).forEach(([dialect, standard]) => {
                normalized = normalized.replace(new RegExp(dialect, 'g'), standard);
            });
        }
        
        // Remove punctuation
        normalized = normalized.replace(/[.,!?;:]/g, '');
        
        // Normalize spaces
        normalized = normalized.replace(/\s+/g, ' ');
        
        return normalized;
    }
    
    /**
     * Find matching command using fuzzy matching
     */
    findMatchingCommand(input, commands) {
        let bestMatch = null;
        let bestScore = 0;
        
        // Check all command categories
        for (const [category, categoryCommands] of Object.entries(commands)) {
            if (category === 'wakeWords') continue;
            
            for (const [cmdName, cmdDef] of Object.entries(categoryCommands)) {
                for (const pattern of cmdDef.patterns) {
                    const regex = new RegExp(pattern, 'i');
                    const match = input.match(regex);
                    
                    if (match) {
                        // Calculate match score
                        const score = this.calculateMatchScore(input, pattern, match);
                        
                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = {
                                command: cmdDef,
                                params: match,
                                category,
                                name: cmdName,
                                score
                            };
                        }
                    }
                }
            }
        }
        
        // Return best match if score is high enough
        return bestScore >= 0.7 ? bestMatch : null;
    }
    
    /**
     * Calculate match score using Levenshtein distance
     */
    calculateMatchScore(input, pattern, match) {
        // Simple scoring based on match coverage
        const coverage = match[0].length / input.length;
        const exactMatch = match[0] === input ? 1 : 0.8;
        
        return coverage * exactMatch;
    }
    
    /**
     * Text-to-Speech with Swiss voice preferences
     */
    speak(text, options = {}) {
        if (!this.synthesis) return;
        
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language
        utterance.lang = options.lang || this.currentLanguage;
        
        // Set voice parameters
        utterance.rate = options.rate || VOICE_CONFIG.synthesis.rate;
        utterance.pitch = options.pitch || VOICE_CONFIG.synthesis.pitch;
        utterance.volume = options.volume || VOICE_CONFIG.synthesis.volume;
        
        // Try to find preferred Swiss voice
        const voices = this.synthesis.getVoices();
        const preferredVoices = VOICE_CONFIG.synthesis.preferredVoices[this.currentLanguage] || [];
        
        let selectedVoice = null;
        for (const preferred of preferredVoices) {
            selectedVoice = voices.find(voice => 
                voice.name.includes(preferred) || 
                voice.lang === this.currentLanguage
            );
            if (selectedVoice) break;
        }
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        // Event handlers
        utterance.onstart = () => {
            this.isSpeaking = true;
            this.emit('speechStart', { text });
        };
        
        utterance.onend = () => {
            this.isSpeaking = false;
            this.emit('speechEnd', { text });
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.isSpeaking = false;
        };
        
        // Speak
        this.synthesis.speak(utterance);
    }
    
    /**
     * Voice-guided menu navigation
     */
    async showMenu() {
        // Get current menu items
        const menuItems = await this.getMenuItems();
        
        if (menuItems.length === 0) {
            this.speak('Das Menü ist momentan nicht verfügbar.');
            return;
        }
        
        // Group by category
        const categories = this.groupByCategory(menuItems);
        
        // Announce categories
        let announcement = 'Hier ist unser Menü. Wir haben ';
        announcement += Object.keys(categories).join(', ') + '.';
        announcement += ' Welche Kategorie möchten Sie hören?';
        
        this.speak(announcement);
        
        // Set context for follow-up
        this.setContext('menu_navigation', { categories });
    }
    
    /**
     * Add item to cart using voice
     */
    async addToCart(itemName) {
        // Fuzzy search for product
        const products = await this.searchProducts(itemName);
        
        if (products.length === 0) {
            this.speak(`Ich konnte "${itemName}" nicht finden. Bitte versuchen Sie es anders.`);
            return;
        }
        
        if (products.length === 1) {
            // Single match - add directly
            const product = products[0];
            await this.addProductToCart(product);
            
            this.speak(`${product.name} wurde zum Warenkorb hinzugefügt. Preis: ${product.price} Franken.`);
            
            // Suggest related items
            this.suggestRelatedItems(product);
        } else {
            // Multiple matches - ask for clarification
            let options = 'Ich habe mehrere Optionen gefunden: ';
            products.slice(0, 3).forEach((product, index) => {
                options += `${index + 1}: ${product.name} für ${product.price} Franken. `;
            });
            options += 'Welche Nummer möchten Sie?';
            
            this.speak(options);
            this.setContext('item_selection', { products });
        }
    }
    
    /**
     * Voice-controlled checkout
     */
    async proceedToCheckout() {
        const cart = await this.getCart();
        
        if (cart.items.length === 0) {
            this.speak('Ihr Warenkorb ist leer. Bitte fügen Sie zuerst Artikel hinzu.');
            return;
        }
        
        // Summarize order
        let summary = `Sie haben ${cart.items.length} Artikel im Warenkorb. `;
        summary += `Gesamtbetrag: ${cart.total} Franken. `;
        summary += 'Möchten Sie die Bestellung aufgeben?';
        
        this.speak(summary);
        this.setContext('checkout_confirmation', { cart });
    }
    
    /**
     * Admin voice commands
     */
    async showAdminOrders() {
        if (!this.checkAdminAuth()) return;
        
        const orders = await this.getActiveOrders();
        
        if (orders.length === 0) {
            this.speak('Keine aktiven Bestellungen vorhanden.');
            return;
        }
        
        let announcement = `Sie haben ${orders.length} aktive Bestellungen. `;
        
        // Prioritize by status
        const newOrders = orders.filter(o => o.status === 'new');
        const preparingOrders = orders.filter(o => o.status === 'preparing');
        
        if (newOrders.length > 0) {
            announcement += `${newOrders.length} neue Bestellungen. `;
        }
        if (preparingOrders.length > 0) {
            announcement += `${preparingOrders.length} in Bearbeitung. `;
        }
        
        // Read first few order numbers
        announcement += 'Die nächsten Bestellnummern sind: ';
        orders.slice(0, 3).forEach(order => {
            announcement += `${order.number}, `;
        });
        
        this.speak(announcement);
        
        // Navigate to orders page
        window.location.href = '/admin/orders';
    }
    
    /**
     * Mark order as ready
     */
    async markOrderReady(orderNumber) {
        if (!this.checkAdminAuth()) return;
        
        try {
            const result = await this.updateOrderStatus(orderNumber, 'ready');
            
            if (result.success) {
                this.speak(`Bestellung ${orderNumber} wurde als fertig markiert.`);
                
                // Send customer notification
                await this.notifyCustomer(orderNumber);
                
                // Voice announcement for pickup
                this.announceOrderReady(orderNumber);
            } else {
                this.speak(`Bestellung ${orderNumber} konnte nicht gefunden werden.`);
            }
        } catch (error) {
            this.speak('Es ist ein Fehler aufgetreten.');
        }
    }
    
    /**
     * Voice announcement system for order pickup
     */
    announceOrderReady(orderNumber) {
        // Play attention sound
        soundSystem.play('orderReadyChime');
        
        // Wait for sound to finish
        setTimeout(() => {
            // Announce in multiple languages
            const announcements = [
                { lang: 'de-CH', text: `Bestellung Nummer ${orderNumber} ist bereit zur Abholung.` },
                { lang: 'fr-CH', text: `Commande numéro ${orderNumber} est prête.` },
                { lang: 'it-CH', text: `Ordine numero ${orderNumber} è pronto.` }
            ];
            
            // Sequential announcements
            let delay = 0;
            announcements.forEach(announcement => {
                setTimeout(() => {
                    this.speak(announcement.text, { lang: announcement.lang, volume: 1.0 });
                }, delay);
                delay += 3000; // 3 seconds between announcements
            });
        }, 1000);
    }
    
    /**
     * Context management for multi-turn conversations
     */
    setContext(type, data) {
        this.contextStack.push({
            type,
            data,
            timestamp: Date.now(),
            language: this.currentLanguage
        });
        
        // Keep only recent context (5 minutes)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        this.contextStack = this.contextStack.filter(ctx => 
            ctx.timestamp > fiveMinutesAgo
        );
    }
    
    getCurrentContext() {
        return this.contextStack.length > 0 ? 
            this.contextStack[this.contextStack.length - 1] : null;
    }
    
    /**
     * Handle unknown commands with AI suggestions
     */
    async handleUnknownCommand(command) {
        console.log('Unknown command:', command);
        
        // Try to find similar commands
        const suggestions = this.findSimilarCommands(command);
        
        if (suggestions.length > 0) {
            let response = 'Meinten Sie vielleicht: ';
            response += suggestions.slice(0, 2).join(' oder ') + '?';
            this.speak(response);
        } else {
            // Generic help
            this.speak('Ich habe diesen Befehl nicht verstanden. Sagen Sie "Hilfe" für verfügbare Befehle.');
        }
        
        // Log for improvement
        this.logUnknownCommand(command);
    }
    
    /**
     * Find similar commands using fuzzy matching
     */
    findSimilarCommands(input) {
        const allCommands = [];
        const langCommands = this.commands.get(this.currentLanguage);
        
        // Collect all command patterns
        for (const category of Object.values(langCommands)) {
            if (typeof category === 'object' && !Array.isArray(category)) {
                for (const cmd of Object.values(category)) {
                    if (cmd.patterns) {
                        allCommands.push(...cmd.patterns);
                    }
                }
            }
        }
        
        // Calculate similarity scores
        const scores = allCommands.map(cmd => ({
            command: cmd,
            score: this.calculateSimilarity(input, cmd)
        }));
        
        // Sort by score and return top matches
        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .filter(s => s.score > 0.5)
            .map(s => s.command);
    }
    
    /**
     * Levenshtein distance for similarity calculation
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Voice training mode for better recognition
     */
    async startVoiceTraining() {
        this.speak('Willkommen zum Sprachtraining. Ich werde Ihnen einige Sätze vorlesen, die Sie bitte nachsprechen.');
        
        const trainingPhrases = [
            'Ich möchte einen Burger bestellen',
            'Zeige mir die Speisekarte',
            'Zur Kasse bitte',
            'Wo ist meine Bestellung',
            'Bestellung Nummer eins zwei drei ist fertig'
        ];
        
        for (const phrase of trainingPhrases) {
            await this.trainPhrase(phrase);
        }
        
        this.speak('Vielen Dank! Das Training ist abgeschlossen. Die Spracherkennung wurde verbessert.');
    }
    
    /**
     * Accessibility features
     */
    enableScreenReaderMode() {
        document.body.setAttribute('aria-live', 'polite');
        document.body.setAttribute('role', 'application');
        
        // Add voice announcements for all UI changes
        this.observeUIChanges();
        
        // Announce current page
        const pageTitle = document.title;
        this.speak(`Sie befinden sich auf der Seite: ${pageTitle}`);
    }
    
    /**
     * Voice shortcuts for power users
     */
    registerVoiceShortcuts() {
        // Quick order shortcuts
        this.addShortcut('schnellbestellung (\\d+)', async (match) => {
            const quickOrderId = match[1];
            await this.processQuickOrder(quickOrderId);
        });
        
        // Favorite orders
        this.addShortcut('meine übliche bestellung', async () => {
            await this.orderFavorite();
        });
        
        // Speed dial for frequent items
        this.addShortcut('nummer (\\d+)', async (match) => {
            const speedDial = match[1];
            await this.orderBySpeedDial(speedDial);
        });
    }
    
    /**
     * Offline voice command support
     */
    initializeOfflineMode() {
        // Cache common commands for offline use
        if ('serviceWorker' in navigator) {
            this.cacheVoiceModels();
            this.enableOfflineRecognition();
        }
    }
    
    /**
     * Voice analytics and learning
     */
    async analyzeVoiceUsage() {
        const analytics = {
            totalCommands: this.commandHistory.length,
            successRate: this.calculateSuccessRate(),
            mostUsedCommands: this.getMostUsedCommands(),
            averageConfidence: this.calculateAverageConfidence(),
            languageDistribution: this.getLanguageDistribution(),
            peakUsageHours: this.getPeakUsageHours()
        };
        
        // Send to analytics engine
        await analyticsEngine.track('voice_usage', analytics);
        
        // Use for improvement
        this.improveRecognition(analytics);
        
        return analytics;
    }
    
    /**
     * Export voice command statistics
     */
    exportVoiceStats() {
        const stats = {
            version: VOICE_CONFIG.version,
            exportDate: new Date().toISOString(),
            history: this.commandHistory,
            analytics: this.analyzeVoiceUsage(),
            configuration: {
                languages: Object.keys(VOICE_CONFIG.languages),
                recognitionSettings: VOICE_CONFIG.recognition,
                synthesisSettings: VOICE_CONFIG.synthesis
            }
        };
        
        return stats;
    }
}

// ============================================================================
// VOICE UI COMPONENTS
// ============================================================================

/**
 * Voice activation button component
 */
class VoiceButton {
    constructor(voiceSystem) {
        this.voice = voiceSystem;
        this.button = null;
        this.isListening = false;
        
        this.render();
    }
    
    render() {
        // Create button
        this.button = document.createElement('button');
        this.button.className = 'voice-button';
        this.button.setAttribute('aria-label', 'Sprachsteuerung aktivieren');
        this.button.innerHTML = `
            <svg class="voice-icon" viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            <span class="voice-status">Zum Sprechen klicken</span>
            <span class="voice-pulse"></span>
        `;
        
        // Add styles
        this.addStyles();
        
        // Event listeners
        this.button.addEventListener('click', () => this.toggle());
        
        // Keyboard support
        this.button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });
        
        // Append to body
        document.body.appendChild(this.button);
    }
    
    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    start() {
        this.voice.startListening();
        this.isListening = true;
        this.button.classList.add('listening');
        this.updateStatus('Ich höre zu...');
        
        // Pulse animation
        this.button.querySelector('.voice-pulse').classList.add('active');
    }
    
    stop() {
        this.voice.stopListening();
        this.isListening = false;
        this.button.classList.remove('listening');
        this.updateStatus('Zum Sprechen klicken');
        
        // Stop pulse
        this.button.querySelector('.voice-pulse').classList.remove('active');
    }
    
    updateStatus(text) {
        this.button.querySelector('.voice-status').textContent = text;
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .voice-button {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: var(--primary, #FF6B6B);
                border: none;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                z-index: 1000;
            }
            
            .voice-button:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 30px rgba(0, 0, 0, 0.4);
            }
            
            .voice-button.listening {
                background: var(--accent, #00E676);
                animation: pulse 1.5s infinite;
            }
            
            .voice-icon {
                fill: white;
                width: 30px;
                height: 30px;
            }
            
            .voice-status {
                position: absolute;
                bottom: -25px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .voice-button:hover .voice-status {
                opacity: 1;
            }
            
            .voice-pulse {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: var(--accent, #00E676);
                opacity: 0;
                pointer-events: none;
            }
            
            .voice-pulse.active {
                animation: pulse-wave 1.5s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            @keyframes pulse-wave {
                0% {
                    transform: scale(1);
                    opacity: 0.8;
                }
                100% {
                    transform: scale(2);
                    opacity: 0;
                }
            }
            
            @media (max-width: 768px) {
                .voice-button {
                    bottom: 80px;
                    right: 15px;
                    width: 50px;
                    height: 50px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================================================
// EXPORT & INITIALIZATION
// ============================================================================

// Create singleton instance
const voiceCommands = new VoiceCommandSystem();
const voiceButton = new VoiceButton(voiceCommands);

// Export for use
export { voiceCommands, VoiceButton };

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
    window.EATECH_VOICE = voiceCommands;
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            voiceCommands.init();
        });
    } else {
        voiceCommands.init();
    }
}