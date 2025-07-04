/**
 * EATECH - Email Template Preview
 * Version: 24.0.0
 * Description: Vorschau-Komponente für E-Mail Templates mit Test-Versand
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/pages/email-templates/EmailTemplatePreview.jsx
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit3, Send, Smartphone, Monitor, Tablet,
  Download, Copy, CheckCircle, X, Info, Globe, Clock,
  User, Mail, Phone, MapPin, Package, Hash, Calendar
} from 'lucide-react';
import { ref, get } from 'firebase/database';
import { getDatabaseInstance } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import mjml2html from 'mjml-browser';
import { format } from 'date-fns';
import { de, fr, it } from 'date-fns/locale';
import styles from './EmailTemplatePreview.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const PREVIEW_DEVICES = {
  desktop: { width: '100%', label: 'Desktop', icon: Monitor },
  tablet: { width: '768px', label: 'Tablet', icon: Tablet },
  mobile: { width: '375px', label: 'Mobile', icon: Smartphone }
};

const TEST_DATA = {
  // Order Data
  orderNumber: '2024-1234',
  orderDate: format(new Date(), 'dd.MM.yyyy'),
  orderTime: format(new Date(), 'HH:mm'),
  orderStatus: 'Bestätigt',
  deliveryTime: '30-45 Minuten',
  
  // Customer Data
  customerName: 'Max Mustermann',
  customerEmail: 'max.mustermann@example.com',
  customerPhone: '+41 79 123 45 67',
  customerAddress: 'Bahnhofstrasse 1, 8001 Zürich',
  
  // Financial Data
  subtotal: 'CHF 45.00',
  tax: 'CHF 3.47',
  deliveryFee: 'CHF 5.00',
  totalAmount: 'CHF 53.47',
  
  // Business Data
  businessName: 'Burger Paradise',
  businessPhone: '+41 44 123 45 67',
  businessAddress: 'Paradeplatz 1, 8001 Zürich',
  businessEmail: 'info@burgerparadise.ch',
  
  // Order Items
  items: [
    { name: 'Classic Cheeseburger', quantity: 2, price: 'CHF 18.50', total: 'CHF 37.00' },
    { name: 'Pommes Frites', quantity: 1, price: 'CHF 8.00', total: 'CHF 8.00' }
  ],
  
  // Special Links
  trackingLink: 'https://eatech.ch/track/2024-1234',
  reviewLink: 'https://eatech.ch/review/2024-1234',
  unsubscribeLink: 'https://eatech.ch/unsubscribe/abc123'
};

// ============================================================================
// COMPONENT
// ============================================================================

const EmailTemplatePreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [device, setDevice] = useState('desktop');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testData, setTestData] = useState(TEST_DATA);
  const [sendingTest, setSendingTest] = useState(false);

  // Load template
  useEffect(() => {
    loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    try {
      const db = getDatabaseInstance();
      const snapshot = await get(ref(db, `emailTemplates/${id}`));
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTemplate(data);
        processTemplate(data.mjml || data.html);
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

  const processTemplate = (templateContent) => {
    try {
      let html;
      
      // Check if it's MJML or HTML
      if (templateContent.includes('<mjml>')) {
        const result = mjml2html(templateContent, {
          validationLevel: 'soft',
          minify: false
        });
        html = result.html;
      } else {
        html = templateContent;
      }
      
      // Replace variables with test data
      html = replaceVariables(html, testData);
      
      // Add responsive meta tags if not present
      if (!html.includes('viewport')) {
        html = html.replace('</head>', '<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>');
      }
      
      setHtmlContent(html);
    } catch (error) {
      console.error('Error processing template:', error);
      setHtmlContent('<p>Fehler bei der Vorschau-Generierung</p>');
    }
  };

  const replaceVariables = (html, data) => {
    let processedHtml = html;
    
    // Replace simple variables
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const placeholder = '{{' + key + '}}';
        processedHtml = processedHtml.split(placeholder).join(value);
      }
    });
    
    // Replace items list
    if (data.items && Array.isArray(data.items)) {
      const itemsHtml = data.items.map(item => `
        <tr>
          <td style="padding: 8px 0;">${item.quantity}x ${item.name}</td>
          <td style="padding: 8px 0; text-align: right;">${item.total}</td>
        </tr>
      `).join('');
      
      processedHtml = processedHtml.replace('{{items}}', itemsHtml);
    }
    
    return processedHtml;
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Bitte geben Sie eine E-Mail-Adresse ein');
      return;
    }
    
    setSendingTest(true);
    try {
      // In production, this would call a Cloud Function to send the email
      // For now, we'll simulate the send
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Test-E-Mail gesendet an ${testEmail}`);
      setShowTestModal(false);
      setTestEmail('');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Fehler beim Senden der Test-E-Mail');
    } finally {
      setSendingTest(false);
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name || 'template'}.html`;
    link.click();
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      toast.success('HTML in Zwischenablage kopiert');
    } catch (error) {
      console.error('Error copying HTML:', error);
      toast.error('Fehler beim Kopieren');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Lade Vorschau...</p>
      </div>
    );
  }

  if (!template) {
    return null;
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
          <div className={styles.templateInfo}>
            <h1 className={styles.title}>{template.name}</h1>
            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <Globe size={14} />
                {template.language}
              </span>
              <span className={styles.metaItem}>
                <Clock size={14} />
                {format(new Date(template.updatedAt || template.createdAt), 'dd.MM.yyyy HH:mm')}
              </span>
              <span className={`${styles.status} ${template.isActive ? styles.active : styles.inactive}`}>
                {template.isActive ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <button
            className={styles.actionButton}
            onClick={() => navigate(`/admin/email-templates/edit/${id}`)}
          >
            <Edit3 size={18} />
            Bearbeiten
          </button>
          <button
            className={styles.actionButton}
            onClick={() => setShowTestModal(true)}
          >
            <Send size={18} />
            Test senden
          </button>
          <button
            className={styles.actionButton}
            onClick={handleDownloadHtml}
          >
            <Download size={18} />
            HTML
          </button>
          <button
            className={styles.actionButton}
            onClick={handleCopyHtml}
          >
            <Copy size={18} />
            Kopieren
          </button>
        </div>
      </div>

      {/* Device Selector */}
      <div className={styles.deviceSelector}>
        {Object.entries(PREVIEW_DEVICES).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={key}
              className={`${styles.deviceButton} ${device === key ? styles.active : ''}`}
              onClick={() => setDevice(key)}
            >
              <Icon size={20} />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div className={styles.previewContainer}>
        <div className={styles.previewWrapper}>
          <div 
            className={`${styles.deviceFrame} ${styles[device]}`}
            style={{ maxWidth: PREVIEW_DEVICES[device].width }}
          >
            <iframe
              srcDoc={htmlContent}
              className={styles.previewIframe}
              title="Email Preview"
            />
          </div>
        </div>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Test-E-Mail senden</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowTestModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>E-Mail-Adresse</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className={styles.input}
                />
              </div>
              
              <div className={styles.testDataInfo}>
                <Info size={16} />
                <span>Die E-Mail wird mit Beispieldaten gesendet</span>
              </div>
              
              <div className={styles.testDataPreview}>
                <h4>Verwendete Testdaten:</h4>
                <div className={styles.testDataGrid}>
                  <div className={styles.testDataItem}>
                    <User size={14} />
                    <span className={styles.label}>Kunde:</span>
                    <span className={styles.value}>{testData.customerName}</span>
                  </div>
                  <div className={styles.testDataItem}>
                    <Hash size={14} />
                    <span className={styles.label}>Bestellung:</span>
                    <span className={styles.value}>#{testData.orderNumber}</span>
                  </div>
                  <div className={styles.testDataItem}>
                    <Package size={14} />
                    <span className={styles.label}>Restaurant:</span>
                    <span className={styles.value}>{testData.businessName}</span>
                  </div>
                  <div className={styles.testDataItem}>
                    <Calendar size={14} />
                    <span className={styles.label}>Datum:</span>
                    <span className={styles.value}>{testData.orderDate}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowTestModal(false)}
              >
                Abbrechen
              </button>
              <button
                className={styles.sendButton}
                onClick={handleSendTest}
                disabled={sendingTest || !testEmail}
              >
                <Send size={16} />
                {sendingTest ? 'Senden...' : 'Test senden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplatePreview;