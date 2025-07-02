// ============================================================================
// EATECH - MENU DESIGNER
// Version: 1.0.0
// Description: Drag & Drop Speisekarten-Designer mit Live-Preview
// Features: Kategorien, Produkte, Preise, Sichtbarkeit, Sortierung
// ============================================================================

class MenuDesigner {
    constructor() {
        this.products = [];
        this.categories = [];
        this.draggedItem = null;
        this.hasChanges = false;
        this.currentView = 'grid'; // grid or list
        
        // Auto-save timer
        this.autoSaveInterval = null;
        this.autoSaveDelay = 30000; // 30 seconds
        
        this.init();
    }
    
    // Initialize
    init() {
        this.loadProducts();
        this.loadCategories();
        this.setupEventListeners();
        this.startAutoSave();
        
        // Show notification
        this.showNotification('Speisekarten-Designer geladen', 'success');
    }
    
    // Load products from Firebase
    async loadProducts() {
        firebase.database().ref('products').on('value', snapshot => {
            const data = snapshot.val() || {};
            this.products = Object.entries(data).map(([id, product]) => ({
                id,
                ...product,
                visible: product.visible !== false,
                position: product.position || 999
            }));
            
            // Sort by position
            this.products.sort((a, b) => a.position - b.position);
            
            this.renderProducts();
            this.updateStats();
        });
    }
    
    // Load categories
    async loadCategories() {
        firebase.database().ref('categories').on('value', snapshot => {
            const data = snapshot.val() || {};
            this.categories = Object.entries(data).map(([id, category]) => ({
                id,
                ...category,
                position: category.position || 999
            }));
            
            // Sort by position
            this.categories.sort((a, b) => a.position - b.position);
            
            // If no categories, create defaults
            if (this.categories.length === 0) {
                this.createDefaultCategories();
            }
            
            this.renderCategories();
        });
    }
    
    // Create default categories
    async createDefaultCategories() {
        const defaults = [
            { name: 'Pizza', emoji: '🍕', position: 1 },
            { name: 'Pasta', emoji: '🍝', position: 2 },
            { name: 'Salate', emoji: '🥗', position: 3 },
            { name: 'Desserts', emoji: '🍰', position: 4 },
            { name: 'Getränke', emoji: '🥤', position: 5 }
        ];
        
        for (const category of defaults) {
            await firebase.database().ref('categories').push(category);
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // View toggle
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentView = e.target.dataset.view;
                this.renderProducts();
                
                // Update active state
                document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Search
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterProducts(e.target.value);
            });
        }
        
        // Add product button
        const addBtn = document.getElementById('addProductBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showProductModal());
        }
        
        // Save changes button
        const saveBtn = document.getElementById('saveChangesBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAllChanges());
        }
        
        // Category filter
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-filter')) {
                this.filterByCategory(e.target.dataset.category);
                
                // Update active state
                document.querySelectorAll('.category-filter').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
            }
        });
    }
    
    // Render products
    renderProducts() {
        const container = document.getElementById('productsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        container.className = `products-container ${this.currentView}-view`;
        
        // Group by category
        const grouped = this.groupByCategory();
        
        Object.entries(grouped).forEach(([category, products]) => {
            const section = document.createElement('div');
            section.className = 'category-section';
            section.dataset.category = category;
            
            // Category header
            const header = document.createElement('div');
            header.className = 'category-header';
            header.innerHTML = `
                <h3>${this.getCategoryEmoji(category)} ${category}</h3>
                <span class="product-count">${products.length} Produkte</span>
            `;
            section.appendChild(header);
            
            // Products grid/list
            const productsContainer = document.createElement('div');
            productsContainer.className = `products-${this.currentView}`;
            productsContainer.dataset.category = category;
            
            products.forEach((product, index) => {
                const productEl = this.createProductElement(product, index);
                productsContainer.appendChild(productEl);
            });
            
            section.appendChild(productsContainer);
            container.appendChild(section);
        });
        
        // Make sortable
        this.makeSortable();
    }
    
    // Create product element
    createProductElement(product, index) {
        const div = document.createElement('div');
        div.className = `product-item ${!product.visible ? 'hidden' : ''}`;
        div.dataset.productId = product.id;
        div.dataset.position = index;
        div.draggable = true;
        
        if (this.currentView === 'grid') {
            div.innerHTML = `
                <div class="drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="product-emoji">${product.emoji || '🍕'}</div>
                <h4 class="product-name">${product.name}</h4>
                <p class="product-price">CHF ${product.price.toFixed(2)}</p>
                <div class="product-actions">
                    <button class="btn-icon" onclick="menuDesigner.toggleVisibility('${product.id}')" title="${product.visible ? 'Ausblenden' : 'Einblenden'}">
                        <i class="fas fa-eye${!product.visible ? '-slash' : ''}"></i>
                    </button>
                    <button class="btn-icon" onclick="menuDesigner.editProduct('${product.id}')" title="Bearbeiten">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="menuDesigner.deleteProduct('${product.id}')" title="Löschen">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="product-info">
                    <div class="product-main">
                        <span class="product-emoji">${product.emoji || '🍕'}</span>
                        <h4 class="product-name">${product.name}</h4>
                        <p class="product-description">${product.description || 'Keine Beschreibung'}</p>
                    </div>
                    <div class="product-meta">
                        <span class="product-price">CHF ${product.price.toFixed(2)}</span>
                        <span class="product-category">${product.category}</span>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn-icon" onclick="menuDesigner.toggleVisibility('${product.id}')" title="${product.visible ? 'Ausblenden' : 'Einblenden'}">
                        <i class="fas fa-eye${!product.visible ? '-slash' : ''}"></i>
                    </button>
                    <button class="btn-icon" onclick="menuDesigner.editProduct('${product.id}')" title="Bearbeiten">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="menuDesigner.deleteProduct('${product.id}')" title="Löschen">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }
        
        // Drag events
        div.addEventListener('dragstart', (e) => this.handleDragStart(e));
        div.addEventListener('dragover', (e) => this.handleDragOver(e));
        div.addEventListener('drop', (e) => this.handleDrop(e));
        div.addEventListener('dragend', (e) => this.handleDragEnd(e));
        
        return div;
    }
    
    // Make sortable with drag & drop
    makeSortable() {
        // Already handled in createProductElement
    }
    
    // Drag & Drop handlers
    handleDragStart(e) {
        this.draggedItem = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
    }
    
    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        
        e.dataTransfer.dropEffect = 'move';
        
        const target = e.target.closest('.product-item');
        if (target && target !== this.draggedItem) {
            const rect = target.getBoundingClientRect();
            const midpoint = rect.y + rect.height / 2;
            
            if (e.clientY < midpoint) {
                target.classList.add('drag-over-top');
                target.classList.remove('drag-over-bottom');
            } else {
                target.classList.add('drag-over-bottom');
                target.classList.remove('drag-over-top');
            }
        }
        
        return false;
    }
    
    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        const target = e.target.closest('.product-item');
        if (target && this.draggedItem !== target) {
            const parent = target.parentNode;
            const allItems = [...parent.querySelectorAll('.product-item')];
            const draggedIndex = allItems.indexOf(this.draggedItem);
            const targetIndex = allItems.indexOf(target);
            
            if (draggedIndex < targetIndex) {
                parent.insertBefore(this.draggedItem, target.nextSibling);
            } else {
                parent.insertBefore(this.draggedItem, target);
            }
            
            this.updatePositions();
            this.hasChanges = true;
            this.updateSaveButton();
        }
        
        return false;
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        
        document.querySelectorAll('.product-item').forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });
    }
    
    // Update positions after drag
    updatePositions() {
        const containers = document.querySelectorAll('.products-grid, .products-list');
        
        containers.forEach(container => {
            const items = container.querySelectorAll('.product-item');
            items.forEach((item, index) => {
                const productId = item.dataset.productId;
                const product = this.products.find(p => p.id === productId);
                if (product) {
                    product.position = index;
                }
            });
        });
    }
    
    // Toggle product visibility
    toggleVisibility(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            product.visible = !product.visible;
            this.hasChanges = true;
            this.updateSaveButton();
            
            // Update UI
            const element = document.querySelector(`[data-product-id="${productId}"]`);
            if (element) {
                element.classList.toggle('hidden');
                const icon = element.querySelector('.fa-eye, .fa-eye-slash');
                if (icon) {
                    icon.className = product.visible ? 'fas fa-eye' : 'fas fa-eye-slash';
                }
            }
        }
    }
    
    // Edit product
    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            this.showProductModal(product);
        }
    }
    
    // Delete product
    async deleteProduct(productId) {
        if (!confirm('Produkt wirklich löschen?')) return;
        
        try {
            await firebase.database().ref(`products/${productId}`).remove();
            this.showNotification('Produkt gelöscht', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Fehler beim Löschen', 'error');
        }
    }
    
    // Show product modal
    showProductModal(product = null) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${product ? 'Produkt bearbeiten' : 'Neues Produkt'}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                
                <form id="productForm" onsubmit="menuDesigner.saveProduct(event, ${product ? `'${product.id}'` : null})">
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" name="name" value="${product?.name || ''}" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Kategorie *</label>
                            <select name="category" required>
                                ${this.categories.map(cat => `
                                    <option value="${cat.name}" ${product?.category === cat.name ? 'selected' : ''}>
                                        ${cat.emoji} ${cat.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Preis (CHF) *</label>
                            <input type="number" name="price" value="${product?.price || ''}" step="0.50" min="0" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Beschreibung</label>
                        <textarea name="description" rows="3">${product?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Emoji</label>
                            <input type="text" name="emoji" value="${product?.emoji || '🍕'}" maxlength="2">
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="visible" ${product?.visible !== false ? 'checked' : ''}>
                                Sichtbar im Menü
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Allergene</label>
                        <input type="text" name="allergens" value="${product?.allergens || ''}" placeholder="z.B. Gluten, Laktose">
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Speichern
                        </button>
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">
                            Abbrechen
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus first input
        modal.querySelector('input[name="name"]').focus();
    }
    
    // Save product
    async saveProduct(event, productId = null) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const productData = {
            name: formData.get('name'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            description: formData.get('description'),
            emoji: formData.get('emoji') || '🍕',
            visible: formData.get('visible') === 'on',
            allergens: formData.get('allergens'),
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        try {
            if (productId) {
                // Update existing
                await firebase.database().ref(`products/${productId}`).update(productData);
                this.showNotification('Produkt aktualisiert', 'success');
            } else {
                // Create new
                productData.position = this.products.length;
                productData.createdAt = firebase.database.ServerValue.TIMESTAMP;
                await firebase.database().ref('products').push(productData);
                this.showNotification('Produkt erstellt', 'success');
            }
            
            // Close modal
            form.closest('.modal').remove();
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Fehler beim Speichern', 'error');
        }
    }
    
    // Save all changes
    async saveAllChanges() {
        if (!this.hasChanges) {
            this.showNotification('Keine Änderungen zum Speichern', 'info');
            return;
        }
        
        try {
            // Update all product positions and visibility
            const updates = {};
            
            this.products.forEach(product => {
                updates[`products/${product.id}/position`] = product.position;
                updates[`products/${product.id}/visible`] = product.visible;
            });
            
            await firebase.database().ref().update(updates);
            
            this.hasChanges = false;
            this.updateSaveButton();
            this.showNotification('Alle Änderungen gespeichert', 'success');
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Fehler beim Speichern', 'error');
        }
    }
    
    // Filter products
    filterProducts(searchTerm) {
        const term = searchTerm.toLowerCase();
        
        document.querySelectorAll('.product-item').forEach(item => {
            const name = item.querySelector('.product-name').textContent.toLowerCase();
            const visible = name.includes(term);
            item.style.display = visible ? '' : 'none';
        });
        
        // Hide empty categories
        document.querySelectorAll('.category-section').forEach(section => {
            const hasVisible = section.querySelectorAll('.product-item:not([style*="display: none"])').length > 0;
            section.style.display = hasVisible ? '' : 'none';
        });
    }
    
    // Filter by category
    filterByCategory(category) {
        if (category === 'all') {
            document.querySelectorAll('.category-section').forEach(section => {
                section.style.display = '';
            });
        } else {
            document.querySelectorAll('.category-section').forEach(section => {
                section.style.display = section.dataset.category === category ? '' : 'none';
            });
        }
    }
    
    // Render categories
    renderCategories() {
        const container = document.getElementById('categoriesContainer');
        if (!container) return;
        
        container.innerHTML = `
            <button class="category-filter active" data-category="all">
                <i class="fas fa-th"></i> Alle
            </button>
            ${this.categories.map(cat => `
                <button class="category-filter" data-category="${cat.name}">
                    ${cat.emoji} ${cat.name}
                </button>
            `).join('')}
            <button class="category-filter" onclick="menuDesigner.showCategoryModal()">
                <i class="fas fa-plus"></i> Kategorie
            </button>
        `;
    }
    
    // Show category modal
    showCategoryModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content small">
                <div class="modal-header">
                    <h2>Neue Kategorie</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                
                <form onsubmit="menuDesigner.saveCategory(event)">
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" name="name" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Emoji</label>
                        <input type="text" name="emoji" value="🍴" maxlength="2">
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Speichern
                        </button>
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">
                            Abbrechen
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.querySelector('input[name="name"]').focus();
    }
    
    // Save category
    async saveCategory(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const categoryData = {
            name: formData.get('name'),
            emoji: formData.get('emoji') || '🍴',
            position: this.categories.length
        };
        
        try {
            await firebase.database().ref('categories').push(categoryData);
            this.showNotification('Kategorie erstellt', 'success');
            form.closest('.modal').remove();
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Fehler beim Speichern', 'error');
        }
    }
    
    // Group products by category
    groupByCategory() {
        const grouped = {};
        
        this.products.forEach(product => {
            const category = product.category || 'Uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(product);
        });
        
        return grouped;
    }
    
    // Get category emoji
    getCategoryEmoji(categoryName) {
        const category = this.categories.find(c => c.name === categoryName);
        return category?.emoji || '🍴';
    }
    
    // Update stats
    updateStats() {
        const total = this.products.length;
        const visible = this.products.filter(p => p.visible).length;
        const hidden = total - visible;
        
        document.getElementById('totalProducts').textContent = total;
        document.getElementById('visibleProducts').textContent = visible;
        document.getElementById('hiddenProducts').textContent = hidden;
    }
    
    // Update save button
    updateSaveButton() {
        const btn = document.getElementById('saveChangesBtn');
        if (btn) {
            btn.disabled = !this.hasChanges;
            btn.innerHTML = this.hasChanges 
                ? '<i class="fas fa-save"></i> Änderungen speichern' 
                : '<i class="fas fa-check"></i> Alles gespeichert';
        }
    }
    
    // Auto save
    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (this.hasChanges) {
                this.saveAllChanges();
            }
        }, this.autoSaveDelay);
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `designer-notification ${type}`;
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
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin-products') || window.location.pathname.includes('menu-designer')) {
        window.menuDesigner = new MenuDesigner();
    }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuDesigner;
}