/**
 * EATECH - Notification Templates
 * Version: 23.0.0
 * Description: Verwaltung von Benachrichtigungs-Vorlagen
 * File Path: /apps/admin/src/pages/notifications/NotificationTemplates.jsx
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  MessageSquare, 
  Smartphone,
  Bell,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Save,
  Eye,
  Code,
  FileText,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Hooks
import { useTenant } from '../../hooks/useTenant';
import { useNotificationTemplates } from '../../hooks/useNotificationTemplates';

// Components
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// Styles
import styles from './NotificationTemplates.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const TEMPLATE_TYPES = {
  ORDER_PLACED: 'Bestellung eingegangen',
  ORDER_CONFIRMED: 'Bestellung bestätigt',
  ORDER_READY: 'Bestellung bereit',
  ORDER_DELIVERED: 'Bestellung geliefert',
  ORDER_CANCELLED: 'Bestellung storniert',
  PAYMENT_RECEIVED: 'Zahlung erhalten',
  PAYMENT_FAILED: 'Zahlung fehlgeschlagen',
  LOW_STOCK_ALERT: 'Niedriger Lagerbestand',
  CUSTOMER_WELCOME: 'Willkommen',
  CUSTOMER_BIRTHDAY: 'Geburtstag',
  LOYALTY_REWARD: 'Treuepunkt-Belohnung',
  PROMOTION: 'Promotion / Angebot',
  REVIEW_REQUEST: 'Bewertungsanfrage',
  SYSTEM_ALERT: 'System-Benachrichtigung'
};

const CHANNELS = {
  email: { name: 'E-Mail', icon: Mail, color: '#10B981' },
  sms: { name: 'SMS', icon: MessageSquare, color: '#F59E0B' },
  push: { name: 'Push', icon: Smartphone, color: '#3B82F6' },
  in_app: { name: 'In-App', icon: Bell, color: '#8B5CF6' }
};

const TEMPLATE_VARIABLES = [
  { key: '{{customerName}}', description: 'Name des Kunden' },
  { key: '{{orderNumber}}', description: 'Bestellnummer' },
  { key: '{{orderTotal}}', description: 'Bestellsumme' },
  { key: '{{deliveryTime}}', description: 'Lieferzeit' },
  { key: '{{businessName}}', description: 'Name des Geschäfts' },
  { key: '{{productName}}', description: 'Produktname' },
  { key: '{{discountCode}}', description: 'Rabattcode' },
  { key: '{{loyaltyPoints}}', description: 'Treuepunkte' },
  { key: '{{date}}', description: 'Aktuelles Datum' },
  { key: '{{time}}', description: 'Aktuelle Zeit' }
];

const DEFAULT_TEMPLATES = {
  ORDER_PLACED: {
    email: {
      subject: 'Bestellung eingegangen - #{{orderNumber}}',
      body: `Hallo {{customerName}},

vielen Dank für Ihre Bestellung bei {{businessName}}!

Bestellnummer: #{{orderNumber}}
Gesamtbetrag: {{orderTotal}}

Wir werden Ihre Bestellung umgehend bearbeiten und Sie über den Fortschritt informieren.

Mit freundlichen Grüßen
Ihr {{businessName}} Team`
    },
    sms: {
      message: '{{businessName}}: Bestellung #{{orderNumber}} eingegangen! Betrag: {{orderTotal}}. Wir informieren Sie, sobald Ihre Bestellung bereit ist.'
    },
    push: {
      title: 'Bestellung eingegangen!',
      body: 'Ihre Bestellung #{{orderNumber}} wurde erfolgreich aufgegeben.'
    }
  },
  ORDER_READY: {
    email: {
      subject: 'Ihre Bestellung ist bereit! - #{{orderNumber}}',
      body: `Hallo {{customerName}},

Ihre Bestellung #{{orderNumber}} ist fertig und kann abgeholt werden!

Abholzeit: {{deliveryTime}}

Wir freuen uns auf Sie!

Mit freundlichen Grüßen
Ihr {{businessName}} Team`
    },
    sms: {
      message: '{{businessName}}: Ihre Bestellung #{{orderNumber}} ist bereit zur Abholung!'
    },
    push: {
      title: 'Bestellung bereit! 🎉',
      body: 'Ihre Bestellung #{{orderNumber}} kann jetzt abgeholt werden.'
    }
  }
};

// ============================================================================
// COMPONENT
// ============================================================================
const NotificationTemplates = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { 
    templates, 
    loading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate,
    duplicateTemplate 
  } = useNotificationTemplates();

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [showPreview, setShowPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('email');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'ORDER_PLACED',
    channels: {
      email: { enabled: false, subject: '', body: '' },
      sms: { enabled: false, message: '' },
      push: { enabled: false, title: '', body: '' },
      in_app: { enabled: false, title: '', body: '' }
    }
  });

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (selectedType !== 'all' && template.type !== selectedType) return false;
    if (selectedChannel !== 'all' && !template.channels[selectedChannel]?.enabled) return false;
    return true;
  });

  // Handlers
  const handleCreateTemplate = () => {
    const defaultTemplate = DEFAULT_TEMPLATES[formData.type] || {};
    
    setFormData({
      name: '',
      type: 'ORDER_PLACED',
      channels: {
        email: defaultTemplate.email 
          ? { enabled: true, ...defaultTemplate.email }
          : { enabled: false, subject: '', body: '' },
        sms: defaultTemplate.sms
          ? { enabled: true, ...defaultTemplate.sms }
          : { enabled: false, message: '' },
        push: defaultTemplate.push
          ? { enabled: true, ...defaultTemplate.push }
          : { enabled: false, title: '', body: '' },
        in_app: { enabled: false, title: '', body: '' }
      }
    });
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template) => {
    setFormData({
      name: template.name,
      type: template.type,
      channels: template.channels
    });
    setEditingTemplate(template);
    setShowCreateModal(true);
    setActiveTab(Object.keys(template.channels).find(
      channel => template.channels[channel]?.enabled
    ) || 'email');
  };

  const handleSaveTemplate = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Bitte geben Sie einen Namen ein');
        return;
      }

      const hasEnabledChannel = Object.values(formData.channels).some(c => c.enabled);
      if (!hasEnabledChannel) {
        toast.error('Bitte aktivieren Sie mindestens einen Kanal');
        return;
      }

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
        toast.success('Vorlage erfolgreich aktualisiert');
      } else {
        await createTemplate(formData);
        toast.success('Vorlage erfolgreich erstellt');
      }

      setShowCreateModal(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Fehler beim Speichern der Vorlage');
    }
  };

  const handleDeleteTemplate = async (template) => {
    setDeleteConfirm(template);
  };

  const confirmDelete = async () => {
    try {
      await deleteTemplate(deleteConfirm.id);
      toast.success('Vorlage erfolgreich gelöscht');
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Fehler beim Löschen der Vorlage');
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      await duplicateTemplate(template.id);
      toast.success('Vorlage erfolgreich dupliziert');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Fehler beim Duplizieren der Vorlage');
    }
  };

  const insertVariable = (variable) => {
    const activeChannel = formData.channels[activeTab];
    if (!activeChannel) return;

    if (activeTab === 'email') {
      // Insert at cursor position in body
      const textarea = document.querySelector(`textarea[name="${activeTab}-body"]`);
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + variable + text.substring(end);
        
        updateChannelData(activeTab, 'body', newText);
        
        // Restore cursor position
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + variable.length;
          textarea.focus();
        }, 0);
      }
    } else if (activeTab === 'sms') {
      const input = document.querySelector(`textarea[name="${activeTab}-message"]`);
      if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        const newText = text.substring(0, start) + variable + text.substring(end);
        
        updateChannelData(activeTab, 'message', newText);
      }
    } else {
      // For push and in-app, insert in body
      const textarea = document.querySelector(`textarea[name="${activeTab}-body"]`);
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + variable + text.substring(end);
        
        updateChannelData(activeTab, 'body', newText);
      }
    }
  };

  const updateChannelData = (channel, field, value) => {
    setFormData(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: {
          ...prev.channels[channel],
          [field]: value
        }
      }
    }));
  };

  const toggleChannel = (channel) => {
    setFormData(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: {
          ...prev.channels[channel],
          enabled: !prev.channels[channel].enabled
        }
      }
    }));
  };

  const previewTemplate = (template) => {
    // Replace variables with example data
    const exampleData = {
      customerName: 'Max Mustermann',
      orderNumber: '12345',
      orderTotal: 'CHF 45.90',
      deliveryTime: '18:30 Uhr',
      businessName: tenant?.name || 'EATECH Foodtruck',
      productName: 'Burger Deluxe',
      discountCode: 'SAVE10',
      loyaltyPoints: '150',
      date: new Date().toLocaleDateString('de-CH'),
      time: new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
    };

    const replaceVariables = (text) => {
      let result = text;
      Object.entries(exampleData).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
      return result;
    };

    const previewData = {
      ...template,
      channels: Object.entries(template.channels).reduce((acc, [channel, data]) => {
        if (!data.enabled) return acc;
        
        acc[channel] = {
          ...data,
          subject: data.subject ? replaceVariables(data.subject) : undefined,
          body: data.body ? replaceVariables(data.body) : undefined,
          message: data.message ? replaceVariables(data.message) : undefined,
          title: data.title ? replaceVariables(data.title) : undefined
        };
        
        return acc;
      }, {})
    };

    return previewData;
  };

  // Render
  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Benachrichtigungs-Vorlagen</h1>
          <p className={styles.subtitle}>
            Erstellen und verwalten Sie Vorlagen für automatische Benachrichtigungen
          </p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={handleCreateTemplate}
        >
          Neue Vorlage
        </Button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <Select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">Alle Typen</option>
          {Object.entries(TEMPLATE_TYPES).map(([key, value]) => (
            <option key={key} value={key}>{value}</option>
          ))}
        </Select>
        
        <Select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">Alle Kanäle</option>
          {Object.entries(CHANNELS).map(([key, value]) => (
            <option key={key} value={key}>{value.name}</option>
          ))}
        </Select>
      </div>

      {/* Templates Grid */}
      <div className={styles.templatesGrid}>
        {filteredTemplates.map(template => (
          <Card key={template.id} className={styles.templateCard}>
            <div className={styles.templateHeader}>
              <h3>{template.name}</h3>
              <Badge variant="secondary">{TEMPLATE_TYPES[template.type]}</Badge>
            </div>

            <div className={styles.templateChannels}>
              {Object.entries(template.channels).map(([channel, data]) => {
                if (!data.enabled) return null;
                const channelInfo = CHANNELS[channel];
                const IconComponent = channelInfo.icon;
                
                return (
                  <div
                    key={channel}
                    className={styles.channelBadge}
                    style={{ backgroundColor: `${channelInfo.color}20` }}
                  >
                    <IconComponent size={14} style={{ color: channelInfo.color }} />
                    <span>{channelInfo.name}</span>
                  </div>
                );
              })}
            </div>

            <div className={styles.templateActions}>
              <button
                className={styles.actionButton}
                onClick={() => setShowPreview(previewTemplate(template))}
                title="Vorschau"
              >
                <Eye size={16} />
              </button>
              <button
                className={styles.actionButton}
                onClick={() => handleEditTemplate(template)}
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
                onClick={() => handleDeleteTemplate(template)}
                title="Löschen"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className={styles.emptyState}>
          <FileText size={48} />
          <h3>Keine Vorlagen gefunden</h3>
          <p>Erstellen Sie Ihre erste Benachrichtigungs-Vorlage</p>
          <Button
            variant="primary"
            icon={Plus}
            onClick={handleCreateTemplate}
          >
            Vorlage erstellen
          </Button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
        maxWidth="800px"
      >
        <div className={styles.templateForm}>
          <div className={styles.formHeader}>
            <div className={styles.formField}>
              <label>Name der Vorlage</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Bestellbestätigung Standard"
              />
            </div>
            
            <div className={styles.formField}>
              <label>Ereignis-Typ</label>
              <Select
                value={formData.type}
                onChange={(e) => {
                  const type = e.target.value;
                  const defaultTemplate = DEFAULT_TEMPLATES[type] || {};
                  
                  setFormData(prev => ({
                    ...prev,
                    type,
                    channels: {
                      email: defaultTemplate.email 
                        ? { enabled: true, ...defaultTemplate.email }
                        : prev.channels.email,
                      sms: defaultTemplate.sms
                        ? { enabled: true, ...defaultTemplate.sms }
                        : prev.channels.sms,
                      push: defaultTemplate.push
                        ? { enabled: true, ...defaultTemplate.push }
                        : prev.channels.push,
                      in_app: prev.channels.in_app
                    }
                  }));
                }}
              >
                {Object.entries(TEMPLATE_TYPES).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className={styles.channelTabs}>
            {Object.entries(CHANNELS).map(([channel, info]) => {
              const IconComponent = info.icon;
              const isActive = activeTab === channel;
              const isEnabled = formData.channels[channel]?.enabled;
              
              return (
                <button
                  key={channel}
                  className={`${styles.channelTab} ${isActive ? styles.active : ''}`}
                  onClick={() => setActiveTab(channel)}
                  style={isActive ? { borderColor: info.color } : {}}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleChannel(channel)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <IconComponent size={16} />
                  <span>{info.name}</span>
                </button>
              );
            })}
          </div>

          {/* Channel Content */}
          <div className={styles.channelContent}>
            {activeTab === 'email' && (
              <>
                <div className={styles.formField}>
                  <label>Betreff</label>
                  <Input
                    value={formData.channels.email.subject || ''}
                    onChange={(e) => updateChannelData('email', 'subject', e.target.value)}
                    placeholder="E-Mail Betreff"
                    disabled={!formData.channels.email.enabled}
                  />
                </div>
                <div className={styles.formField}>
                  <label>Nachricht</label>
                  <TextArea
                    name="email-body"
                    value={formData.channels.email.body || ''}
                    onChange={(e) => updateChannelData('email', 'body', e.target.value)}
                    placeholder="E-Mail Inhalt"
                    rows={8}
                    disabled={!formData.channels.email.enabled}
                  />
                </div>
              </>
            )}

            {activeTab === 'sms' && (
              <div className={styles.formField}>
                <label>SMS Nachricht</label>
                <TextArea
                  name="sms-message"
                  value={formData.channels.sms.message || ''}
                  onChange={(e) => updateChannelData('sms', 'message', e.target.value)}
                  placeholder="SMS Text (max. 160 Zeichen)"
                  rows={3}
                  maxLength={160}
                  disabled={!formData.channels.sms.enabled}
                />
                <span className={styles.charCount}>
                  {formData.channels.sms.message?.length || 0} / 160
                </span>
              </div>
            )}

            {(activeTab === 'push' || activeTab === 'in_app') && (
              <>
                <div className={styles.formField}>
                  <label>Titel</label>
                  <Input
                    value={formData.channels[activeTab].title || ''}
                    onChange={(e) => updateChannelData(activeTab, 'title', e.target.value)}
                    placeholder="Benachrichtigungs-Titel"
                    disabled={!formData.channels[activeTab].enabled}
                  />
                </div>
                <div className={styles.formField}>
                  <label>Nachricht</label>
                  <TextArea
                    name={`${activeTab}-body`}
                    value={formData.channels[activeTab].body || ''}
                    onChange={(e) => updateChannelData(activeTab, 'body', e.target.value)}
                    placeholder="Benachrichtigungs-Text"
                    rows={3}
                    disabled={!formData.channels[activeTab].enabled}
                  />
                </div>
              </>
            )}

            {/* Variables */}
            <div className={styles.variablesSection}>
              <h4>Verfügbare Variablen</h4>
              <div className={styles.variablesList}>
                {TEMPLATE_VARIABLES.map(variable => (
                  <button
                    key={variable.key}
                    className={styles.variableButton}
                    onClick={() => insertVariable(variable.key)}
                    disabled={!formData.channels[activeTab]?.enabled}
                    title={variable.description}
                  >
                    <Code size={14} />
                    {variable.key}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.modalActions}>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingTemplate(null);
              }}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={handleSaveTemplate}
            >
              {editingTemplate ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      {showPreview && (
        <Modal
          isOpen={true}
          onClose={() => setShowPreview(false)}
          title="Vorlagen-Vorschau"
          maxWidth="600px"
        >
          <div className={styles.preview}>
            <h3>{showPreview.name}</h3>
            <Badge variant="secondary" className={styles.previewBadge}>
              {TEMPLATE_TYPES[showPreview.type]}
            </Badge>

            {Object.entries(showPreview.channels).map(([channel, data]) => {
              const channelInfo = CHANNELS[channel];
              const IconComponent = channelInfo.icon;
              
              return (
                <div key={channel} className={styles.previewChannel}>
                  <div className={styles.previewChannelHeader}>
                    <IconComponent size={20} style={{ color: channelInfo.color }} />
                    <h4>{channelInfo.name}</h4>
                  </div>
                  
                  {channel === 'email' && (
                    <>
                      <div className={styles.previewField}>
                        <strong>Betreff:</strong> {data.subject}
                      </div>
                      <div className={styles.previewField}>
                        <strong>Nachricht:</strong>
                        <pre>{data.body}</pre>
                      </div>
                    </>
                  )}
                  
                  {channel === 'sms' && (
                    <div className={styles.previewField}>
                      <strong>SMS:</strong>
                      <pre>{data.message}</pre>
                    </div>
                  )}
                  
                  {(channel === 'push' || channel === 'in_app') && (
                    <>
                      <div className={styles.previewField}>
                        <strong>Titel:</strong> {data.title}
                      </div>
                      <div className={styles.previewField}>
                        <strong>Nachricht:</strong> {data.body}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Vorlage löschen"
        message={`Möchten Sie die Vorlage "${deleteConfirm?.name}" wirklich löschen?`}
        confirmText="Löschen"
        confirmVariant="danger"
      />
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default NotificationTemplates;