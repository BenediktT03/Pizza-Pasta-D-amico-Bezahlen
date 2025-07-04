// order-number-generator.js
// Generiert 6-stellige Bestellnummern im Format TTSSXX
// TT = Tag, SS = Stunde/Minute, XX = Zufallszahl

class OrderNumberGenerator {
    constructor() {
        this.lastMinute = -1;
        this.minuteCounter = 0;
        this.usedNumbers = new Set();
    }

    generate() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const currentMinute = now.getHours() * 60 + now.getMinutes();
        
        // Reset counter wenn neue Minute
        if (currentMinute !== this.lastMinute) {
            this.lastMinute = currentMinute;
            this.minuteCounter = 0;
            this.usedNumbers.clear();
        }

        // Zeit-Teil: Stunde (00-23) + Minute (00-59) mapped auf 00-99
        const timeCode = String(Math.floor((currentMinute / 1440) * 100)).padStart(2, '0');
        
        // Zufallszahl 00-99
        let randomPart;
        let orderNumber;
        let attempts = 0;
        
        do {
            // Bei mehr als 50 Bestellungen pro Minute, erweitere den Zahlenbereich
            if (this.minuteCounter > 50) {
                randomPart = String(Math.floor(Math.random() * 1000) % 100).padStart(2, '0');
            } else {
                // Normale Zufallszahl mit Counter-Offset
                randomPart = String((this.minuteCounter + Math.floor(Math.random() * 50)) % 100).padStart(2, '0');
            }
            
            orderNumber = day + timeCode + randomPart;
            attempts++;
            
            // Sicherheit: Nach 100 Versuchen, verwende Counter
            if (attempts > 100) {
                randomPart = String(this.minuteCounter % 100).padStart(2, '0');
                orderNumber = day + timeCode + randomPart;
                break;
            }
        } while (this.usedNumbers.has(orderNumber));
        
        this.usedNumbers.add(orderNumber);
        this.minuteCounter++;
        
        return orderNumber;
    }

    // Formatierte Anzeige mit Bindestrichen
    format(orderNumber) {
        if (orderNumber.length === 6) {
            return `${orderNumber.slice(0, 2)}-${orderNumber.slice(2, 4)}-${orderNumber.slice(4)}`;
        }
        return orderNumber;
    }
}

// Singleton Instance
const orderNumberGenerator = new OrderNumberGenerator();

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrderNumberGenerator;
}