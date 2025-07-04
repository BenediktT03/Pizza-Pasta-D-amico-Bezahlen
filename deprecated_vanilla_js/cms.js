// ============================================================================
// EATECH - CMS MANAGEMENT SYSTEM
// Version: 1.0.0
// Description: Content Management System für Eatech
// Features: Rich Text Editor, AI Descriptions, Image Management
// ============================================================================

class CMSManager {
    constructor() {
        this.currentSection = null;
        this.content = {};
        this.offers = [];
        this.footerLinks = [];
        this.images = [];
        this.quillEditor = null;
        
        // Get tenant ID
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
                this.loadContent();
                this.loadOffers();
                this.loadFooterLinks();
                this.loadImages();
                this.loadProducts();
                this.setupEventListeners();
            }
        });
    }
    
    // Get tenant ID
    getTenantId() {
        const subdomain = window.location.hostname.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'eatech') {
            return subdomain;
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const tenantParam = urlParams.get('tenant');
        if (tenantParam) {
            return tenantParam;
        }
        
        return localStorage.getItem('tenantId') || 'default';
    }
    
    // Load content
    async loadContent() {
        try {
            const snapshot = await database.ref(`tenants/${this.tenantId}/content`).once('value');
            this.content = snapshot.val() || this.getDefaultContent();
            
            // Update UI
            this.updateContentPreview();
            
        } catch (error) {
            console.error('Error loading content:', error);
        }
    }
    
    // Get default content
    getDefaultContent() {
        return {
            welcome: {
                title: 'Willkommen bei Ihrem Foodtruck!',
                text: 'Bestellen Sie bequem online und holen Sie Ihr Essen ab.'
            },
            about: {
                text: 'Erzählen Sie hier Ihre Geschichte. Was macht Ihren Foodtruck besonders? Seit wann gibt es Sie? Was ist Ihre Mission?'
            },
            announcement: {
                text: 'Wichtige Ankündigung hier...',
                enabled: false
            },
            seo: {
                title: 'Mein Foodtruck - Online bestellen',
                description: 'Die besten Burger der Stadt jetzt online bestellen und abholen.',
                keywords: 'foodtruck, burger, essen, bestellen, online'
            }
        };
    }
    
    // Update content preview
    updateContentPreview() {
        // Welcome
        this.setTextContent('welcomeTitle', this.content.welcome?.title);
        this.setTextContent('welcomeText', this.content.welcome?.text);
        
        // About
        this.setTextContent('aboutText', this.content.about?.text);
        
        // Announcement
        this.setTextContent('announcementText', this.content.announcement?.text);
        document.getElementById('announcementEnabled').checked = this.content.announcement?.enabled || false;
        
        // SEO
        this.setTextContent('seoTitle', this.content.seo?.title);
        this.setTextContent('seoDescription', this.content.seo?.description);
        this.setTextContent('seoKeywords', this.content.seo?.keywords);
    }
    
    // Helper to set text content
    setTextContent(id, text) {
        const element = document.getElementById(id);
        if (element && text) {
            element.textContent = text;
        }
    }
    
    // Edit section
    editSection(section) {
        this.currentSection = section;
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        switch(section) {
            case 'welcome':
                modalTitle.textContent = 'Willkommensbereich bearbeiten';
                modalBody.innerHTML = `
                    <div class="form-group">
                        <label>Titel</label>
                        <input type="text" id="editWelcomeTitle" value="${this.content.welcome?.title || ''}">
                    </div>
                    <div class="form-group">
                        <label>Text</label>
                        <div id="editWelcomeText" style="height: 200px;"></div>
                    </div>
                `;
                this.initQuill('editWelcomeText', this.content.welcome?.text || '');
                break;
                
            case 'about':
                modalTitle.textContent = 'Über Uns bearbeiten';
                modalBody.innerHTML = `
                    <div class="form-group">
                        <label>Über Uns Text</label>
                        <div id="editAboutText" style="height: 300px;"></div>
                    </div>
                `;
                this.initQuill('editAboutText', this.content.about?.text || '');
                break;
                
            case 'announcements':
                modalTitle.textContent = 'Ankündigung bearbeiten';
                modalBody.innerHTML = `
                    <div class="form-group">
                        <label>Ankündigungstext</label>
                        <input type="text" id="editAnnouncementText" value="${this.content.announcement?.text || ''}">
                    </div>
                    <div class="form-group">
                        <label>Hintergrundfarbe</label>
                        <input type="color" id="editAnnouncementColor" value="${this.content.announcement?.color || '#ff6b6b'}">
                    </div>
                `;
                break;
                
            case 'seo':
                modalTitle.textContent = 'SEO Einstellungen';
                modalBody.innerHTML = `
                    <div class="form-group">
                        <label>Seitentitel</label>
                        <input type="text" id="editSeoTitle" value="${this.content.seo?.title || ''}" maxlength="60">
                        <small>Max. 60 Zeichen</small>
                    </div>
                    <div class="form-group">
                        <label>Beschreibung</label>
                        <textarea id="editSeoDescription" rows="3" maxlength="160">${this.content.seo?.description || ''}</textarea>
                        <small>Max. 160 Zeichen</small>
                    </div>
                    <div class="form-group">
                        <label>Keywords</label>
                        <input type="text" id="editSeoKeywords" value="${this.content.seo?.keywords || ''}">
                        <small>Komma-getrennt</small>
                    </div>
                `;
                break;
                
            case 'footer':
                modalTitle.textContent = 'Footer Links bearbeiten';
                modalBody.innerHTML = `
                    <div class="footer-links-editor">
                        ${this.footerLinks.map((link, index) => `
                            <div class="footer-link-item">
                                <input type="text" placeholder="Link-Text" value="${link.text}" data-index="${index}" data-field="text">
                                <input type="url" placeholder="URL" value="${link.url}" data-index="${index}" data-field="url">
                                <button onclick="cmsManager.removeFooterLink(${index})" class="btn-remove">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;
        }
        
        modal.style.display = 'flex';
    }
    
    // Initialize Quill editor
    initQuill(elementId, content) {
        this.quillEditor = new Quill(`#${elementId}`, {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['link'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            }
        });
        
        if (content) {
            this.quillEditor.root.innerHTML = content;
        }
    }
    
    // Save section
    async saveSection() {
        switch(this.currentSection) {
            case 'welcome':
                this.content.welcome = {
                    title: document.getElementById('editWelcomeTitle').value,
                    text: this.quillEditor.root.innerHTML
                };
                break;
                
            case 'about':
                this.content.about = {
                    text: this.quillEditor.root.innerHTML
                };
                break;
                
            case 'announcements':
                this.content.announcement = {
                    text: document.getElementById('editAnnouncementText').value,
                    color: document.getElementById('editAnnouncementColor').value,
                    enabled: document.getElementById('announcementEnabled').checked
                };
                break;
                
            case 'seo':
                this.content.seo = {
                    title: document.getElementById('editSeoTitle').value,
                    description: document.getElementById('editSeoDescription').value,
                    keywords: document.getElementById('editSeoKeywords').value
                };
                break;
                
            case 'footer':
                // Footer links are saved separately
                await this.saveFooterLinks();
                this.closeEditModal();
                return;
        }
        
        try {
            await database.ref(`tenants/${this.tenantId}/content`).set(this.content);
            this.updateContentPreview();
            this.closeEditModal();
            this.showToast('Inhalt gespeichert', 'success');
        } catch (error) {
            console.error('Error saving content:', error);
            this.showToast('Fehler beim Speichern', 'error');
        }
    }
    
    // Close edit modal
    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.quillEditor = null;
    }
    
    // Load offers
    async loadOffers() {
        try {
            const snapshot = await database.ref(`tenants/${this.tenantId}/offers`).once('value');
            this.offers = [];
            
            snapshot.forEach(child => {
                this.offers.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            this.renderOffers();
            
        } catch (error) {
            console.error('Error loading offers:', error);
        }
    }
    
    // Render offers
    renderOffers() {
        const container = document.getElementById('offersList');
        
        if (this.offers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <p>Noch keine Angebote erstellt</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.offers.map(offer => `
            <div class="offer-item ${offer.active ? 'active' : 'inactive'}">
                <div class="offer-header">
                    <h4>${offer.title}</h4>
                    <span class="offer-badge">${offer.discount}</span>
                </div>
                <p>${offer.description}</p>
                ${offer.validUntil ? `<small>Gültig bis: ${new Date(offer.validUntil).toLocaleDateString('de-CH')}</small>` : ''}
                <div class="offer-actions">
                    <button onclick="cmsManager.editOffer('${offer.id}')" class="btn-icon">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="cmsManager.deleteOffer('${offer.id}')" class="btn-icon danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Add offer
    addOffer() {
        this.currentOfferId = null;
        document.getElementById('offerModal').style.display = 'flex';
        
        // Reset form
        document.getElementById('offerTitle').value = '';
        document.getElementById('offerDescription').value = '';
        document.getElementById('offerDiscount').value = '';
        document.getElementById('offerValidUntil').value = '';
        document.getElementById('offerConditions').value = '';
        document.getElementById('offerActive').checked = true;
    }
    
    // Edit offer
    editOffer(id) {
        const offer = this.offers.find(o => o.id === id);
        if (!offer) return;
        
        this.currentOfferId = id;
        
        document.getElementById('offerTitle').value = offer.title;
        document.getElementById('offerDescription').value = offer.description;
        document.getElementById('offerDiscount').value = offer.discount;
        document.getElementById('offerValidUntil').value = offer.validUntil || '';
        document.getElementById('offerConditions').value = offer.conditions || '';
        document.getElementById('offerActive').checked = offer.active;
        
        document.getElementById('offerModal').style.display = 'flex';
    }
    
    // Save offer
    async saveOffer() {
        const offerData = {
            title: document.getElementById('offerTitle').value,
            description: document.getElementById('offerDescription').value,
            discount: document.getElementById('offerDiscount').value,
            validUntil: document.getElementById('offerValidUntil').value,
            conditions: document.getElementById('offerConditions').value,
            active: document.getElementById('offerActive').checked,
            createdAt: this.currentOfferId ? undefined : Date.now()
        };
        
        if (!offerData.title || !offerData.description || !offerData.discount) {
            this.showToast('Bitte alle Pflichtfelder ausfüllen', 'error');
            return;
        }
        
        try {
            if (this.currentOfferId) {
                await database.ref(`tenants/${this.tenantId}/offers/${this.currentOfferId}`).update(offerData);
            } else {
                await database.ref(`tenants/${this.tenantId}/offers`).push(offerData);
            }
            
            this.closeOfferModal();
            this.loadOffers();
            this.showToast('Angebot gespeichert', 'success');
            
        } catch (error) {
            console.error('Error saving offer:', error);
            this.showToast('Fehler beim Speichern', 'error');
        }
    }
    
    // Delete offer
    async deleteOffer(id) {
        if (!confirm('Dieses Angebot wirklich löschen?')) return;
        
        try {
            await database.ref(`tenants/${this.tenantId}/offers/${id}`).remove();
            this.loadOffers();
            this.showToast('Angebot gelöscht', 'success');
        } catch (error) {
            console.error('Error deleting offer:', error);
            this.showToast('Fehler beim Löschen', 'error');
        }
    }
    
    // Close offer modal
    closeOfferModal() {
        document.getElementById('offerModal').style.display = 'none';
    }
    
    // Load footer links
    async loadFooterLinks() {
        try {
            const snapshot = await database.ref(`tenants/${this.tenantId}/footerLinks`).once('value');
            this.footerLinks = snapshot.val() || [];
            this.renderFooterLinks();
        } catch (error) {
            console.error('Error loading footer links:', error);
        }
    }
    
    // Render footer links
    renderFooterLinks() {
        const container = document.getElementById('footerLinks');
        
        if (this.footerLinks.length === 0) {
            container.innerHTML = '<p class="empty">Keine Footer-Links definiert</p>';
            return;
        }
        
        container.innerHTML = this.footerLinks.map(link => `
            <a href="${link.url}" target="_blank" class="footer-link-preview">
                ${link.text} <i class="fas fa-external-link-alt"></i>
            </a>
        `).join('');
    }
    
    // Add footer link
    addFooterLink() {
        this.footerLinks.push({ text: '', url: '' });
        this.editSection('footer');
    }
    
    // Remove footer link
    removeFooterLink(index) {
        this.footerLinks.splice(index, 1);
        this.editSection('footer');
    }
    
    // Save footer links
    async saveFooterLinks() {
        // Get values from inputs
        const linkInputs = document.querySelectorAll('.footer-link-item input');
        this.footerLinks = [];
        
        linkInputs.forEach(input => {
            const index = parseInt(input.dataset.index);
            const field = input.dataset.field;
            
            if (!this.footerLinks[index]) {
                this.footerLinks[index] = {};
            }
            
            this.footerLinks[index][field] = input.value;
        });
        
        // Filter out empty links
        this.footerLinks = this.footerLinks.filter(link => link.text && link.url);
        
        try {
            await database.ref(`tenants/${this.tenantId}/footerLinks`).set(this.footerLinks);
            this.renderFooterLinks();
            this.showToast('Footer-Links gespeichert', 'success');
        } catch (error) {
            console.error('Error saving footer links:', error);
            this.showToast('Fehler beim Speichern', 'error');
        }
    }
    
    // Load images
    async loadImages() {
        try {
            const snapshot = await database.ref(`tenants/${this.tenantId}/images`).once('value');
            this.images = [];
            
            snapshot.forEach(child => {
                this.images.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            this.renderImages();
            
        } catch (error) {
            console.error('Error loading images:', error);
        }
    }
    
    // Render images
    renderImages() {
        const gallery = document.getElementById('imageGallery');
        
        if (this.images.length === 0) {
            gallery.innerHTML = `
                <div class="empty-gallery">
                    <i class="fas fa-images"></i>
                    <p>Noch keine Bilder hochgeladen</p>
                </div>
            `;
            return;
        }
        
        gallery.innerHTML = this.images.map(image => `
            <div class="image-item">
                <img src="${image.url}" alt="${image.name}">
                <div class="image-overlay">
                    <button onclick="cmsManager.copyImageUrl('${image.url}')" class="btn-icon">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button onclick="cmsManager.deleteImage('${image.id}')" class="btn-icon danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <p class="image-name">${image.name}</p>
            </div>
        `).join('');
    }
    
    // Handle image upload
    async handleImageUpload(event) {
        const files = event.target.files;
        if (!files.length) return;
        
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            
            try {
                // Show loading
                this.showToast('Bild wird hochgeladen...', 'info');
                
                // Upload to Firebase Storage
                const timestamp = Date.now();
                const fileName = `${timestamp}_${file.name}`;
                const storageRef = storage.ref(`tenants/${this.tenantId}/gallery/${fileName}`);
                const snapshot = await storageRef.put(file);
                const url = await snapshot.ref.getDownloadURL();
                
                // Save to database
                await database.ref(`tenants/${this.tenantId}/images`).push({
                    name: file.name,
                    url: url,
                    size: file.size,
                    uploadedAt: timestamp
                });
                
                this.showToast('Bild erfolgreich hochgeladen', 'success');
                
            } catch (error) {
                console.error('Error uploading image:', error);
                this.showToast('Fehler beim Hochladen', 'error');
            }
        }
        
        // Reload images
        this.loadImages();
        
        // Clear input
        event.target.value = '';
    }
    
    // Copy image URL
    copyImageUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.showToast('Bild-URL kopiert', 'success');
        });
    }
    
    // Delete image
    async deleteImage(id) {
        if (!confirm('Dieses Bild wirklich löschen?')) return;
        
        const image = this.images.find(img => img.id === id);
        if (!image) return;
        
        try {
            // Delete from storage
            const storageRef = storage.refFromURL(image.url);
            await storageRef.delete();
            
            // Delete from database
            await database.ref(`tenants/${this.tenantId}/images/${id}`).remove();
            
            this.loadImages();
            this.showToast('Bild gelöscht', 'success');
            
        } catch (error) {
            console.error('Error deleting image:', error);
            this.showToast('Fehler beim Löschen', 'error');
        }
    }
    
    // Load products for AI
    async loadProducts() {
        try {
            const snapshot = await database.ref(`tenants/${this.tenantId}/products`).once('value');
            const select = document.getElementById('aiProduct');
            
            select.innerHTML = '<option value="">Produkt wählen...</option>';
            
            snapshot.forEach(child => {
                const product = child.val();
                const option = document.createElement('option');
                option.value = child.key;
                option.textContent = product.name;
                select.appendChild(option);
            });
            
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }
    
    // Preview site
    previewSite() {
        window.open('/', '_blank');
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Image upload
        document.getElementById('imageUpload').addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Announcement toggle
        document.getElementById('announcementEnabled').addEventListener('change', async (e) => {
            this.content.announcement.enabled = e.target.checked;
            await database.ref(`tenants/${this.tenantId}/content/announcement/enabled`).set(e.target.checked);
            this.showToast('Ankündigungsstatus aktualisiert', 'success');
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Wirklich ausloggen?')) {
                auth.signOut();
            }
        });
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
    window.cmsManager = new CMSManager();
});

// Global functions for onclick handlers
window.editSection = (section) => window.cmsManager.editSection(section);
window.saveSection = () => window.cmsManager.saveSection();
window.closeEditModal = () => window.cmsManager.closeEditModal();
window.addOffer = () => window.cmsManager.addOffer();
window.saveOffer = () => window.cmsManager.saveOffer();
window.closeOfferModal = () => window.cmsManager.closeOfferModal();
window.addFooterLink = () => window.cmsManager.addFooterLink();
window.previewSite = () => window.cmsManager.previewSite();