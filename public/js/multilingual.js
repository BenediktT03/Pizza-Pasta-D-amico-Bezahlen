// Minimale multilingual.js um Fehler zu vermeiden
// Diese Datei muss im Ordner public/js/ gespeichert werden

window.ml = {
    // Standard-Sprache
    currentLang: 'de',
    
    // Einfache Übersetzungsfunktion
    t: function(key) {
        // Gibt einfach den Key zurück für jetzt
        return key;
    },
    
    // Init-Funktion (macht nichts, aber wird erwartet)
    init: function() {
        console.log('Multilingual initialized (minimal version)');
    }
};

// Globale t-Funktion
window.t = function(key) {
    return window.ml.t(key);
};

console.log('multilingual.js loaded');