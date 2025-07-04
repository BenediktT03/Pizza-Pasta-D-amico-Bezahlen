/**
 * EATECH - Report Templates
 * Version: 23.0.0
 * Description: Verwaltung von benutzerdefinierten Report-Vorlagen
 * File Path: /apps/admin/src/pages/reports/ReportTemplates.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy,
  Save,
  X,
  Filter,
  Layout,
  BarChart,
  Settings,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Hooks
import { useTenant } from '../../hooks/useTenant';
import { useReportTemplates } from '../../hooks/useReportTemplates';

// Components
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// Styles
import styles from './ReportTemplates.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const TEMPLATE_CATEGORIES = {
  SALES: { id: 'sales', name: 'Umsatz', icon: BarChart },
  INVENTORY: { id: 'inventory', name: 'Inventar', icon: Layout },
  CUSTOM: { id: 'custom', name: 'Benutzerdefiniert', icon: Settings }
};

const DEFAULT_TEMPLATES = [
  {
    id: 'monthly-sales',
    name: 'Monatlicher Umsatzbericht',
    description: 'Detaillierter Umsatzbericht mit Produktanalyse',
    category: 'sales',
    reportType: 'sales',
    isDefault: true,
    config: {
      dateRange: 'lastMonth',
      includeCharts: true,
      includeDetails: true,
      groupBy: 'day',
      metrics: ['revenue', 'orders', 'avgOrderValue', 'topProducts']
    }
  },
  {
    id: 'weekly-inventory',
    name: 'Wöchentlicher Inventarbericht',
    description: 'Überblick über Lagerbestand und Verbrauch',
    category: 'inventory',
    reportType: 'inventory',
    isDefault: true,
    config: {
      dateRange: 'lastWeek',
      includeMovements: true,
      includeLowStock: true,
      includeValueAnalysis: true
    }
  },
  {
    id: 'daily-summary',
    name: 'Tägliche Zusammenfassung',
    description: 'Kompakte Übersicht der wichtigsten Kennzahlen',
    category: 'sales',
    reportType: 'financial',
    isDefault: true,
    config: {
      dateRange: 'yesterday',
      metrics: ['revenue', 'orders', 'newCustomers'],
      includeComparison: true
    }
  }
];

// ============================================================================
// COMPONENT
// ============================================================================
const ReportTemplates = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { 
    templates, 
    loading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate,
    duplicateTemplate 
  } = useReportTemplates();

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom',
    reportType: 'sales',
    config: {
      dateRange: 'last30days',
      format: 'pdf',
      includeCharts: true,
      includeDetails: true
    }
  });

  // Combine default and custom templates
  const allTemplates = [...DEFAULT_TEMPLATES, ...templates];
  
  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all' 
    ? allTemplates 
    : allTemplates.filter(t => t.category === selectedCategory);

  // Handlers
  const handleCreateTemplate = () => {
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      reportType: 'sales',
      config: {
        dateRange: 'last30days',
        format: 'pdf',
        includeCharts: true,
        includeDetails: true
      }
    });
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template) => {
    if (template.isDefault) {
      toast.error('Standard-Vorlagen können nicht bearbeitet werden');
      return;
    }
    
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      reportType: template.reportType,
      config: template.config
    });
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Bitte geben Sie einen Namen ein');
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
    if (template.isDefault) {
      toast.error('Standard-Vorlagen können nicht gelöscht werden');
      return;
    }
    
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
      const newTemplate = {
        ...template,
        name: `${template.name} (Kopie)`,
        isDefault: false
      };
      delete newTemplate.id;
      
      await createTemplate(newTemplate);
      toast.success('Vorlage erfolgreich dupliziert');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Fehler beim Duplizieren der Vorlage');
    }
  };

  const handleUseTemplate = (template) => {
    // Navigate to report generator with template config
    const params = new URLSearchParams({
      template: template.id,
      type: template.reportType
    });
    navigate(`/admin/reports/generate?${params.toString()}`);
  };

  // Update form config
  const updateConfig = (key, value) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }));
  };

  // Render
  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Report-Vorlagen</h1>
          <p className={styles.subtitle}>
            Erstellen und verwalten Sie Ihre benutzerdefinierten Report-Vorlagen
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

      {/* Category Filter */}
      <div className={styles.filterBar}>
        <button
          className={`${styles.filterButton} ${selectedCategory === 'all' ? styles.active : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <FileText size={16} />
          Alle Vorlagen
        </button>
        {Object.values(TEMPLATE_CATEGORIES).map(category => {
          const IconComponent = category.icon;
          return (
            <button
              key={category.id}
              className={`${styles.filterButton} ${selectedCategory === category.id ? styles.active : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <IconComponent size={16} />
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className={styles.templatesGrid}>
        {filteredTemplates.map(template => (
          <Card key={template.id} className={styles.templateCard}>
            <div className={styles.templateHeader}>
              <div className={styles.templateIcon}>
                {(() => {
                  const IconComponent = TEMPLATE_CATEGORIES[template.category]?.icon || FileText;
                  return <IconComponent size={24} />;
                })()}
              </div>
              {template.isDefault && (
                <span className={styles.defaultBadge}>Standard</span>
              )}
            </div>

            <h3 className={styles.templateName}>{template.name}</h3>
            <p className={styles.templateDescription}>{template.description}</p>

            <div className={styles.templateMeta}>
              <span className={styles.metaItem}>
                <Filter size={14} />
                {template.reportType}
              </span>
              <span className={styles.metaItem}>
                <Settings size={14} />
                {template.config.format || 'PDF'}
              </span>
            </div>

            <div className={styles.templateActions}>
              <Button
                variant="primary"
                size="small"
                onClick={() => handleUseTemplate(template)}
                fullWidth
              >
                Verwenden
              </Button>
              <div className={styles.actionButtons}>
                <button
                  className={styles.iconButton}
                  onClick={() => handleDuplicateTemplate(template)}
                  title="Duplizieren"
                >
                  <Copy size={16} />
                </button>
                {!template.isDefault && (
                  <>
                    <button
                      className={styles.iconButton}
                      onClick={() => handleEditTemplate(template)}
                      title="Bearbeiten"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className={styles.iconButton}
                      onClick={() => handleDeleteTemplate(template)}
                      title="Löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className={styles.emptyState}>
          <FileText size={48} />
          <h3>Keine Vorlagen gefunden</h3>
          <p>Erstellen Sie Ihre erste benutzerdefinierte Report-Vorlage</p>
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
        maxWidth="600px"
      >
        <div className={styles.templateForm}>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Name der Vorlage</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Wöchentlicher Umsatzbericht"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Beschreibung</label>
              <TextArea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Beschreiben Sie den Zweck dieser Vorlage"
                rows={3}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Kategorie</label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                {Object.values(TEMPLATE_CATEGORIES).map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className={styles.formField}>
              <label>Report-Typ</label>
              <Select
                value={formData.reportType}
                onChange={(e) => setFormData(prev => ({ ...prev, reportType: e.target.value }))}
              >
                <option value="sales">Umsatzbericht</option>
                <option value="orders">Bestellübersicht</option>
                <option value="inventory">Inventarbericht</option>
                <option value="customers">Kundenbericht</option>
                <option value="financial">Finanzbericht</option>
              </Select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Standard-Zeitraum</label>
              <Select
                value={formData.config.dateRange}
                onChange={(e) => updateConfig('dateRange', e.target.value)}
              >
                <option value="today">Heute</option>
                <option value="yesterday">Gestern</option>
                <option value="last7days">Letzte 7 Tage</option>
                <option value="last30days">Letzte 30 Tage</option>
                <option value="thisMonth">Dieser Monat</option>
                <option value="lastMonth">Letzter Monat</option>
                <option value="thisYear">Dieses Jahr</option>
                <option value="custom">Benutzerdefiniert</option>
              </Select>
            </div>

            <div className={styles.formField}>
              <label>Format</label>
              <Select
                value={formData.config.format}
                onChange={(e) => updateConfig('format', e.target.value)}
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
              </Select>
            </div>
          </div>

          <div className={styles.formSection}>
            <h4>Report-Optionen</h4>
            <div className={styles.optionsGrid}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.config.includeCharts}
                  onChange={(e) => updateConfig('includeCharts', e.target.checked)}
                />
                <span>Grafiken einschließen</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.config.includeDetails}
                  onChange={(e) => updateConfig('includeDetails', e.target.checked)}
                />
                <span>Detaillierte Aufschlüsselung</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.config.includeComparison}
                  onChange={(e) => updateConfig('includeComparison', e.target.checked)}
                />
                <span>Vergleich zum Vorjahr</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.config.includeSummary}
                  onChange={(e) => updateConfig('includeSummary', e.target.checked)}
                />
                <span>Zusammenfassung</span>
              </label>
            </div>
          </div>

          {/* Report Type Specific Options */}
          {formData.reportType === 'sales' && (
            <div className={styles.formSection}>
              <h4>Umsatz-Optionen</h4>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Gruppierung</label>
                  <Select
                    value={formData.config.groupBy || 'day'}
                    onChange={(e) => updateConfig('groupBy', e.target.value)}
                  >
                    <option value="hour">Stündlich</option>
                    <option value="day">Täglich</option>
                    <option value="week">Wöchentlich</option>
                    <option value="month">Monatlich</option>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className={styles.modalActions}>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
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
export default ReportTemplates;