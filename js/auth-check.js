// auth-check.js - Füge dies in alle Admin-Seiten ein

// Vereinfachte Auth-Prüfung ohne Firebase Auth
function checkAdminAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
    const now = Date.now();
    
    // Session läuft nach 2 Stunden ab
    const sessionExpired = (now - loginTime) > (2 * 60 * 60 * 1000);
    
    if (!isLoggedIn || sessionExpired) {
        // Nicht eingeloggt oder Session abgelaufen
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('loginTime');
        window.location.href = 'admin.html';
        return false;
    }
    
    return true;
}

// Mock logout Funktion
function adminLogout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('loginTime');
    window.location.href = 'admin.html';
}

// Prüfe Auth beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    // Nur auf Admin-Seiten prüfen (nicht auf admin.html selbst)
    if (!window.location.pathname.includes('admin.html')) {
        checkAdminAuth();
    }
});