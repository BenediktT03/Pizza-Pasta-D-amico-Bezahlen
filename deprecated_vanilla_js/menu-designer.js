// Menu Designer JavaScript
let currentMenuDesign = {
    categories: [],
    styling: {
        primaryColor: '#ff6b6b',
        bgColor: '#1a1a1a',
        textColor: '#ffffff',
        columns: 2,
        cardStyle: 'modern',
        fontFamily: 'Inter',
        animations: true,
        hoverEffects: true,
        shadows: true,
        showPrices: true,
        showImages: true,
        showDescriptions: true
    }
};

let availableProducts = [];
let sortableInstances = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadProducts();
    loadCurrentDesign();
    initializeStyleControls();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
        }
    });
}

// Load all products from database
function loadProducts() {
    database.ref('products').on('value', (snapshot) => {
        availableProducts = [];
        const data = snapshot.val();
        
        if (data) {
            Object.entries(data).forEach(([id, product]) => {
                availableProducts.push({
                    id: id,
                    ...product
                });
            });
        }
        
        renderAvailableProducts();
    });
}

// Render available products in sidebar
function renderAvailableProducts() {
    const container = document.getElementById('availableProducts');
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    
    const filteredProducts = availableProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
    );
    
    container.innerHTML = filteredProducts.map(product => `
        <div class="product-item" draggable="true" data-product-id="${product.id}">
            ${product.image ? `<img src="${product.image}" alt="${product.name}">` : '<div class="no-image"><i class="fas fa-image"></i></div>'}
            <div class="product-info">
                <h4>${product.name}</h4>
                <span class="price">CHF ${product.price.toFixed(2)}</span>
            </div>
        </div>
    `).join('');
    
    // Add drag event listeners
    container.querySelectorAll('.product-item').forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });
}

// Load current menu design from database
function loadCurrentDesign() {
    database.ref('menuDesign').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            currentMenuDesign = data;
            applyDesignSettings();
            renderCategories();
        } else {
            // Create default categories if none exist
            createDefaultCategories();
        }
    });
}

// Create default categories
function createDefaultCategories() {
    currentMenuDesign.categories = [
        {
            id: 'cat_1',
            name: 'Vorspeisen',
            icon: 'fa-utensils',
            products: [],
            order: 0
        },
        {
            id: 'cat_2',
            name: 'Hauptgerichte',
            icon: 'fa-pizza-slice',
            products: [],
            order: 1
        },
        {
            id: 'cat_3',
            name: 'Desserts',
            icon: 'fa-ice-cream',
            products: [],
            order: 2
        },
        {
            id: 'cat_4',
            name: 'Getränke',
            icon: 'fa-glass-water',
            products: [],
            order: 3
        }
    ];
    renderCategories();
}

// Apply design settings to controls
function applyDesignSettings() {
    const { styling } = currentMenuDesign;
    
    document.getElementById('primaryColor').value = styling.primaryColor;
    document.getElementById('bgColor').value = styling.bgColor;
    document.getElementById('textColor').value = styling.textColor;
    document.getElementById('columnsPerCategory').value = styling.columns;
    document.getElementById('cardStyle').value = styling.cardStyle;
    document.getElementById('fontFamily').value = styling.fontFamily;
    document.getElementById('enableAnimations').checked = styling.animations;
    document.getElementById('enableHoverEffects').checked = styling.hoverEffects;
    document.getElementById('enableShadows').checked = styling.shadows;
    document.getElementById('showPrices').checked = styling.showPrices;
    document.getElementById('showImages').checked = styling.showImages;
    document.getElementById('showDescriptions').checked = styling.showDescriptions;
}

// Render categories in the designer canvas
function renderCategories() {
    const container = document.getElementById('menuCategories');
    
    // Sort categories by order
    const sortedCategories = [...currentMenuDesign.categories].sort((a, b) => a.order - b.order);
    
    container.innerHTML = sortedCategories.map(category => `
        <div class="category-section" data-category-id="${category.id}">
            <div class="category-header">
                <div class="category-title">
                    <i class="fas ${category.icon}"></i>
                    <input type="text" value="${category.name}" onchange="updateCategoryName('${category.id}', this.value)">
                </div>
                <div class="category-actions">
                    <button onclick="moveCategory('${category.id}', 'up')" title="Nach oben">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button onclick="moveCategory('${category.id}', 'down')" title="Nach unten">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button onclick="deleteCategory('${category.id}')" title="Löschen" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="category-products" id="products_${category.id}" style="grid-template-columns: repeat(${currentMenuDesign.styling.columns}, 1fr);">
                ${renderCategoryProducts(category)}
            </div>
        </div>
    `).join('');
    
    // Initialize Sortable for each category
    initializeSortable();
}

// Render products within a category
function renderCategoryProducts(category) {
    if (!category.products || category.products.length === 0) {
        return '<div class="empty-category">Produkte hierher ziehen</div>';
    }
    
    return category.products.map(productId => {
        const product = availableProducts.find(p => p.id === productId);
        if (!product) return '';
        
        return `
            <div class="menu-product-card ${currentMenuDesign.styling.cardStyle}" data-product-id="${product.id}">
                ${currentMenuDesign.styling.showImages && product.image ? 
                    `<img src="${product.image}" alt="${product.name}">` : ''}
                <div class="product-content">
                    <h4>${product.name}</h4>
                    ${currentMenuDesign.styling.showDescriptions && product.description ? 
                        `<p>${product.description}</p>` : ''}
                    ${currentMenuDesign.styling.showPrices ? 
                        `<span class="price">CHF ${product.price.toFixed(2)}</span>` : ''}
                </div>
                <button onclick="removeProductFromCategory('${category.id}', '${product.id}')" class="remove-product">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

// Initialize Sortable.js for drag & drop
function initializeSortable() {
    // Destroy existing instances
    sortableInstances.forEach(instance => instance.destroy());
    sortableInstances = [];
    
    // Create new instances for each category
    document.querySelectorAll('.category-products').forEach(container => {
        const categoryId = container.id.replace('products_', '');
        
        const sortable = Sortable.create(container, {
            group: 'products',
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            handle: '.menu-product-card',
            
            onAdd: function(evt) {
                const productId = evt.item.dataset.productId;
                const toCategoryId = categoryId;
                
                // Add product to category
                const category = currentMenuDesign.categories.find(c => c.id === toCategoryId);
                if (category && !category.products.includes(productId)) {
                    category.products.push(productId);
                    renderCategories();
                }
            },
            
            onUpdate: function(evt) {
                // Update product order within category
                const category = currentMenuDesign.categories.find(c => c.id === categoryId);
                if (category) {
                    const newOrder = [];
                    container.querySelectorAll('.menu-product-card').forEach(card => {
                        newOrder.push(card.dataset.productId);
                    });
                    category.products = newOrder;
                }
            }
        });
        
        sortableInstances.push(sortable);
    });
}

// Drag & Drop handlers for sidebar products
function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('productId', e.target.dataset.productId);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

// Category management functions
function addNewCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    const icon = document.getElementById('newCategoryIcon').value.trim() || 'fa-folder';
    
    if (!name) {
        showToast('Bitte einen Kategorienamen eingeben', 'error');
        return;
    }
    
    const newCategory = {
        id: 'cat_' + Date.now(),
        name: name,
        icon: icon,
        products: [],
        order: currentMenuDesign.categories.length
    };
    
    currentMenuDesign.categories.push(newCategory);
    renderCategories();
    
    // Clear inputs
    document.getElementById('newCategoryName').value = '';
    document.getElementById('newCategoryIcon').value = '';
    
    showToast('Kategorie hinzugefügt', 'success');
}

function updateCategoryName(categoryId, newName) {
    const category = currentMenuDesign.categories.find(c => c.id === categoryId);
    if (category) {
        category.name = newName;
    }
}

function moveCategory(categoryId, direction) {
    const index = currentMenuDesign.categories.findIndex(c => c.id === categoryId);
    
    if (direction === 'up' && index > 0) {
        // Swap with previous category
        [currentMenuDesign.categories[index], currentMenuDesign.categories[index - 1]] = 
        [currentMenuDesign.categories[index - 1], currentMenuDesign.categories[index]];
        
        // Update order values
        currentMenuDesign.categories[index].order = index;
        currentMenuDesign.categories[index - 1].order = index - 1;
    } else if (direction === 'down' && index < currentMenuDesign.categories.length - 1) {
        // Swap with next category
        [currentMenuDesign.categories[index], currentMenuDesign.categories[index + 1]] = 
        [currentMenuDesign.categories[index + 1], currentMenuDesign.categories[index]];
        
        // Update order values
        currentMenuDesign.categories[index].order = index;
        currentMenuDesign.categories[index + 1].order = index + 1;
    }
    
    renderCategories();
}

function deleteCategory(categoryId) {
    if (confirm('Diese Kategorie wirklich löschen?')) {
        currentMenuDesign.categories = currentMenuDesign.categories.filter(c => c.id !== categoryId);
        
        // Update order values
        currentMenuDesign.categories.forEach((cat, index) => {
            cat.order = index;
        });
        
        renderCategories();
        showToast('Kategorie gelöscht', 'success');
    }
}

function removeProductFromCategory(categoryId, productId) {
    const category = currentMenuDesign.categories.find(c => c.id === categoryId);
    if (category) {
        category.products = category.products.filter(p => p !== productId);
        renderCategories();
    }
}

// Initialize style controls
function initializeStyleControls() {
    // Color controls
    document.getElementById('primaryColor').addEventListener('change', updateStyling);
    document.getElementById('bgColor').addEventListener('change', updateStyling);
    document.getElementById('textColor').addEventListener('change', updateStyling);
    
    // Layout controls
    document.getElementById('columnsPerCategory').addEventListener('change', updateStyling);
    document.getElementById('cardStyle').addEventListener('change', updateStyling);
    document.getElementById('fontFamily').addEventListener('change', updateStyling);
    
    // Effect controls
    document.getElementById('enableAnimations').addEventListener('change', updateStyling);
    document.getElementById('enableHoverEffects').addEventListener('change', updateStyling);
    document.getElementById('enableShadows').addEventListener('change', updateStyling);
    
    // Display controls
    document.getElementById('showPrices').addEventListener('change', updateStyling);
    document.getElementById('showImages').addEventListener('change', updateStyling);
    document.getElementById('showDescriptions').addEventListener('change', updateStyling);
}

// Update styling
function updateStyling() {
    currentMenuDesign.styling = {
        primaryColor: document.getElementById('primaryColor').value,
        bgColor: document.getElementById('bgColor').value,
        textColor: document.getElementById('textColor').value,
        columns: document.getElementById('columnsPerCategory').value,
        cardStyle: document.getElementById('cardStyle').value,
        fontFamily: document.getElementById('fontFamily').value,
        animations: document.getElementById('enableAnimations').checked,
        hoverEffects: document.getElementById('enableHoverEffects').checked,
        shadows: document.getElementById('enableShadows').checked,
        showPrices: document.getElementById('showPrices').checked,
        showImages: document.getElementById('showImages').checked,
        showDescriptions: document.getElementById('showDescriptions').checked
    };
    
    renderCategories();
}

// Save menu design to database
function saveMenuDesign() {
    database.ref('menuDesign').set(currentMenuDesign)
        .then(() => {
            showToast('Design erfolgreich gespeichert!', 'success');
            
            // Also update the categories in the main products section
            updateProductCategories();
        })
        .catch(error => {
            showToast('Fehler beim Speichern: ' + error.message, 'error');
        });
}

// Update product categories in the main database
function updateProductCategories() {
    const categoriesMap = {};
    
    currentMenuDesign.categories.forEach(category => {
        category.products.forEach(productId => {
            categoriesMap[productId] = category.name;
        });
    });
    
    // Update each product's category
    Object.entries(categoriesMap).forEach(([productId, categoryName]) => {
        database.ref(`products/${productId}/category`).set(categoryName);
    });
}

// Preview functions
function previewMenu() {
    const modal = document.getElementById('previewModal');
    modal.style.display = 'flex';
    
    renderPreview();
}

function closePreview() {
    document.getElementById('previewModal').style.display = 'none';
}

function setPreviewDevice(device) {
    const frame = document.getElementById('previewFrame');
    frame.className = 'preview-frame ' + device;
    
    // Update active button
    document.querySelectorAll('.preview-device-selector button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('button').classList.add('active');
}

function renderPreview() {
    const frame = document.getElementById('previewFrame');
    const { styling } = currentMenuDesign;
    
    // Apply custom styles
    const customStyles = `
        <style>
            .preview-menu {
                background-color: ${styling.bgColor};
                color: ${styling.textColor};
                font-family: ${styling.fontFamily}, sans-serif;
                padding: 20px;
                min-height: 100vh;
            }
            .preview-category h2 {
                color: ${styling.primaryColor};
            }
            .preview-products {
                display: grid;
                grid-template-columns: repeat(${styling.columns}, 1fr);
                gap: 20px;
            }
            .preview-product-card {
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
                padding: 15px;
                ${styling.shadows ? 'box-shadow: 0 4px 6px rgba(0,0,0,0.1);' : ''}
                ${styling.hoverEffects ? 'transition: transform 0.3s ease;' : ''}
            }
            ${styling.hoverEffects ? '.preview-product-card:hover { transform: translateY(-5px); }' : ''}
            .preview-product-card img {
                width: 100%;
                height: 150px;
                object-fit: cover;
                border-radius: 8px;
                margin-bottom: 10px;
            }
            .preview-price {
                color: ${styling.primaryColor};
                font-weight: bold;
                font-size: 1.2em;
            }
            @media (max-width: 768px) {
                .preview-products {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    `;
    
    const menuHTML = currentMenuDesign.categories.map(category => {
        if (!category.products || category.products.length === 0) return '';
        
        return `
            <div class="preview-category">
                <h2><i class="fas ${category.icon}"></i> ${category.name}</h2>
                <div class="preview-products">
                    ${category.products.map(productId => {
                        const product = availableProducts.find(p => p.id === productId);
                        if (!product) return '';
                        
                        return `
                            <div class="preview-product-card">
                                ${styling.showImages && product.image ? 
                                    `<img src="${product.image}" alt="${product.name}">` : ''}
                                <h3>${product.name}</h3>
                                ${styling.showDescriptions && product.description ? 
                                    `<p>${product.description}</p>` : ''}
                                ${styling.showPrices ? 
                                    `<div class="preview-price">CHF ${product.price.toFixed(2)}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    frame.innerHTML = customStyles + '<div class="preview-menu">' + menuHTML + '</div>';
}

// Setup event listeners
function setupEventListeners() {
    // Product search
    document.getElementById('productSearch').addEventListener('input', renderAvailableProducts);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Wirklich ausloggen?')) {
            auth.signOut();
        }
    });
    
    // Close preview on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePreview();
        }
    });
    
    // Make category products droppable
    document.addEventListener('dragover', (e) => {
        if (e.target.closest('.category-products')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    });
    
    document.addEventListener('drop', (e) => {
        const categoryProducts = e.target.closest('.category-products');
        if (categoryProducts) {
            e.preventDefault();
            const productId = e.dataTransfer.getData('productId');
            const categoryId = categoryProducts.id.replace('products_', '');
            
            const category = currentMenuDesign.categories.find(c => c.id === categoryId);
            if (category && productId && !category.products.includes(productId)) {
                category.products.push(productId);
                renderCategories();
            }
        }
    });
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}