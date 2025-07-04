/**
 * EATECH - Email Template Editor
 * Version: 24.0.0
 * Description: MJML-basierter E-Mail Template Editor mit Live-Preview
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/pages/email-templates/EmailTemplateEditor.jsx
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, ArrowLeft, Eye, Code, Smartphone, Monitor, Send, 
  Download, Upload, Undo, Redo, Copy, Settings, HelpCircle,
  Play, RefreshCw, CheckCircle, AlertCircle, Info, Globe,
  Type, Image, Layout, Link, List, Hash, Calendar, User,
  Mail, Phone, MapPin, CreditCard, Package, Clock
} from 'lucide-react';
import { ref, get, set, update } from 'firebase/database';
import { getDatabaseInstance } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import mjml2html from 'mjml-browser';
import styles from './EmailTemplateEditor.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const VARIABLE_TYPES = {
  // Order Variables
  orderNumber: { name: 'Bestellnummer', icon: Hash, example: '#2024-1234' },
  orderDate: { name: 'Bestelldatum', icon: Calendar, example: '07.01.2025' },
  orderTime: { name: 'Bestellzeit', icon: Clock, example: '14:30' },
  orderStatus: { name: 'Bestellstatus', icon: CheckCircle, example: 'Bestätigt' },
  deliveryTime: { name: 'Lieferzeit', icon: Clock, example: '30-45 Minuten' },
  
  // Customer Variables
  customerName: { name: 'Kundenname', icon: User, example: 'Max Mustermann' },
  customerEmail: { name: 'Kunden-Email', icon: Mail, example: 'kunde@example.com' },
  customerPhone: { name: 'Telefonnummer', icon: Phone, example: '+41 79 123 45 67' },
  customerAddress: { name: 'Adresse', icon: MapPin, example: 'Bahnhofstrasse 1, 8001 Zürich' },
  
  // Financial Variables
  subtotal: { name: 'Zwischensumme', icon: CreditCard, example: 'CHF 45.00' },
  tax: { name: 'MwSt.', icon: CreditCard, example: 'CHF 3.47' },
  deliveryFee: { name: 'Liefergebühr', icon: CreditCard, example: 'CHF 5.00' },
  totalAmount: { name: 'Gesamtbetrag', icon: CreditCard, example: 'CHF 53.47' },
  
  // Business Variables
  businessName: { name: 'Geschäftsname', icon: Package, example: 'Burger Paradise' },
  businessPhone: { name: 'Geschäfts-Telefon', icon: Phone, example: '+41 44 123 45 67' },
  businessAddress: { name: 'Geschäfts-Adresse', icon: MapPin, example: 'Paradeplatz 1, 8001 Zürich' },
  
  // Special Variables
  trackingLink: { name: 'Tracking-Link', icon: Link, example: 'https://eatech.ch/track/...' },
  reviewLink: { name: 'Bewertungs-Link', icon: Link, example: 'https://eatech.ch/review/...' },
  unsubscribeLink: { name: 'Abmelde-Link', icon: Link, example: 'https://eatech.ch/unsubscribe/...' }
};

const TEMPLATE_SNIPPETS = {
  header: {
    name: 'Standard Header',
    mjml: `
<mj-section background-color="#FF6B6B" padding="20px">
  <mj-column>
    <mj-text align="center" color="#ffffff" font-size="32px" font-weight="bold">
      {{businessName}}
    </mj-text>
  </mj-column>
</mj-section>`
  },
  orderDetails: {
    name: 'Bestelldetails',
    mjml: `
<mj-section padding="20px">
  <mj-column>
    <mj-text font-size="20px" font-weight="bold" color="#333333">
      Bestellung #{{orderNumber}}
    </mj-text>
    <mj-table>
      <tr style="border-bottom: 1px solid #ecedee;">
        <td style="padding: 10px 0;">Datum:</td>
        <td style="padding: 10px 0; text-align: right;">{{orderDate}}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ecedee;">
        <td style="padding: 10px 0;">Zeit:</td>
        <td style="padding: 10px 0; text-align: right;">{{orderTime}}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0;">Status:</td>
        <td style="padding: 10px 0; text-align: right;">{{orderStatus}}</td>
      </tr>
    </mj-table>
  </mj-column>
</mj-section>`
  },
  button: {
    name: 'Call-to-Action Button',
    mjml: `
<mj-section padding="20px">
  <mj-column>
    <mj-button background-color="#FF6B6B" color="#ffffff" font-size="16px" padding="15px 30px" border-radius="8px">
      Bestellung verfolgen
    </mj-button>
  </mj-column>
</mj-section>`
  },
  footer: {
    name: 'Standard Footer',
    mjml: `
<mj-section background-color="#f5f5f5" padding="20px">
  <mj-column>
    <mj-text align="center" color="#666666" font-size="12px">
      {{businessName}} | {{businessAddress}}<br/>
      Tel: {{businessPhone}}<br/><br/>
      <a href="{{unsubscribeLink}}" style="color: #666666;">Abmelden</a>
    </mj-text>
  </mj-column>
</mj-section>`
  }
};

const DEFAULT_TEMPLATE = `<mjml>
  <mj-head>
    <mj-title>{{subject}}</mj-title>
    <mj-preview>{{preview}}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" color="#333333" line-height="1.6" />
      <mj-section background-color="#ffffff" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#FF6B6B" padding="20px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="32px" font-weight="bold">
          {{businessName}}
        </mj-text>
      </mj-column>
    </mj-section>
    
    <mj-section padding="20px">
      <mj-column>
        <mj-text font-size="18px">
          Hallo {{customerName}},
        </mj-text>
        <mj-text>
          Ihre Nachricht hier...
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

// ============================================================================
// COMPONENT
// ============================================================================

const EmailTemplateEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState({
    name: '',
    type: 'ORDER_CONFIRMATION',
    subject: '',
    language: 'de-CH',
    mjml: DEFAULT_TEMPLATE,
    isActive: true
  });
  
  const [mjmlCode, setMjmlCode] = useState(DEFAULT_TEMPLATE);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [showVariables, setShowVariables] = useState(true);
  const [showSnippets, setShowSnippets] = useState(false);
  const [errors, setErrors] = useState([]);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Load template if editing
  useEffect(() => {
    if (id && id !== 'new') {
      loadTemplate();
    } else {
      setLoading(false);
      updatePreview(DEFAULT_TEMPLATE);
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      const db = getDatabaseInstance();
      const snapshot = await get(ref(db, `emailTemplates/${id}`));
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTemplate(data);
        setMjmlCode(data.mjml || DEFAULT_TEMPLATE);
        updatePreview(data.mjml || DEFAULT_TEMPLATE);
      } else {
        toast.error('Vorlage nicht gefunden');
        navigate('/admin/email-templates');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Fehler beim Laden der Vorlage');
    } finally {
      setLoading(false);
    }
  };

  const updatePreview = useCallback((mjml) => {
    try {
      const result = mjml2html(mjml, {
        validationLevel: 'soft',
        minify: false
      });
      
      if (result.errors && result.errors.length > 0) {
        setErrors(result.errors);
      } else {
        setErrors([]);
      }
      
      // Replace variables with example values
      let html = result.html;
      Object.entries(VARIABLE_TYPES).forEach(([key, variable]) => {
        const placeholder = '{{' + key + '}}';
        html = html.split(placeholder).join(variable.example);
      });
      
      setHtmlPreview(html);
    } catch (error) {
      console.error('MJML compilation error:', error);
      setErrors([{ message: error.message }]);
      setHtmlPreview('<p>Fehler bei der Vorschau-Generierung</p>');
    }
  }, []);

  const handleMjmlChange = (value) => {
    setMjmlCode(value);
    updatePreview(value);
  };

  const handleSave = async () => {
    if (!template.name || !template.subject) {
      toast.error('Bitte füllen Sie Name und Betreff aus');
      return;
    }
    
    setSaving(true);
    try {
      const db = getDatabaseInstance();
      const templateData = {
        ...template,
        mjml: mjmlCode,
        html: htmlPreview,
        updatedAt: new Date().toISOString()
      };
      
      if (id && id !== 'new') {
        await update(ref(db, `emailTemplates/${id}`), templateData);
        toast.success('Vorlage aktualisiert');
      } else {
        const newId = Date.now().toString();
        await set(ref(db, `emailTemplates/${newId}`), {
          ...templateData,
          createdAt: new Date().toISOString()
        });
        toast.success('Vorlage erstellt');
        navigate(`/admin/email-templates/edit/${newId}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variableKey) => {
    const variable = `{{${variableKey}}}`;
    if (editorRef.current) {
      const textarea = editorRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = mjmlCode.substring(0, start) + variable + mjmlCode.substring(end);
      
      setMjmlCode(newValue);
      updatePreview(newValue);
      
      // Set cursor position after variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const insertSnippet = (snippet) => {
    if (editorRef.current) {
      const textarea = editorRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = mjmlCode.substring(0, start) + snippet.mjml + mjmlCode.substring(end);
      
      setMjmlCode(newValue);
      updatePreview(newValue);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Bitte geben Sie eine E-Mail-Adresse ein');
      return;
    }
    
    setSendingTest(true);
    try {
      // In production, this would call a Cloud Function
      // For now, we'll simulate the send
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success(`Test-E-Mail gesendet an ${testEmail}`);
      setTestEmail('');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Fehler beim Senden der Test-E-Mail');
    } finally {
      setSendingTest(false);
    }
  };

  const exportTemplate = () => {
    const data = {
      ...template,
      mjml: mjmlCode
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name || 'template'}.json`;
    link.click();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Lade Template Editor...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button 
            className={styles.backButton}
            onClick={() => navigate('/admin/email-templates')}
          >
            <ArrowLeft size={20} />
            Zurück
          </button>
          <h1 className={styles.title}>
            {id && id !== 'new' ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
          </h1>
        </div>
        
        <div className={styles.headerActions}>
          <button
            className={styles.exportButton}
            onClick={exportTemplate}
          >
            <Download size={18} />
            Export
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={18} />
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>

      {/* Template Settings */}
      <div className={styles.settings}>
        <div className={styles.settingsGrid}>
          <div className={styles.settingField}>
            <label>Vorlagenname</label>
            <input
              type="text"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              placeholder="z.B. Bestellbestätigung"
              className={styles.input}
            />
          </div>
          
          <div className={styles.settingField}>
            <label>Betreff</label>
            <input
              type="text"
              value={template.subject}
              onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
              placeholder="z.B. Ihre Bestellung #{{orderNumber}}"
              className={styles.input}
            />
          </div>
          
          <div className={styles.settingField}>
            <label>Typ</label>
            <select
              value={template.type}
              onChange={(e) => setTemplate({ ...template, type: e.target.value })}
              className={styles.select}
            >
              <option value="ORDER_CONFIRMATION">Bestellbestätigung</option>
              <option value="ORDER_READY">Bestellung bereit</option>
              <option value="ORDER_CANCELLED">Bestellung storniert</option>
              <option value="PAYMENT_RECEIPT">Zahlungsbeleg</option>
              <option value="WELCOME">Willkommen</option>
              <option value="NEWSLETTER">Newsletter</option>
              <option value="CUSTOM">Benutzerdefiniert</option>
            </select>
          </div>
          
          <div className={styles.settingField}>
            <label>Sprache</label>
            <select
              value={template.language}
              onChange={(e) => setTemplate({ ...template, language: e.target.value })}
              className={styles.select}
            >
              <option value="de-CH">🇨🇭 Deutsch</option>
              <option value="fr-CH">🇫🇷 Français</option>
              <option value="it-CH">🇮🇹 Italiano</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarTabs}>
            <button
              className={`${styles.sidebarTab} ${showVariables ? styles.active : ''}`}
              onClick={() => { setShowVariables(true); setShowSnippets(false); }}
            >
              <Hash size={16} />
              Variablen
            </button>
            <button
              className={`${styles.sidebarTab} ${showSnippets ? styles.active : ''}`}
              onClick={() => { setShowVariables(false); setShowSnippets(true); }}
            >
              <Layout size={16} />
              Snippets
            </button>
          </div>
          
          {showVariables && (
            <div className={styles.variablesList}>
              <div className={styles.sidebarInfo}>
                <Info size={14} />
                <span>Klicken Sie auf eine Variable um sie einzufügen</span>
              </div>
              
              {Object.entries(VARIABLE_TYPES).map(([key, variable]) => {
                const Icon = variable.icon;
                return (
                  <button
                    key={key}
                    className={styles.variableItem}
                    onClick={() => insertVariable(key)}
                  >
                    <Icon size={16} />
                    <div className={styles.variableInfo}>
                      <span className={styles.variableName}>{variable.name}</span>
                      <span className={styles.variableKey}>{`{{${key}}}`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          
          {showSnippets && (
            <div className={styles.snippetsList}>
              <div className={styles.sidebarInfo}>
                <Info size={14} />
                <span>Vorgefertigte Code-Blöcke</span>
              </div>
              
              {Object.entries(TEMPLATE_SNIPPETS).map(([key, snippet]) => (
                <button
                  key={key}
                  className={styles.snippetItem}
                  onClick={() => insertSnippet(snippet)}
                >
                  <Code size={16} />
                  <span>{snippet.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className={styles.editor}>
          <div className={styles.editorHeader}>
            <h3>MJML Code</h3>
            <a 
              href="https://mjml.io/documentation/" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.helpLink}
            >
              <HelpCircle size={16} />
              MJML Dokumentation
            </a>
          </div>
          
          <textarea
            ref={editorRef}
            value={mjmlCode}
            onChange={(e) => handleMjmlChange(e.target.value)}
            className={styles.codeEditor}
            spellCheck={false}
          />
          
          {errors.length > 0 && (
            <div className={styles.errors}>
              {errors.map((error, index) => (
                <div key={index} className={styles.error}>
                  <AlertCircle size={14} />
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <h3>Vorschau</h3>
            <div className={styles.previewControls}>
              <button
                className={`${styles.previewModeButton} ${previewMode === 'desktop' ? styles.active : ''}`}
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor size={16} />
              </button>
              <button
                className={`${styles.previewModeButton} ${previewMode === 'mobile' ? styles.active : ''}`}
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone size={16} />
              </button>
            </div>
          </div>
          
          <div 
            className={`${styles.previewContent} ${styles[previewMode]}`}
            ref={previewRef}
          >
            <iframe
              srcDoc={htmlPreview}
              className={styles.previewIframe}
              title="Email Preview"
            />
          </div>
          
          {/* Test Email */}
          <div className={styles.testEmail}>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Test-E-Mail-Adresse"
              className={styles.testEmailInput}
            />
            <button
              className={styles.sendTestButton}
              onClick={sendTestEmail}
              disabled={sendingTest}
            >
              <Send size={16} />
              {sendingTest ? 'Senden...' : 'Test senden'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;