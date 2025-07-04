/**
 * EATECH - Report Generator
 * Version: 23.0.0
 * Description: Hauptkomponente für die Generierung von PDF und Excel Reports
 * File Path: /apps/admin/src/pages/reports/ReportGenerator.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  FilePlus,
  Send,
  Save,
  Settings,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';

// Hooks
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { useReports } from '../../hooks/useReports';

// Components
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DateRangePicker from '../../components/ui/DateRangePicker';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';

// Services
import { generatePDFReport, generateExcelReport } from '../../services/reportService';
import { sendReportEmail } from '../../services/emailService';

// Utils
import { formatCurrency } from '../../utils/formatters';
import { downloadFile } from '../../utils/fileDownload';

// Styles
import styles from './ReportGenerator.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const REPORT_TYPES = {
  SALES: {
    id: 'sales',
    name: 'Umsatzbericht',
    description: 'Detaillierte Umsatzanalyse mit Produktaufschlüsselung',
    icon: TrendingUp,
    formats: ['pdf', 'excel'],
    color: '#10B981'
  },
  ORDERS: {
    id: 'orders',
    name: 'Bestellübersicht',
    description: 'Alle Bestellungen im gewählten Zeitraum',
    icon: FileText,
    formats: ['pdf', 'excel'],
    color: '#3B82F6'
  },
  INVENTORY: {
    id: 'inventory',
    name: 'Inventarbericht',
    description: 'Lagerbestand und Verbrauchsanalyse',
    icon: FileSpreadsheet,
    formats: ['excel'],
    color: '#8B5CF6'
  },
  CUSTOMERS: {
    id: 'customers',
    name: 'Kundenbericht',
    description: 'Kundenanalyse und Loyalitätsdaten',
    icon: FileText,
    formats: ['pdf', 'excel'],
    color: '#EC4899'
  },
  FINANCIAL: {
    id: 'financial',
    name: 'Finanzbericht',
    description: 'Vollständige Finanzübersicht inkl. Steuern',
    icon: FileText,
    formats: ['pdf'],
    color: '#F59E0B'
  }
};

const SCHEDULE_OPTIONS = [
  { value: 'once', label: 'Einmalig' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' }
];

const QUICK_RANGES = [
  { id: 'today', label: 'Heute' },
  { id: 'yesterday', label: 'Gestern' },
  { id: 'last7days', label: 'Letzte 7 Tage' },
  { id: 'last30days', label: 'Letzte 30 Tage' },
  { id: 'thisMonth', label: 'Dieser Monat' },
  { id: 'lastMonth', label: 'Letzter Monat' },
  { id: 'thisYear', label: 'Dieses Jahr' }
];

// ============================================================================
// COMPONENT
// ============================================================================
const ReportGenerator = () => {
  // Hooks
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { 
    reports, 
    loading: reportsLoading, 
    generateReport,
    scheduleReport,
    getScheduledReports 
  } = useReports();

  // State
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || 'sales');
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [format, setFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: 'once',
    time: '09:00',
    emails: [user?.email || ''],
    nextRun: null
  });
  const [scheduledReports, setScheduledReports] = useState([]);
  const [recentReports, setRecentReports] = useState([]);

  // Load scheduled reports
  useEffect(() => {
    loadScheduledReports();
  }, []);

  const loadScheduledReports = async () => {
    try {
      const reports = await getScheduledReports();
      setScheduledReports(reports);
    } catch (error) {
      console.error('Error loading scheduled reports:', error);
    }
  };

  // Handlers
  const handleQuickRange = useCallback((rangeId) => {
    const now = new Date();
    let start, end;

    switch (rangeId) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        start = new Date(yesterday.setHours(0, 0, 0, 0));
        end = new Date(yesterday.setHours(23, 59, 59, 999));
        break;
      case 'last7days':
        end = new Date();
        start = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'last30days':
        end = new Date();
        start = new Date(now.setDate(now.getDate() - 30));
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        return;
    }

    setDateRange({ start, end });
  }, []);

  const handleGenerateReport = async () => {
    setGenerating(true);
    const toastId = toast.loading('Report wird generiert...');

    try {
      const reportData = await generateReport({
        type: selectedType,
        dateRange,
        format,
        tenantId: tenant.id
      });

      let file;
      if (format === 'pdf') {
        file = await generatePDFReport(reportData);
      } else {
        file = await generateExcelReport(reportData);
      }

      downloadFile(file, `${selectedType}-report-${format(new Date(), 'yyyy-MM-dd')}.${format}`);
      
      toast.success('Report erfolgreich generiert!', { id: toastId });

      // Add to recent reports
      setRecentReports(prev => [{
        id: Date.now(),
        type: selectedType,
        format,
        dateRange,
        createdAt: new Date(),
        size: file.size
      }, ...prev].slice(0, 5));

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Fehler beim Generieren des Reports', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleScheduleReport = async () => {
    try {
      await scheduleReport({
        type: selectedType,
        dateRange,
        format,
        schedule: scheduleConfig,
        tenantId: tenant.id
      });

      toast.success('Report-Plan erfolgreich erstellt!');
      setShowScheduleModal(false);
      loadScheduledReports();
    } catch (error) {
      console.error('Error scheduling report:', error);
      toast.error('Fehler beim Planen des Reports');
    }
  };

  const handleEmailChange = (index, value) => {
    const newEmails = [...scheduleConfig.emails];
    newEmails[index] = value;
    setScheduleConfig(prev => ({ ...prev, emails: newEmails }));
  };

  const addEmailField = () => {
    setScheduleConfig(prev => ({
      ...prev,
      emails: [...prev.emails, '']
    }));
  };

  const removeEmailField = (index) => {
    setScheduleConfig(prev => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index)
    }));
  };

  // Computed values
  const selectedReportType = REPORT_TYPES[Object.keys(REPORT_TYPES).find(
    key => REPORT_TYPES[key].id === selectedType
  )];

  const canGenerateReport = selectedType && dateRange.start && dateRange.end && format;

  // Render
  if (reportsLoading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Report Generator</h1>
          <p className={styles.subtitle}>
            Erstellen Sie detaillierte Berichte für Ihre Analysen
          </p>
        </div>
        <Button
          variant="outline"
          icon={Settings}
          onClick={() => navigate('/admin/reports/templates')}
        >
          Vorlagen verwalten
        </Button>
      </div>

      <div className={styles.content}>
        {/* Report Type Selection */}
        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>Report-Typ auswählen</h2>
          <div className={styles.reportTypes}>
            {Object.values(REPORT_TYPES).map(type => (
              <div
                key={type.id}
                className={`${styles.reportType} ${
                  selectedType === type.id ? styles.selected : ''
                }`}
                onClick={() => {
                  setSelectedType(type.id);
                  setFormat(type.formats[0]);
                }}
                style={{
                  '--report-color': type.color
                }}
              >
                <div className={styles.reportIcon}>
                  <type.icon size={24} />
                </div>
                <h3>{type.name}</h3>
                <p>{type.description}</p>
                <div className={styles.formats}>
                  {type.formats.map(f => (
                    <span key={f} className={styles.format}>
                      {f.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Configuration */}
        <div className={styles.configGrid}>
          {/* Date Range */}
          <Card className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Calendar className={styles.sectionIcon} />
              Zeitraum
            </h2>
            
            <div className={styles.quickRanges}>
              {QUICK_RANGES.map(range => (
                <button
                  key={range.id}
                  className={styles.quickRange}
                  onClick={() => handleQuickRange(range.id)}
                >
                  {range.label}
                </button>
              ))}
            </div>

            <DateRangePicker
              startDate={dateRange.start}
              endDate={dateRange.end}
              onStartDateChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
              onEndDateChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
              className={styles.dateRangePicker}
            />

            <div className={styles.datePreview}>
              <Clock size={16} />
              <span>
                {format(dateRange.start, 'dd. MMM yyyy', { locale: de })} - 
                {format(dateRange.end, 'dd. MMM yyyy', { locale: de })}
              </span>
            </div>
          </Card>

          {/* Format & Options */}
          <Card className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Filter className={styles.sectionIcon} />
              Format & Optionen
            </h2>

            <div className={styles.field}>
              <label>Ausgabeformat</label>
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                disabled={!selectedReportType}
              >
                {selectedReportType?.formats.map(f => (
                  <option key={f} value={f}>
                    {f === 'pdf' ? 'PDF Dokument' : 'Excel Datei'}
                  </option>
                ))}
              </Select>
            </div>

            <div className={styles.options}>
              <label className={styles.checkbox}>
                <input type="checkbox" defaultChecked />
                <span>Grafiken einschließen</span>
              </label>
              <label className={styles.checkbox}>
                <input type="checkbox" defaultChecked />
                <span>Detaillierte Aufschlüsselung</span>
              </label>
              <label className={styles.checkbox}>
                <input type="checkbox" />
                <span>Vergleich zum Vorjahreszeitraum</span>
              </label>
            </div>

            <div className={styles.actions}>
              <Button
                variant="primary"
                icon={Download}
                onClick={handleGenerateReport}
                disabled={!canGenerateReport || generating}
                loading={generating}
                fullWidth
              >
                Report generieren
              </Button>
              <Button
                variant="outline"
                icon={Clock}
                onClick={() => setShowScheduleModal(true)}
                disabled={!canGenerateReport}
                fullWidth
              >
                Report planen
              </Button>
            </div>
          </Card>
        </div>

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <Card className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Clock className={styles.sectionIcon} />
              Kürzlich generierte Reports
            </h2>
            <div className={styles.recentReports}>
              {recentReports.map(report => (
                <div key={report.id} className={styles.recentReport}>
                  <FileText size={20} />
                  <div className={styles.reportInfo}>
                    <span className={styles.reportName}>
                      {REPORT_TYPES[Object.keys(REPORT_TYPES).find(
                        key => REPORT_TYPES[key].id === report.type
                      )]?.name}
                    </span>
                    <span className={styles.reportMeta}>
                      {format(report.createdAt, 'dd.MM.yyyy HH:mm')} • 
                      {report.format.toUpperCase()} • 
                      {(report.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <ChevronRight size={16} className={styles.reportAction} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Scheduled Reports */}
        {scheduledReports.length > 0 && (
          <Card className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Clock className={styles.sectionIcon} />
              Geplante Reports
            </h2>
            <div className={styles.scheduledReports}>
              {scheduledReports.map(report => (
                <div key={report.id} className={styles.scheduledReport}>
                  <div className={styles.scheduleIndicator}>
                    {report.active ? (
                      <CheckCircle size={20} className={styles.active} />
                    ) : (
                      <AlertCircle size={20} className={styles.inactive} />
                    )}
                  </div>
                  <div className={styles.scheduleInfo}>
                    <h4>{report.name}</h4>
                    <p>
                      {report.frequency} • Nächste Ausführung: 
                      {format(new Date(report.nextRun), 'dd.MM.yyyy HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => navigate(`/admin/reports/scheduled/${report.id}`)}
                  >
                    Bearbeiten
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Report planen"
        maxWidth="500px"
      >
        <div className={styles.scheduleForm}>
          <div className={styles.field}>
            <label>Häufigkeit</label>
            <Select
              value={scheduleConfig.frequency}
              onChange={(e) => setScheduleConfig(prev => ({ 
                ...prev, 
                frequency: e.target.value 
              }))}
            >
              {SCHEDULE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {scheduleConfig.frequency !== 'once' && (
            <div className={styles.field}>
              <label>Uhrzeit</label>
              <input
                type="time"
                value={scheduleConfig.time}
                onChange={(e) => setScheduleConfig(prev => ({ 
                  ...prev, 
                  time: e.target.value 
                }))}
                className={styles.timeInput}
              />
            </div>
          )}

          <div className={styles.field}>
            <label>E-Mail Empfänger</label>
            {scheduleConfig.emails.map((email, index) => (
              <div key={index} className={styles.emailField}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  placeholder="email@beispiel.ch"
                  className={styles.emailInput}
                />
                {scheduleConfig.emails.length > 1 && (
                  <button
                    onClick={() => removeEmailField(index)}
                    className={styles.removeEmail}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="small"
              icon={FilePlus}
              onClick={addEmailField}
            >
              Empfänger hinzufügen
            </Button>
          </div>

          <div className={styles.modalActions}>
            <Button
              variant="outline"
              onClick={() => setShowScheduleModal(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={handleScheduleReport}
            >
              Plan speichern
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default ReportGenerator;