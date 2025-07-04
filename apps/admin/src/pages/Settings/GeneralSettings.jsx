/**
 * EATECH - General Settings with Theme Management
 * File Path: /apps/admin/src/pages/Settings/GeneralSettings.jsx
 */

import React from 'react';
import { Info } from 'lucide-react';
import { useTheme, ThemePreview } from '../../components/theme-system/ThemeSystem';
import styles from './Settings.module.css';

const THEMES = {
  'noir-excellence': { name: 'Noir Excellence', description: 'Elegant mit Gold' },
  'alpine-white': { name: 'Alpine White', description: 'Schweizer Klarheit' },
  'sunset-grill': { name: 'Sunset Grill', description: 'BBQ & Grill' },
  'ocean-breeze': { name: 'Ocean Breeze', description: 'Maritime Frische' },
  'urban-street': { name: 'Urban Street', description: 'Street Food Style' }
};

const GeneralSettings = () => {
  const { adminTheme, customerTheme } = useTheme();
  
  return (
    <div className={styles.settingsContent}>
      {/* Restaurant Info Section */}
      <div className={styles.section}>
        <h3>Restaurant-Informationen</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Restaurant Name</label>
            <input type="text" defaultValue="Demo Restaurant" />
          </div>
          <div className={styles.formGroup}>
            <label>Adresse</label>
            <input type="text" defaultValue="Bahnhofstrasse 1, 8001 Zürich" />
          </div>
          <div className={styles.formGroup}>
            <label>Telefon</label>
            <input type="tel" defaultValue="+41 44 123 45 67" />
          </div>
          <div className={styles.formGroup}>
            <label>E-Mail</label>
            <input type="email" defaultValue="info@demo-restaurant.ch" />
          </div>
        </div>
      </div>
      
      {/* Theme Settings Section */}
      <div className={styles.section}>
        <h3>Theme-Einstellungen</h3>
        
        <div className={styles.themeSettings}>
          <div className={styles.themeSetting}>
            <div className={styles.themeHeader}>
              <h4>Admin-Bereich Theme</h4>
              <span className={styles.badge}>Aktuell: {THEMES[adminTheme].name}</span>
            </div>
            <ThemePreview themeId={adminTheme} size="large" />
            <p className={styles.themeDescription}>
              Dieses Theme wird im Admin-Dashboard verwendet.
            </p>
          </div>
          
          <div className={styles.themeSetting}>
            <div className={styles.themeHeader}>
              <h4>Kunden-Bereich Theme</h4>
              <span className={styles.badge}>Aktuell: {THEMES[customerTheme].name}</span>
            </div>
            <ThemePreview themeId={customerTheme} size="large" />
            <p className={styles.themeDescription}>
              Dieses Theme sehen Ihre Kunden beim Bestellen.
            </p>
          </div>
        </div>
        
        <div className={styles.hint}>
          <Info size={16} />
          <p>Themes können über das Palette-Symbol in der Toolbar geändert werden.</p>
        </div>
      </div>
      
      {/* Business Hours Section */}
      <div className={styles.section}>
        <h3>Öffnungszeiten</h3>
        <div className={styles.hoursGrid}>
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
            <div key={day} className={styles.dayRow}>
              <span className={styles.dayName}>{day}</span>
              <input type="time" defaultValue="11:00" />
              <span>-</span>
              <input type="time" defaultValue="22:00" />
              <label className={styles.checkbox}>
                <input type="checkbox" defaultChecked />
                <span>Geöffnet</span>
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Language Settings */}
      <div className={styles.section}>
        <h3>Sprache & Region</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Standardsprache</label>
            <select defaultValue="de-CH">
              <option value="de-CH">Deutsch (Schweiz)</option>
              <option value="fr-CH">Français (Suisse)</option>
              <option value="it-CH">Italiano (Svizzera)</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Währung</label>
            <select defaultValue="CHF">
              <option value="CHF">CHF (Schweizer Franken)</option>
              <option value="EUR">EUR (Euro)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Zeitzone</label>
            <select defaultValue="Europe/Zurich">
              <option value="Europe/Zurich">Europe/Zurich</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className={styles.actions}>
        <button className={styles.saveButton}>
          Änderungen speichern
        </button>
      </div>
    </div>
  );
};

export default GeneralSettings;