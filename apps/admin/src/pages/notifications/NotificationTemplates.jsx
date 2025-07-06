/**
 * EATECH - Notification Templates
 * Version: 24.0.0
 * Description: Verwaltung von Benachrichtigungs-Vorlagen mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/notifications/NotificationTemplates.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, MessageSquare, Smartphone, Bell, Plus, Edit3, Trash2,
  Copy, Save, Eye, Code, FileText, CheckCircle, X, Search,
  Filter, Download, Upload, RefreshCw, Settings, Globe,
  Clock, User, Tag, Hash, MoreVertical
} from 'lucide-react';

// Lazy loaded components
const TemplateEditor = lazy(() => import('./components/TemplateEditor'));
const TemplatePreview = lazy(() => import('./components/TemplatePreview'));
const VariableSelector = lazy(() => import('./components/VariableSelector'));
const TemplateTestModal = lazy(() => import('./components/TemplateTestModal'));
const ImportExportModal = lazy(() => import('./components/ImportExportModal'));
const BulkActionsBar = lazy(() => import('../../components/common/BulkActionsBar'));

// Lazy loaded services
const NotificationService = lazy(() => import('../../services/notificationService'));
const TemplateService = lazy(() => import('../../services/templateService'));
const ExportService = lazy(() => import('../../services/exportService'));

// Lazy loaded utilities
const toast = lazy(() => import('react-hot-toast'));

// Loading components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const TemplateCardSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg p-6">
      <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-300 rounded w-2/3"></div>
    </div>
  </div>
);

// Hooks
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';

// UI Components
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// Styles
import styles from './NotificationTemplates.module.css';

// Constants
const TEMPLATE_TYPES = {
  ORDER_PLACED: { id: 'order_placed', label: 'Bestellung eingegangen', icon: Bell },
  ORDER_CONFIRMED: { id: 'order_confirmed', label: 'Bestellung bestätigt', icon: CheckCircle },
  ORDER_READY: { id: 'order_ready', label: 'Bestellung bereit', icon: Clock },
  ORDER_DELIVERED: { id: 'order_delivered', label: 'Bestellung geliefert', icon: CheckCircle },
  ORDER_CANCELLED: { id: 'order_cancelled', label: 'Bestellung storniert', icon: X },
  PAYMENT_RECEIVED: { id: 'payment_received', label: 'Zahlung erhalten', icon: CheckCircle },
  PAYMENT_FAILED: { id: 'payment_failed', label: 'Zahlung fehlgeschlagen', icon: X },
  LOW_STOCK_ALERT: { id: 'low_stock', label: 'Niedriger Lagerbestand', icon: Bell },
  CUSTOMER_WELCOME: { id: 'welcome', label: 'Willkommen', icon: User },
  CUSTOMER_BIRTHDAY: { id: 'birthday', label: 'Geburtstag', icon: User },
  LOYALTY_REWARD: { id: 'loyalty', label: 'Treuepunkt-Belohnung', icon: Tag },
  PROMOTION: { id: 'promotion', label: 'Promotion / Angebot', icon: Tag },
  REVIEW_REQUEST: { id: 'review', label: 'Bewertungsanfrage', icon: MessageSquare },
  SYSTEM_ALERT: { id: 'system', label: 'System-Benachrichtigung', icon: Bell }
};

const CHANNELS = {
  email: { name: 'E-Mail', icon: Mail, color: '#3B82F6' },
  sms: { name: 'SMS', icon: Smartphone, color: '#10B981' },
  push: { name: 'Push', icon: Bell, color: '#8B5CF6' },
  whatsapp: { name: 'WhatsApp', icon: MessageSquare, color: '#25D366' }
};

const LANGUAGES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Französisch' },
  { value: 'it', label: 'Italienisch' },
  { value: 'en', label: 'Englisch' }
];

// Main Component
const NotificationTemplates = () => {
  // State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('de');
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showTest, setShowTest] = useState(false);
  const [testTemplate, setTestTemplate] = useState(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [services, setServices] = useState({});

  // Hooks
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { user } = useAuth();

  // Load services
  useEffect(() => {
    const loadServices = async () => {
      try {
        const [notificationSvc, templateSvc, exportSvc, toastLib] = await Promise.all([
          import('../../services/notificationService'),
          import('../../services/templateService'),
          import('../../services/exportService'),
          import('react-hot-toast')
        ]);
        
        setServices({
          notification: notificationSvc.default,
          template: templateSvc.default,
          export: exportSvc.default,
          toast: toastLib.default
        });
      } catch (error) {
        console.error('Failed to load services:', error);
      }
    };
    loadServices();
  }, []);

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      if (!services.template || !tenant?.id) return;

      try {
        setLoading(true);
        setError(null);
        
        const data = await services.template.getTemplates(tenant.id);
        setTemplates(data);
      } catch (error) {
        console.error('Error loading templates:', error);
        setError('Fehler beim Laden der Vorlagen');
        if (services.toast) {
          services.toast.error('Fehler beim Laden der Vorlagen');
        }
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [tenant?.id, services.template, services.toast]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(term) ||
        t.subject?.toLowerCase().includes(term) ||
        t.content?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType);
    }

    // Channel filter
    if (selectedChannel !== 'all') {
      filtered = filtered.filter(t => t.channel === selectedChannel);
    }

    // Language filter
    filtered = filtered.filter(t => t.language === selectedLanguage);

    return filtered;
  }, [templates, searchTerm, selectedType, selectedChannel, selectedLanguage]);

  // Handlers
  const handleCreateTemplate = useCallback(() => {
    setEditingTemplate({
      id: null,
      name: '',
      type: 'order_placed',
      channel: 'email',
      language: selectedLanguage,
      subject: '',
      content: '',
      variables: [],
      active: true,
      isNew: true
    });
    setShowEditor(true);
  }, [selectedLanguage]);

  const handleEditTemplate = useCallback((template) => {
    setEditingTemplate({ ...template, isNew: false });
    setShowEditor(true);
  }, []);

  const handleDuplicateTemplate = useCallback(async (template) => {
    if (!services.template || !services.toast) return;

    try {
      const duplicated = {
        ...template,
        id: null,
        name: `${template.name} (Kopie)`,
        createdAt: new Date().toISOString()
      };
      
      await services.template.createTemplate(tenant.id, duplicated);
      services.toast.success('Vorlage erfolgreich dupliziert');
      
      // Reload templates
      const data = await services.template.getTemplates(tenant.id);
      setTemplates(data);
    } catch (error) {
      console.error('Error duplicating template:', error);
      services.toast.error('Fehler beim Duplizieren der Vorlage');
    }
  }, [tenant?.id, services.template, services.toast]);

  const handleDeleteTemplate = useCallback(async () => {
    if (!deleteTarget || !services.template || !services.toast) return;

    try {
      await services.template.deleteTemplate(tenant.id, deleteTarget.id);
      services.toast.success('Vorlage erfolgreich gelöscht');
      
      // Update local state
      setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      services.toast.error('Fehler beim Löschen der Vorlage');
    }
  }, [deleteTarget, tenant?.id, services.template, services.toast]);

  const handleSaveTemplate = useCallback(async (templateData) => {
    if (!services.template || !services.toast) return;

    try {
      if (templateData.isNew) {
        await services.template.createTemplate(tenant.id, templateData);
        services.toast.success('Vorlage erfolgreich erstellt');
      } else {
        await services.template.updateTemplate(tenant.id, templateData.id, templateData);
        services.toast.success('Vorlage erfolgreich aktualisiert');
      }
      
      // Reload templates
      const data = await services.template.getTemplates(tenant.id);
      setTemplates(data);
      setShowEditor(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      services.toast.error('Fehler beim Speichern der Vorlage');
    }
  }, [tenant?.id, services.template, services.toast]);

  const handleToggleActive = useCallback(async (template) => {
    if (!services.template || !services.toast) return;

    try {
      await services.template.updateTemplate(tenant.id, template.id, {
        ...template,
        active: !template.active
      });
      
      // Update local state
      setTemplates(prev => prev.map(t =>
        t.id === template.id ? { ...t, active: !t.active } : t
      ));
      
      services.toast.success(
        template.active ? 'Vorlage deaktiviert' : 'Vorlage aktiviert'
      );
    } catch (error) {
      console.error('Error toggling template:', error);
      services.toast.error('Fehler beim Ändern des Status');
    }
  }, [tenant?.id, services.template, services.toast]);

  const handleBulkAction = useCallback(async (action) => {
    if (!services.template || !services.toast || selectedTemplates.length === 0) return;

    try {
      switch (action) {
        case 'activate':
          await Promise.all(
            selectedTemplates.map(id =>
              services.template.updateTemplate(tenant.id, id, { active: true })
            )
          );
          services.toast.success(`${selectedTemplates.length} Vorlagen aktiviert`);
          break;
          
        case 'deactivate':
          await Promise.all(
            selectedTemplates.map(id =>
              services.template.updateTemplate(tenant.id, id, { active: false })
            )
          );
          services.toast.success(`${selectedTemplates.length} Vorlagen deaktiviert`);
          break;
          
        case 'delete':
          if (window.confirm(`Wirklich ${selectedTemplates.length} Vorlagen löschen?`)) {
            await Promise.all(
              selectedTemplates.map(id =>
                services.template.deleteTemplate(tenant.id, id)
              )
            );
            services.toast.success(`${selectedTemplates.length} Vorlagen gelöscht`);
          }
          break;
          
        case 'export':
          const templatesToExport = templates.filter(t => selectedTemplates.includes(t.id));
          await services.export.exportTemplates(templatesToExport, 'notification-templates');
          services.toast.success('Vorlagen exportiert');
          break;
      }
      
      // Reload templates and clear selection
      const data = await services.template.getTemplates(tenant.id);
      setTemplates(data);
      setSelectedTemplates([]);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      services.toast.error('Fehler bei der Ausführung der Aktion');
    }
  }, [selectedTemplates, tenant?.id, services]);

  // Render template card
  const renderTemplateCard = (template) => {
    const isSelected = selectedTemplates.includes(template.id);
    const type = TEMPLATE_TYPES[template.type] || TEMPLATE_TYPES.SYSTEM_ALERT;
    const channel = CHANNELS[template.channel];

    return (
      <Card key={template.id} className={`${styles.templateCard} ${isSelected ? styles.selected : ''}`}>
        <div className={styles.cardHeader}>
          <div className={styles.selectWrapper}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedTemplates(prev => [...prev, template.id]);
                } else {
                  setSelectedTemplates(prev => prev.filter(id => id !== template.id));
                }
              }}
              className={styles.checkbox}
            />
          </div>
          
          <div className={styles.templateInfo}>
            <h3 className={styles.templateName}>{template.name}</h3>
            <div className={styles.templateMeta}>
              <Badge variant="secondary" size="sm">
                <type.icon size={12} />
                {type.label}
              </Badge>
              <Badge
                variant="secondary"
                size="sm"
                style={{ backgroundColor: `${channel.color}20`, color: channel.color }}
              >
                <channel.icon size={12} />
                {channel.name}
              </Badge>
              <Badge variant="secondary" size="sm">
                <Globe size={12} />
                {template.language.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className={styles.cardActions}>
            <button
              className={`${styles.statusToggle} ${template.active ? styles.active : ''}`}
              onClick={() => handleToggleActive(template)}
              title={template.active ? 'Deaktivieren' : 'Aktivieren'}
            >
              <div className={styles.toggleTrack}>
                <div className={styles.toggleThumb} />
              </div>
            </button>
            
            <div className={styles.actionMenu}>
              <button className={styles.actionButton}>
                <MoreVertical size={16} />
              </button>
              <div className={styles.dropdown}>
                <button onClick={() => {
                  setPreviewTemplate(template);
                  setShowPreview(true);
                }}>
                  <Eye size={16} />
                  Vorschau
                </button>
                <button onClick={() => handleEditTemplate(template)}>
                  <Edit3 size={16} />
                  Bearbeiten
                </button>
                <button onClick={() => {
                  setTestTemplate(template);
                  setShowTest(true);
                }}>
                  <Mail size={16} />
                  Testen
                </button>
                <button onClick={() => handleDuplicateTemplate(template)}>
                  <Copy size={16} />
                  Duplizieren
                </button>
                <button
                  onClick={() => {
                    setDeleteTarget(template);
                    setShowDeleteConfirm(true);
                  }}
                  className={styles.deleteButton}
                >
                  <Trash2 size={16} />
                  Löschen
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {template.subject && (
          <div className={styles.templateSubject}>
            <span className={styles.label}>Betreff:</span>
            <span className={styles.value}>{template.subject}</span>
          </div>
        )}
        
        <div className={styles.templatePreview}>
          {template.content.substring(0, 150)}...
        </div>
        
        <div className={styles.templateFooter}>
          <span className={styles.lastModified}>
            <Clock size={14} />
            Zuletzt geändert: {new Date(template.updatedAt || template.createdAt).toLocaleDateString('de-CH')}
          </span>
          {template.variables && template.variables.length > 0 && (
            <span className={styles.variableCount}>
              <Hash size={14} />
              {template.variables.length} Variablen
            </span>
          )}
        </div>
      </Card>
    );
  };

  // Main render
  if (error && templates.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw size={16} />
          Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <Bell size={28} />
            Benachrichtigungs-Vorlagen
          </h1>
          <p className={styles.subtitle}>
            Verwalten Sie E-Mail, SMS und Push-Benachrichtigungen
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            onClick={() => setShowImportExport(true)}
          >
            <Upload size={20} />
            Import/Export
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateTemplate}
          >
            <Plus size={20} />
            Neue Vorlage
          </Button>
        </div>
      </header>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Suche nach Name, Betreff oder Inhalt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button
                className={styles.clearSearch}
                onClick={() => setSearchTerm('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <Select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Typen</option>
            {Object.entries(TEMPLATE_TYPES).map(([key, type]) => (
              <option key={key} value={key}>{type.label}</option>
            ))}
          </Select>
          
          <Select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Kanäle</option>
            {Object.entries(CHANNELS).map(([key, channel]) => (
              <option key={key} value={key}>{channel.name}</option>
            ))}
          </Select>
        </div>
        
        <div className={styles.controlsRight}>
          <Tabs
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            className={styles.languageTabs}
          >
            {LANGUAGES.map(lang => (
              <Tabs.Tab key={lang.value} value={lang.value}>
                {lang.label}
              </Tabs.Tab>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTemplates.length > 0 && (
        <Suspense fallback={<div className={styles.bulkActionsSkeleton} />}>
          <BulkActionsBar
            selectedCount={selectedTemplates.length}
            onSelectAll={() => {
              if (selectedTemplates.length === filteredTemplates.length) {
                setSelectedTemplates([]);
              } else {
                setSelectedTemplates(filteredTemplates.map(t => t.id));
              }
            }}
            actions={[
              { id: 'activate', label: 'Aktivieren', icon: CheckCircle },
              { id: 'deactivate', label: 'Deaktivieren', icon: X },
              { id: 'export', label: 'Exportieren', icon: Download },
              { id: 'delete', label: 'Löschen', icon: Trash2, variant: 'danger' }
            ]}
            onAction={handleBulkAction}
            onCancel={() => setSelectedTemplates([])}
          />
        </Suspense>
      )}

      {/* Templates Grid */}
      {loading ? (
        <div className={styles.templatesGrid}>
          {[...Array(6)].map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className={styles.emptyState}>
          <Bell size={48} className={styles.emptyIcon} />
          <h3>Keine Vorlagen gefunden</h3>
          <p>
            {searchTerm || selectedType !== 'all' || selectedChannel !== 'all'
              ? 'Versuchen Sie andere Filtereinstellungen'
              : 'Erstellen Sie Ihre erste Benachrichtigungs-Vorlage'}
          </p>
          {(searchTerm || selectedType !== 'all' || selectedChannel !== 'all') && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
                setSelectedChannel('all');
              }}
            >
              Filter zurücksetzen
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.templatesGrid}>
          {filteredTemplates.map(renderTemplateCard)}
        </div>
      )}

      {/* Modals */}
      {showEditor && editingTemplate && (
        <Suspense fallback={<LoadingSpinner />}>
          <Modal
            isOpen={showEditor}
            onClose={() => {
              setShowEditor(false);
              setEditingTemplate(null);
            }}
            title={editingTemplate.isNew ? 'Neue Vorlage erstellen' : 'Vorlage bearbeiten'}
            size="xl"
          >
            <TemplateEditor
              template={editingTemplate}
              onSave={handleSaveTemplate}
              onCancel={() => {
                setShowEditor(false);
                setEditingTemplate(null);
              }}
              services={services}
            />
          </Modal>
        </Suspense>
      )}

      {showPreview && previewTemplate && (
        <Suspense fallback={<LoadingSpinner />}>
          <Modal
            isOpen={showPreview}
            onClose={() => {
              setShowPreview(false);
              setPreviewTemplate(null);
            }}
            title="Vorlagen-Vorschau"
            size="lg"
          >
            <TemplatePreview
              template={previewTemplate}
              onClose={() => {
                setShowPreview(false);
                setPreviewTemplate(null);
              }}
            />
          </Modal>
        </Suspense>
      )}

      {showTest && testTemplate && (
        <Suspense fallback={<LoadingSpinner />}>
          <TemplateTestModal
            template={testTemplate}
            onClose={() => {
              setShowTest(false);
              setTestTemplate(null);
            }}
            services={services}
          />
        </Suspense>
      )}

      {showImportExport && (
        <Suspense fallback={<LoadingSpinner />}>
          <ImportExportModal
            onClose={() => setShowImportExport(false)}
            onImport={async (importedTemplates) => {
              // Handle import
              const data = await services.template.getTemplates(tenant.id);
              setTemplates(data);
              setShowImportExport(false);
            }}
            templates={templates}
            services={services}
          />
        </Suspense>
      )}

      {showDeleteConfirm && deleteTarget && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onConfirm={handleDeleteTemplate}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
          }}
          title="Vorlage löschen"
          message={`Möchten Sie die Vorlage "${deleteTarget.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
          confirmText="Löschen"
          confirmVariant="danger"
        />
      )}
    </div>
  );
};

export default NotificationTemplates;