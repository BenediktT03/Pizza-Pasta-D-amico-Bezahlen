/**
 * EATECH - Email Templates List
 * Version: 24.0.0
 * Description: Verwaltung aller E-Mail-Vorlagen mit CRUD-Operationen
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/pages/email-templates/EmailTemplatesList.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Plus, Search, Filter, Edit3, Trash2, Copy, Eye,
  CheckCircle, XCircle, Globe, Send, FileText, Code,
  Clock, User, Calendar, ChevronRight, Download, Upload,
  RefreshCw, Settings, Zap, AlertCircle, Info
} from 'lucide-react';
import { ref, onValue, remove, update } from 'firebase/database';
import { getDatabaseInstance } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { de, fr, it } from 'date-fns/locale';
import styles from './EmailTemplatesList.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const TEMPLATE_TYPES = {
  ORDER_CONFIRMATION: {
    id: 'ORDER_CONFIRMATION',
    name: 'Bestellbestätigung',
    icon: CheckCircle,
    color: '#4CAF50',
    variables: ['orderNumber', 'customerName', 'totalAmount', 'items', 'deliveryTime']
  },
  ORDER_READY: {
    id: 'ORDER_READY',
    name: 'Bestellung bereit',
    icon: CheckCircle,
    color: '#2196F3',
    variables: ['orderNumber', 'customerName', 'pickupCode']
  },
  ORDER_CANCELLED: {
    id: 'ORDER_CANCELLED',
    name: 'Bestellung storniert',
    icon: XCircle,
    color: '#F44336',
    variables: ['orderNumber', 'customerName', 'reason', 'refundAmount']
  },
  PAYMENT_RECEIPT: {
    id: 'PAYMENT_RECEIPT',
    name: 'Zahlungsbeleg',
    icon: FileText,
    color: '#9C27B0',
    variables: ['orderNumber', 'amount', 'paymentMethod', 'transactionId']
  },
  WELCOME: {
    id: 'WELCOME',
    name: 'Willkommens-Email',
    icon: Mail,
    color: '#FF9800',
    variables: ['customerName', 'businessName', 'welcomeCode']
  },
  LOYALTY_REWARD: {
    id: 'LOYALTY_REWARD',
    name: 'Treuepunkt-Belohnung',
    icon: Zap,
    color: '#FFD700',
    variables: ['customerName', 'points', 'reward', 'expiryDate']
  },
  NEWSLETTER: {
    id: 'NEWSLETTER',
    name: 'Newsletter',
    icon: Send,
    color: '#00BCD4',
    variables: ['customerName', 'unsubscribeLink']
  },
  REVIEW_REQUEST: {
    id: 'REVIEW_REQUEST',
    name: 'Bewertungsanfrage',
    icon: User,
    color: '#795548',
    variables: ['customerName', 'orderNumber', 'reviewLink']
  }
};

const LANGUAGES = {
  'de-CH': { name: 'Deutsch', flag: '🇨🇭' },
  'fr-CH': { name: 'Français', flag: '🇫🇷' },
  'it-CH': { name: 'Italiano', flag: '🇮🇹' },
  'en': { name: 'English', flag: '🇬🇧' }
};

// ============================================================================
// COMPONENT
// ============================================================================

const EmailTemplatesList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Load templates from Firebase
  useEffect(() => {
    const db = getDatabaseInstance();
    const templatesRef = ref(db, 'emailTemplates');

    const unsubscribe = onValue(templatesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const templatesList = Object.entries(data).map(([id, template]) => ({
        id,
        ...template
      }));
      setTemplates(templatesList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.subject?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || template.type === filterType;
      const matchesLanguage = filterLanguage === 'all' || template.language === filterLanguage;
      
      return matchesSearch && matchesType && matchesLanguage;
    });
  }, [templates, searchTerm, filterType, filterLanguage]);

  // Handlers
  const handleCreateTemplate = () => {
    navigate('/admin/email-templates/new');
  };

  const handleEditTemplate = (templateId) => {
    navigate(`/admin/email-templates/edit/${templateId}`);
  };

  const handlePreviewTemplate = (templateId) => {
    navigate(`/admin/email-templates/preview/${templateId}`);
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      const db = getDatabaseInstance();
      const newTemplateRef = ref(db, 'emailTemplates');
      
      const duplicatedTemplate = {
        ...template,
        name: `${template.name} (Kopie)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: false
      };
      
      delete duplicatedTemplate.id;
      
      await update(newTemplateRef, {
        [Date.now()]: duplicatedTemplate
      });
      
      toast.success('Vorlage erfolgreich dupliziert');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Fehler beim Duplizieren der Vorlage');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      const db = getDatabaseInstance();
      await remove(ref(db, `emailTemplates/${templateId}`));
      toast.success('Vorlage erfolgreich gelöscht');
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Fehler beim Löschen der Vorlage');
    }
  };

  const handleToggleActive = async (template) => {
    try {
      const db = getDatabaseInstance();
      await update(ref(db, `emailTemplates/${template.id}`), {
        isActive: !template.isActive,
        updatedAt: new Date().toISOString()
      });
      
      toast.success(
        template.isActive 
          ? 'Vorlage deaktiviert' 
          : 'Vorlage aktiviert'
      );
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Fehler beim Ändern des Status');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTemplates.length === 0) return;
    
    if (window.confirm(`Möchten Sie ${selectedTemplates.length} Vorlagen löschen?`)) {
      try {
        const db = getDatabaseInstance();
        const deletePromises = selectedTemplates.map(id => 
          remove(ref(db, `emailTemplates/${id}`))
        );
        
        await Promise.all(deletePromises);
        toast.success(`${selectedTemplates.length} Vorlagen gelöscht`);
        setSelectedTemplates([]);
      } catch (error) {
        console.error('Error bulk deleting:', error);
        toast.error('Fehler beim Löschen der Vorlagen');
      }
    }
  };

  const handleExportTemplates = () => {
    const exportData = filteredTemplates.map(template => ({
      ...template,
      id: undefined
    }));
    
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-templates-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
  };

  const getTemplateIcon = (type) => {
    const templateType = TEMPLATE_TYPES[type];
    return templateType ? templateType.icon : Mail;
  };

  const getTemplateColor = (type) => {
    const templateType = TEMPLATE_TYPES[type];
    return templateType ? templateType.color : '#666';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Lade E-Mail-Vorlagen...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <Mail size={32} />
            E-Mail Vorlagen
          </h1>
          <p className={styles.subtitle}>
            Verwalten Sie Ihre E-Mail-Vorlagen für automatische Benachrichtigungen
          </p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.exportButton}
            onClick={handleExportTemplates}
          >
            <Download size={18} />
            Exportieren
          </button>
          <button 
            className={styles.createButton}
            onClick={handleCreateTemplate}
          >
            <Plus size={18} />
            Neue Vorlage
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Vorlagen suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Typen</option>
            {Object.entries(TEMPLATE_TYPES).map(([key, type]) => (
              <option key={key} value={key}>{type.name}</option>
            ))}
          </select>

          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Sprachen</option>
            {Object.entries(LANGUAGES).map(([key, lang]) => (
              <option key={key} value={key}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>

          {selectedTemplates.length > 0 && (
            <button 
              className={styles.bulkDeleteButton}
              onClick={handleBulkDelete}
            >
              <Trash2 size={16} />
              {selectedTemplates.length} löschen
            </button>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      <div className={styles.templatesGrid}>
        {filteredTemplates.map(template => {
          const Icon = getTemplateIcon(template.type);
          const color = getTemplateColor(template.type);
          const isSelected = selectedTemplates.includes(template.id);

          return (
            <div 
              key={template.id} 
              className={`${styles.templateCard} ${isSelected ? styles.selected : ''}`}
            >
              <div className={styles.templateHeader}>
                <div 
                  className={styles.templateIcon}
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  <Icon size={24} />
                </div>
                <div className={styles.templateMeta}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTemplates([...selectedTemplates, template.id]);
                      } else {
                        setSelectedTemplates(selectedTemplates.filter(id => id !== template.id));
                      }
                    }}
                    className={styles.checkbox}
                  />
                  <div 
                    className={`${styles.statusBadge} ${template.isActive ? styles.active : styles.inactive}`}
                  >
                    {template.isActive ? 'Aktiv' : 'Inaktiv'}
                  </div>
                </div>
              </div>

              <h3 className={styles.templateName}>{template.name}</h3>
              
              <div className={styles.templateInfo}>
                <div className={styles.infoItem}>
                  <Globe size={14} />
                  <span>{LANGUAGES[template.language]?.name || template.language}</span>
                </div>
                <div className={styles.infoItem}>
                  <Clock size={14} />
                  <span>
                    {format(new Date(template.updatedAt || template.createdAt), 'dd.MM.yyyy')}
                  </span>
                </div>
              </div>

              {template.subject && (
                <p className={styles.templateSubject}>
                  Betreff: {template.subject}
                </p>
              )}

              <div className={styles.templateActions}>
                <button
                  className={styles.actionButton}
                  onClick={() => handlePreviewTemplate(template.id)}
                  title="Vorschau"
                >
                  <Eye size={16} />
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => handleEditTemplate(template.id)}
                  title="Bearbeiten"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => handleDuplicateTemplate(template)}
                  title="Duplizieren"
                >
                  <Copy size={16} />
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => handleToggleActive(template)}
                  title={template.isActive ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {template.isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}
                </button>
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => setShowDeleteConfirm(template.id)}
                  title="Löschen"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Delete Confirmation */}
              {showDeleteConfirm === template.id && (
                <div className={styles.deleteConfirm}>
                  <p>Vorlage wirklich löschen?</p>
                  <div className={styles.confirmActions}>
                    <button
                      className={styles.confirmButton}
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      Ja, löschen
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={() => setShowDeleteConfirm(null)}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className={styles.emptyState}>
          <Mail size={64} />
          <h3>Keine Vorlagen gefunden</h3>
          <p>
            {searchTerm || filterType !== 'all' || filterLanguage !== 'all'
              ? 'Versuchen Sie andere Filtereinstellungen'
              : 'Erstellen Sie Ihre erste E-Mail-Vorlage'}
          </p>
          {!searchTerm && filterType === 'all' && filterLanguage === 'all' && (
            <button 
              className={styles.createButton}
              onClick={handleCreateTemplate}
            >
              <Plus size={18} />
              Erste Vorlage erstellen
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesList;