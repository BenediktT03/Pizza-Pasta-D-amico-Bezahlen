/**
 * EATECH Local Storage Hook
 * Persistent state management with localStorage
 * File Path: /apps/web/src/hooks/useLocalStorage.js
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing localStorage with React state
 * @param {string} key - Storage key
 * @param {any} initialValue - Default value if none exists
 * @returns {[any, Function, Function]} - [value, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue) => {
  // Get initial value from localStorage or use default
  const getStoredValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  // State to hold current value
  const [storedValue, setStoredValue] = useState(getStoredValue);

  // Update localStorage when state changes
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        
        // Dispatch storage event for other tabs
        window.dispatchEvent(new StorageEvent('storage', {
          key,
          newValue: JSON.stringify(valueToStore),
          oldValue: JSON.stringify(storedValue),
          storageArea: window.localStorage,
          url: window.location.href
        }));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        
        // Dispatch storage event for other tabs
        window.dispatchEvent(new StorageEvent('storage', {
          key,
          newValue: null,
          oldValue: JSON.stringify(storedValue),
          storageArea: window.localStorage,
          url: window.location.href
        }));
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, storedValue]);

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Error parsing storage event value:', error);
        }
      } else if (e.key === key && e.newValue === null) {
        setStoredValue(initialValue);
      }
    };

    // Add event listener
    window.addEventListener('storage', handleStorageChange);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

/**
 * Hook for managing sessionStorage with React state
 * Same API as useLocalStorage but uses sessionStorage
 */
export const useSessionStorage = (key, initialValue) => {
  // Get initial value from sessionStorage or use default
  const getStoredValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  // State to hold current value
  const [storedValue, setStoredValue] = useState(getStoredValue);

  // Update sessionStorage when state changes
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to sessionStorage
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Remove value from sessionStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

// Export storage utilities
export const storage = {
  // Get item from localStorage
  get: (key, defaultValue = null) => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error getting localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  // Set item in localStorage
  set: (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
      return false;
    }
  },

  // Remove item from localStorage
  remove: (key) => {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  },

  // Clear all localStorage
  clear: () => {
    try {
      window.localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  },

  // Get storage size
  getSize: () => {
    let size = 0;
    for (let key in window.localStorage) {
      if (window.localStorage.hasOwnProperty(key)) {
        size += window.localStorage[key].length + key.length;
      }
    }
    return size;
  },

  // Check if storage is available
  isAvailable: () => {
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }
};