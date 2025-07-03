// auth-check.js - Admin Authentication für Eatech
// Füge dies in alle Admin-Seiten ein

// Check if user is authenticated
function checkAdminAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
    const now = Date.now();
    
    // Session läuft nach 2 Stunden ab
    const sessionExpired = (now - loginTime) > (2 * 60 * 60 * 1000);
    
    if (!isLoggedIn || sessionExpired) {
        // Nicht eingeloggt oder Session abgelaufen
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminUsername');
        localStorage.removeItem('loginTime');
        
        // Redirect to login page
        window.location.href = 'admin.html';
        return false;
    }
    
    return true;
}

// Logout function
function adminLogout() {
    // Clear all admin session data
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('loginTime');
    
    // Redirect to login
    window.location.href = 'admin.html';
}

// Check auth when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Skip auth check on login page
    const currentPage = window.location.pathname;
    if (currentPage.includes('admin.html') || currentPage.includes('login.html')) {
        return;
    }
    
    // Check if this is an admin page
    if (currentPage.includes('admin-')) {
        checkAdminAuth();
        
        // Setup logout button if exists
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Möchten Sie sich wirklich abmelden?')) {
                    adminLogout();
                }
            });
        }
        
        // Refresh auth check every 30 seconds
        setInterval(() => {
            checkAdminAuth();
        }, 30000);
    }
});

// Export functions for use in other scripts
window.checkAdminAuth = checkAdminAuth;
window.adminLogout = adminLogout;