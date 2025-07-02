// ============================================================================
// EATECH - AI PRODUCT DESCRIPTIONS
// Version: 1.0.0
// Description: AI-gestützte Generierung von Produktbeschreibungen
// Features: Multiple Tones, Auto-Generation, Image Search
// ============================================================================

class AIProductManager {
    constructor() {
        this.currentProductId = null;
        this.generatedDescription = '';
        this.tenantId = this.getTenantId();
        
        // AI Description Templates based on tone
        this.templates = {
            professional: {
                prefix: ['Genießen Sie', 'Entdecken Sie', 'Probieren Sie'],
                adjectives: ['hochwertige', 'ausgewählte', 'erstklassige', 'exquisite'],
                endings: ['Perfekt zubereitet nach traditioneller Art.', 'Ein kulinarisches Erlebnis der besonderen Art.']
            },
            casual: {
                prefix: ['Gönn dir', 'Hol dir', 'Check mal'],
                adjectives: ['leckere', 'super', 'mega', 'richtig gute'],
                endings: ['Einfach lecker!', 'Da läuft dir das Wasser im Mund zusammen!']
            },
            enthusiastic: {
                prefix: ['WOW!', 'Unglaublich!', 'Sensationell!'],
                adjectives: ['fantastische', 'unwiderstehliche', 'himmlische', 'traumhafte'],
                endings: ['Ein absolutes MUSS!', 'Du wirst es LIEBEN!']
            },
            gourmet: {
                prefix: ['Eine Komposition aus', 'Ein Arrangement von', 'Eine Symphonie aus'],
                adjectives: ['erlesenen', 'raffinierten', 'delikaten', 'aromatischen'],
                endings: ['Für wahre Genießer.', 'Ein Gaumenschmaus der Extraklasse.']
            }
        };
        
        // Ingredient descriptions
        this.ingredientDescriptions = {
            'käse': 'schmelzendem Käse',
            'mozzarella': 'cremigem Mozzarella',
            'tomaten': 'sonnengereiften Tomaten',
            'salami': 'würziger Salami',
            'schinken': 'saftigem Schinken',
            'pilze': 'frischen Champignons',
            'paprika': 'knackiger Paprika',
            'zwiebeln': 'aromatischen Zwiebeln',
            'oliven': 'mediterranen Oliven',
            'basilikum': 'duftendem Basilikum',
            'rindfleisch': 'zartem Rindfleisch',
            'hähnchen': 'saftigem Hähnchen',
            'garnelen': 'delikaten Garnelen',
            'lachs': 'frischem Lachs',
            'rucola': 'pfeffrigem Rucola',
            'spinat': 'frischem Spinat',
            'knoblauch': 'aromatischem Knoblauch',
            'chili': 'feurigem Chili',
            'pesto': 'hausgemachtem Pesto',
            'sahne': 'feiner Sahnesauce'
        };
    }
    
    // Get tenant ID
    getTenantId() {
        const subdomain = window.location.hostname.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'eatech') {
            return subdomain;
        }
        return localStorage.getItem('tenantId') || 'default';
    }
    
    // Generate description
    async generateDescription() {
        const productId = document.getElementById('aiProduct').value;
        const tone = document.getElementById('aiTone').value;
        
        if (!productId) {
            window.cmsManager.showToast('Bitte ein Produkt auswählen', 'error');
            return;
        }
        
        try {
            // Get product details
            const snapshot = await database.ref(`tenants/${this.tenantId}/products/${productId}`).once('value');
            const product = snapshot.val();
            
            if (!product) {
                window.cmsManager.showToast('Produkt nicht gefunden', 'error');
                return;
            }
            
            this.currentProductId = productId;
            
            // Generate description based on tone
            this.generatedDescription = this.createDescription(product, tone);
            
            // Show result
            document.getElementById('aiResult').style.display = 'block';
            document.getElementById('aiDescription').textContent = this.generatedDescription;
            
            // Auto-search for image if enabled
            if (window.settingsManager?.settings?.features?.aiImages) {
                this.searchProductImage(product.name);
            }
            
        } catch (error) {
            console.error('Error generating description:', error);
            window.cmsManager.showToast('Fehler beim Generieren', 'error');
        }
    }
    
    // Create description based on tone
    createDescription(product, tone) {
        const template = this.templates[tone];
        const prefix = this.randomChoice(template.prefix);
        const adjective = this.randomChoice(template.adjectives);
        const ending = this.randomChoice(template.endings);
        
        // Parse ingredients if available
        let ingredientsList = '';
        if (product.ingredients) {
            const ingredients = product.ingredients.toLowerCase().split(',').map(i => i.trim());
            const describedIngredients = ingredients.map(ing => {
                // Check if we have a description for this ingredient
                for (const [key, desc] of Object.entries(this.ingredientDescriptions)) {
                    if (ing.includes(key)) {
                        return desc;
                    }
                }
                return ing;
            });
            
            if (describedIngredients.length > 0) {
                ingredientsList = ' mit ' + this.formatList(describedIngredients);
            }
        }
        
        // Build description
        let description = `${prefix} ${this.articleFor(adjective)} ${adjective} ${product.name}`;
        
        if (ingredientsList) {
            description += ingredientsList;
        }
        
        description += `. ${ending}`;
        
        // Add category-specific phrases
        if (product.category) {
            description += ' ' + this.getCategoryPhrase(product.category, tone);
        }
        
        return description;
    }
    
    // Get article for adjective (der/die/das)
    articleFor(adjective) {
        // Simple heuristic - in real app would use proper grammar rules
        if (adjective.endsWith('e')) return 'unsere';
        if (adjective.endsWith('es')) return 'unser';
        return 'unser';
    }
    
    // Format list with proper German grammar
    formatList(items) {
        if (items.length === 0) return '';
        if (items.length === 1) return items[0];
        if (items.length === 2) return `${items[0]} und ${items[1]}`;
        
        const lastItem = items.pop();
        return `${items.join(', ')} und ${lastItem}`;
    }
    
    // Get category-specific phrase
    getCategoryPhrase(category, tone) {
        const phrases = {
            professional: {
                'Pizza': 'Frisch aus unserem Steinofen.',
                'Pasta': 'Nach original italienischem Rezept.',
                'Burger': 'Mit hausgemachten Buns.',
                'Salat': 'Knackfrisch und vitaminreich.',
                'Dessert': 'Der perfekte Abschluss.',
                'Getränke': 'Erfrischend gekühlt.'
            },
            casual: {
                'Pizza': 'Heiß und knusprig!',
                'Pasta': 'Wie bei Nonna!',
                'Burger': 'Richtig saftig!',
                'Salat': 'Gesund und lecker!',
                'Dessert': 'Süße Versuchung!',
                'Getränke': 'Eisgekühlt!'
            },
            enthusiastic: {
                'Pizza': 'Die BESTE Pizza ever!',
                'Pasta': 'Pasta-Himmel pur!',
                'Burger': 'Burger-WAHNSINN!',
                'Salat': 'Vitamin-BOMBE!',
                'Dessert': 'Süßer geht\'s nicht!',
                'Getränke': 'Durst? GELÖSCHT!'
            },
            gourmet: {
                'Pizza': 'Eine italienische Delikatesse.',
                'Pasta': 'Al dente perfezioniert.',
                'Burger': 'Handwerklich vollendet.',
                'Salat': 'Eine leichte Köstlichkeit.',
                'Dessert': 'Eine süße Verführung.',
                'Getränke': 'Prickelnd temperiert.'
            }
        };
        
        return phrases[tone]?.[category] || '';
    }
    
    // Random choice from array
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    // Apply AI description to product
    async applyAiDescription() {
        if (!this.currentProductId || !this.generatedDescription) return;
        
        try {
            await database.ref(`tenants/${this.tenantId}/products/${this.currentProductId}/description`)
                .set(this.generatedDescription);
            
            window.cmsManager.showToast('Beschreibung übernommen', 'success');
            
            // Hide result
            document.getElementById('aiResult').style.display = 'none';
            
        } catch (error) {
            console.error('Error applying description:', error);
            window.cmsManager.showToast('Fehler beim Übernehmen', 'error');
        }
    }
    
    // Regenerate description
    regenerateDescription() {
        this.generateDescription();
    }
    
    // Search for product image using Unsplash API
    async searchProductImage(productName) {
        // For demo purposes - in production use real API
        const searchTerm = this.getImageSearchTerm(productName);
        
        try {
            // This would call Unsplash API in production
            // For now, generate placeholder URL
            const imageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(searchTerm)}`;
            
            // Show image preview
            this.showImagePreview(imageUrl);
            
        } catch (error) {
            console.error('Error searching image:', error);
        }
    }
    
    // Get search term for image
    getImageSearchTerm(productName) {
        // Remove common German food words for better search results
        const cleanName = productName
            .toLowerCase()
            .replace(/pizza|pasta|burger|salat|suppe/gi, '')
            .trim();
        
        // Map to English for better results
        const translations = {
            'margherita': 'margherita pizza',
            'hawaii': 'hawaiian pizza',
            'salami': 'pepperoni pizza',
            'funghi': 'mushroom pizza',
            'carbonara': 'pasta carbonara',
            'bolognese': 'spaghetti bolognese',
            'lasagne': 'lasagna',
            'caesar': 'caesar salad',
            'griechisch': 'greek salad',
            'pommes': 'french fries',
            'nuggets': 'chicken nuggets',
            'tiramisu': 'tiramisu dessert',
            'panna cotta': 'panna cotta',
            'cola': 'coca cola',
            'fanta': 'orange soda',
            'sprite': 'lemon soda'
        };
        
        // Check if we have a translation
        for (const [key, value] of Object.entries(translations)) {
            if (productName.toLowerCase().includes(key)) {
                return value;
            }
        }
        
        // Default: use product name + "food"
        return cleanName + ' food';
    }
    
    // Show image preview
    showImagePreview(imageUrl) {
        const resultDiv = document.getElementById('aiResult');
        
        // Add image preview if not exists
        let imagePreview = document.getElementById('aiImagePreview');
        if (!imagePreview) {
            imagePreview = document.createElement('div');
            imagePreview.id = 'aiImagePreview';
            imagePreview.className = 'ai-image-preview';
            resultDiv.appendChild(imagePreview);
        }
        
        imagePreview.innerHTML = `
            <h4>Gefundenes Bild:</h4>
            <img src="${imageUrl}" alt="Produktbild">
            <div class="image-actions">
                <button onclick="aiProductManager.applyImage('${imageUrl}')" class="btn-apply">
                    <i class="fas fa-check"></i> Bild übernehmen
                </button>
                <button onclick="aiProductManager.searchNewImage()" class="btn-regenerate">
                    <i class="fas fa-redo"></i> Neues Bild suchen
                </button>
            </div>
        `;
    }
    
    // Apply image to product
    async applyImage(imageUrl) {
        if (!this.currentProductId) return;
        
        try {
            await database.ref(`tenants/${this.tenantId}/products/${this.currentProductId}/image`)
                .set(imageUrl);
            
            window.cmsManager.showToast('Bild übernommen', 'success');
            
            // Hide preview
            document.getElementById('aiImagePreview').remove();
            
        } catch (error) {
            console.error('Error applying image:', error);
            window.cmsManager.showToast('Fehler beim Übernehmen', 'error');
        }
    }
    
    // Search new image
    searchNewImage() {
        const productName = document.getElementById('aiProduct').selectedOptions[0].textContent;
        // Add timestamp to force new image
        const timestamp = Date.now();
        const imageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(productName)}&t=${timestamp}`;
        this.showImagePreview(imageUrl);
    }
}

// Initialize AI Product Manager
const aiProductManager = new AIProductManager();

// Global functions
window.generateDescription = () => aiProductManager.generateDescription();
window.applyAiDescription = () => aiProductManager.applyAiDescription();
window.regenerateDescription = () => aiProductManager.regenerateDescription();