# 🎨 EATECH Theme System - Epische Designs

## 🧠 Psychologische Farbforschung für Gastronomie

### Wissenschaftlich bewiesene Farben für Food Apps:

**ROT** (Appetit-Stimulation)
- Erhöht Herzfrequenz & Appetit
- Schafft Dringlichkeit
- Perfekt für CTAs und Bestell-Buttons
- Beispiele: McDonald's, KFC, Coca-Cola

**ORANGE** (Energie & Freude)
- Kombiniert Appetit (Rot) mit Fröhlichkeit (Gelb)
- Ideal für Aktionen und Angebote
- Ermutigt spontane Entscheidungen

**GELB** (Aufmerksamkeit & Glück)
- Schnellste wahrgenommene Farbe
- Steigert Optimismus
- Gut für Highlights und Badges

**GRÜN** (Frische & Gesundheit)
- Signalisiert frische Zutaten
- Beruhigend für die Augen
- Perfekt für vegetarische/gesunde Optionen

**BRAUN** (Natürlichkeit & Handwerk)
- Vermittelt Qualität und Tradition
- Ideal für Brot, Kaffee, Grill
- Schafft Vertrauen

## 🎨 Epische Theme-Kollektion

### 1. **"Swiss Fire"** (Standard-Theme)
```css
:root {
  /* Hauptfarben */
  --primary: #DA291C;        /* Schweizer Rot - Appetit */
  --primary-gradient: linear-gradient(135deg, #DA291C 0%, #FF6B6B 100%);
  --secondary: #FFFFFF;      /* Reinheit */
  --accent: #FFB800;         /* Gold - Premium Gefühl */
  
  /* Animierte Hintergründe */
  --hero-gradient: linear-gradient(
    -45deg, 
    #DA291C, 
    #FF6B6B, 
    #FFB800, 
    #FF8C42
  );
  --animation-gradient: 4s ease infinite;
  
  /* Glassmorphism */
  --glass: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --blur: blur(10px);
  
  /* Schatten mit Tiefe */
  --shadow-sm: 0 2px 10px rgba(218, 41, 28, 0.1);
  --shadow-md: 0 8px 30px rgba(218, 41, 28, 0.15);
  --shadow-lg: 0 15px 40px rgba(218, 41, 28, 0.2);
  --shadow-glow: 0 0 50px rgba(218, 41, 28, 0.3);
}

/* Animationen */
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(218, 41, 28, 0.5); }
  50% { box-shadow: 0 0 40px rgba(218, 41, 28, 0.8); }
}
```

### 2. **"Midnight Crave"** (Dark Mode)
```css
:root[data-theme="midnight"] {
  --primary: #FF6B6B;        /* Sanftes Rot für Dark Mode */
  --secondary: #1A1A2E;      /* Tiefes Dunkelblau */
  --accent: #F39C12;         /* Warmes Orange */
  --background: #0F0F1E;     /* Fast Schwarz */
  --surface: #16213E;        /* Erhöhte Fläche */
  
  /* Neon-Effekte */
  --neon-red: 0 0 10px #FF6B6B, 0 0 20px #FF6B6B, 0 0 30px #FF6B6B;
  --neon-orange: 0 0 10px #F39C12, 0 0 20px #F39C12, 0 0 30px #F39C12;
  
  /* Gradient Overlays */
  --overlay-gradient: radial-gradient(
    circle at top right,
    rgba(255, 107, 107, 0.1),
    transparent 50%
  );
}
```

### 3. **"Fresh Harvest"** (Gesund & Frisch)
```css
:root[data-theme="fresh"] {
  --primary: #27AE60;        /* Frisches Grün */
  --secondary: #ECF0F1;      /* Helles Grau */
  --accent: #E67E22;         /* Karotten-Orange */
  
  /* Organische Formen */
  --blob-1: radial-gradient(circle at 30% 40%, #27AE60 0%, transparent 50%);
  --blob-2: radial-gradient(circle at 70% 60%, #E67E22 0%, transparent 50%);
  
  /* Weiche Animationen */
  --transition-smooth: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 4. **"Street Food Neon"** (Festival/Event)
```css
:root[data-theme="neon"] {
  --primary: #FF006E;        /* Neon Pink */
  --secondary: #3A0CA3;      /* Electric Purple */
  --accent: #4CC9F0;         /* Cyan */
  
  /* Glitch-Effekte */
  --glitch-1: #FF006E;
  --glitch-2: #4CC9F0;
  
  /* Neon-Schriften */
  --text-glow: 
    0 0 10px currentColor,
    0 0 20px currentColor,
    0 0 40px currentColor;
}
```

### 5. **"Craft & Wood"** (Handwerk/Rustikal)
```css
:root[data-theme="craft"] {
  --primary: #6F4E37;        /* Kaffeebraun */
  --secondary: #F5E6D3;      /* Cremig */
  --accent: #D2691E;         /* Schokolade */
  
  /* Texturen */
  --texture-wood: url('/textures/wood-grain.svg');
  --texture-paper: url('/textures/kraft-paper.svg');
  
  /* Warme Schatten */
  --shadow-warm: 0 4px 20px rgba(111, 78, 55, 0.3);
}
```

## 🎭 Animations-Bibliothek

### Micro-Interactions
```css
/* Burger-Flip beim Hover */
.product-card:hover .product-image {
  animation: flip-burger 0.6s ease-in-out;
}

@keyframes flip-burger {
  0% { transform: rotateY(0deg) scale(1); }
  50% { transform: rotateY(180deg) scale(1.1); }
  100% { transform: rotateY(360deg) scale(1); }
}

/* Pommes-Shake */
.fries-icon {
  animation: shake 2s ease-in-out infinite;
}

@keyframes shake {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

/* Bestell-Button Pulse */
.order-button {
  animation: pulse-grow 2s ease-in-out infinite;
}

@keyframes pulse-grow {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Erfolgs-Animation */
@keyframes success-bounce {
  0% { transform: scale(0) rotate(0deg); }
  50% { transform: scale(1.2) rotate(180deg); }
  100% { transform: scale(1) rotate(360deg); }
}
```

### Page Transitions
```css
/* Smooth Slide */
.page-enter {
  opacity: 0;
  transform: translateX(100px);
}

.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Morph Transition */
.morph-transition {
  transition: 
    clip-path 0.6s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 🌈 Farbverläufe die begeistern

### Appetit-Gradient
```css
.appetite-gradient {
  background: linear-gradient(
    135deg,
    #FF6B6B 0%,
    #FFB800 25%,
    #FF8C42 50%,
    #DA291C 75%,
    #C91A09 100%
  );
  background-size: 400% 400%;
  animation: gradient-flow 15s ease infinite;
}
```

### Aurora-Effekt (für Premium)
```css
.aurora-bg {
  background: 
    radial-gradient(ellipse at top, #FF6B6B22, transparent 40%),
    radial-gradient(ellipse at bottom, #FFB80022, transparent 40%),
    radial-gradient(ellipse at left, #4CC9F022, transparent 40%);
  animation: aurora-shift 10s ease-in-out infinite;
}
```

### Glassmorphism Cards
```css
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 8px 32px 0 rgba(31, 38, 135, 0.15),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}
```

## 🎪 Special Effects

### Konfetti für Bestellabschluss
```javascript
const confettiConfig = {
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
  colors: ['#DA291C', '#FFB800', '#FF6B6B', '#4CC9F0']
};
```

### Parallax Food Images
```css
.parallax-food {
  transform: translateY(calc(var(--scroll-y) * 0.5));
  will-change: transform;
}
```

### 3D Tilt für Karten
```javascript
const tiltOptions = {
  max: 15,
  perspective: 1000,
  scale: 1.05,
  speed: 1000,
  glare: true,
  'max-glare': 0.3
};
```

## 🎛️ Theme-Customizer für Trucks

```typescript
interface CustomTheme {
  // Basis
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  
  // Erweitert
  gradientAngle: number;
  gradientStops: ColorStop[];
  
  // Effekte
  animations: {
    buttonHover: 'pulse' | 'glow' | 'slide' | 'morph';
    cardEntry: 'fade' | 'slide' | 'zoom' | 'flip';
    successAnimation: 'confetti' | 'fireworks' | 'bounce';
  };
  
  // Schatten & Glow
  shadowIntensity: 'none' | 'subtle' | 'medium' | 'dramatic';
  glowEffects: boolean;
  
  // Spezial
  particleBackground: boolean;
  audioFeedback: boolean;
}
```

## 📱 Responsive Animations

### Mobile-First Approach
```css
/* Reduzierte Animationen für Mobile */
@media (max-width: 768px) {
  * {
    animation-duration: 0.3s !important;
  }
  
  /* Keine komplexen Effekte */
  .parallax-food {
    transform: none !important;
  }
}

/* Respektiere User-Präferenzen */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

## 🔊 Sound Design (Optional)

```javascript
const soundEffects = {
  addToCart: '/sounds/pop.mp3',
  orderComplete: '/sounds/success.mp3',
  notification: '/sounds/ding.mp3',
  error: '/sounds/error.mp3'
};

// Nur wenn aktiviert
if (userSettings.soundEnabled) {
  new Audio(soundEffects.addToCart).play();
}
```

---

**Diese Themes sind psychologisch optimiert für maximalen Appetit und Bestellfreude! 🍔🎨**
