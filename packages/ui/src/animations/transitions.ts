import { Variants, Transition } from 'framer-motion';

// Common transitions
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};

export const smoothTransition: Transition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3,
};

export const bounceTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 15,
};

// Fade variants
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// Scale variants
export const scaleIn: Variants = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  exit: { scale: 0 },
};

export const scaleInCenter: Variants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

export const scaleBounce: Variants = {
  initial: { scale: 0 },
  animate: { 
    scale: 1,
    transition: bounceTransition,
  },
  exit: { scale: 0 },
};

// Slide variants
export const slideInRight: Variants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
};

export const slideInLeft: Variants = {
  initial: { x: '-100%' },
  animate: { x: 0 },
  exit: { x: '-100%' },
};

export const slideInTop: Variants = {
  initial: { y: '-100%' },
  animate: { y: 0 },
  exit: { y: '-100%' },
};

export const slideInBottom: Variants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
};

// Rotate variants
export const rotateIn: Variants = {
  initial: { rotate: -180, opacity: 0 },
  animate: { rotate: 0, opacity: 1 },
  exit: { rotate: 180, opacity: 0 },
};

export const rotateScale: Variants = {
  initial: { rotate: -180, scale: 0 },
  animate: { rotate: 0, scale: 1 },
  exit: { rotate: 180, scale: 0 },
};

// Stagger children
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// Complex animations
export const cardHover: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02,
    y: -5,
    transition: springTransition,
  },
  tap: {
    scale: 0.98,
  },
};

export const buttonTap: Variants = {
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 },
  },
};

export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent: Variants = {
  initial: { scale: 0.95, opacity: 0, y: 20 },
  animate: { 
    scale: 1, 
    opacity: 1, 
    y: 0,
    transition: springTransition,
  },
  exit: { 
    scale: 0.95, 
    opacity: 0, 
    y: 20,
    transition: smoothTransition,
  },
};

export const drawerLeft: Variants = {
  initial: { x: '-100%' },
  animate: { 
    x: 0,
    transition: springTransition,
  },
  exit: { 
    x: '-100%',
    transition: smoothTransition,
  },
};

export const drawerRight: Variants = {
  initial: { x: '100%' },
  animate: { 
    x: 0,
    transition: springTransition,
  },
  exit: { 
    x: '100%',
    transition: smoothTransition,
  },
};

// Page transitions
export const pageTransition: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
};

// List animations
export const listContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const listItem: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: smoothTransition,
  },
};

// Accordion animations
export const accordionContent: Variants = {
  collapsed: { 
    height: 0,
    opacity: 0,
    transition: smoothTransition,
  },
  expanded: { 
    height: 'auto',
    opacity: 1,
    transition: smoothTransition,
  },
};

// Tooltip animations
export const tooltip: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.15,
      ease: 'easeOut',
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: {
      duration: 0.1,
      ease: 'easeIn',
    },
  },
};

// Notification animations
export const notificationSlide: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: springTransition,
  },
  exit: { 
    x: '100%', 
    opacity: 0,
    transition: smoothTransition,
  },
};

// Loading animations
export const pulseScale: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const spinRotate: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Swiss theme specific animations
export const swissFlagWave: Variants = {
  animate: {
    rotateY: [0, 5, -5, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Utility function to create custom variants
export const createVariants = (
  initial: any,
  animate: any,
  exit?: any,
  transition?: Transition
): Variants => ({
  initial,
  animate: { ...animate, transition },
  exit: exit || initial,
});

// Animation presets for common use cases
export const animationPresets = {
  fadeIn,
  fadeInUp,
  fadeInDown,
  slideInRight,
  slideInLeft,
  scaleIn,
  rotateIn,
  modalOverlay,
  modalContent,
  cardHover,
  buttonTap,
  tooltip,
  pageTransition,
} as const;

export type AnimationPreset = keyof typeof animationPresets;
