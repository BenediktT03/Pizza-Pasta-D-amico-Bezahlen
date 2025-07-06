/**
 * EATECH - Report Generator
 * Version: 24.0.0
 * Description: Hauptkomponente für die Generierung von PDF und Excel Reports mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/reports/ReportGenerator.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FileText, Download, Calendar, Filter, TrendingUp, Clock,
  CheckCircle, AlertCircle, FileSpreadsheet, FilePlus, Send,
  Save, Settings, ChevronRight, BarChart3, PieChart, Activity,
  DollarSign, Package, Users, ShoppingCart, RefreshCw, Eye,
  Printer, Mail, Share2, Zap, Database, HardDrive
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';

// Lazy loaded heavy components
const ReportPreview = lazy(() => import('./components/ReportPreview'));
const ChartBuilder = lazy(() => import('./components/ChartBuilder'));
const DataTableBuilder = lazy(() => import('./components/DataTableBuilder'));
const ReportScheduler = lazy(() => import('./components/ReportScheduler'));
const ExportOptionsModal = lazy(() => import('./components/ExportOptionsModal'));
const EmailReportModal = lazy(() => import('./components/EmailReportModal'));

// Lazy loaded chart libraries
const SalesChart = lazy(() => import('./charts/SalesChart'));
const OrdersChart = lazy(() => import('./charts/OrdersChart'));
const ProductsChart = lazy(() => import('./charts/ProductsChart'));
const CustomersChart = lazy(() => import('./charts/CustomersChart'));
const FinancialChart = lazy(() => import('./charts/FinancialChart'));

// Lazy loaded services
const ReportService = lazy(() => import('../../services/reportService'));
const PDFGenerator = lazy(() => import('../../services/pdfGenerator'));
const ExcelGenerator = lazy(() => import('../../services/excelGenerator'));
const EmailService = lazy(() => import('../../services/emailService'));
const DataService = lazy(() => import('../../services/dataService'));

// Lazy loaded utilities
const toast = lazy(() => import('react-hot-toast'));
const jsPDF = lazy(() => import('jspdf'));
const ExcelJS = lazy(() => import('exceljs'));
const html2canvas = lazy(() => import('html2canvas'));

// Loading components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const ChartSkeleton = () => (
  <div className="animate-pulse bg-gray-200 rounded-lg h-64 w-full"></div>
);

// Hooks
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';

// UI Components
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import DateRangePicker from '../../components/ui/DateRangePicker';
import Modal from '../../components/ui/Modal';
import Checkbox from '../../components/ui/Checkbox';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

// Utils
import { formatCurrency } from '../../utils/formatters';
import { downloadFile } from '../../utils/fileDownload';

// Styles
import styles from './ReportGenerator.module.css';

// Constants
const REPORT_TYPES = {
  SALES: {
    id: 'sales',
    name: 'Umsatzbericht',
    description: 'Detaillierte Umsatzanalyse mit Produktaufschlüsselung',
    icon: TrendingUp,
    formats: ['pdf', 'excel'],
    color: '#10B981',
    charts: ['revenue', 'orders', 'average', 'products'],
    tables: ['daily', 'products', 'categories', 'payment_methods']
  },
  ORDERS: {
    id: 'orders',
    name: 'Bestellübersicht',
    description: 'Alle Bestellungen im gewählten Zeitraum',
    icon: ShoppingCart,
    formats: ['pdf', 'excel'],
    color: '#3B82F6',
    charts: ['orders_timeline', 'order_status', 'fulfillment_time'],
    tables: ['orders_list', 'order_items', 'customer_orders']
  },
  INVENTORY: {
    id: 'inventory',
    name: 'Inventarbericht',
    description: 'Lagerbestand und Verbrauchsanalyse',
    icon: Package,
    formats: ['excel'],
    color: '#8B5CF6',
    charts: ['stock_levels', 'stock_movement', 'low_stock'],
    tables: ['current_stock', 'stock_history', 'supplier_orders']
  },
  CUSTOMERS: {
    id: 'customers',
    name: 'Kundenbericht',
    description: 'Kundenanalyse und Loyalitätsdaten',
    icon: Users,
    formats: ['pdf', 'excel'],
    color: '#EC4899',
    charts: ['new_customers', 'retention', 'lifetime_value'],
    tables: ['customer_list', 'top_customers', 'loyalty_members']
  },
  FINANCIAL: {
    id: 'financial',
    name: 'Finanzbericht',
    description: 'Vollständige Finanzübersicht inkl. Steuern',
    icon: DollarSign,
    formats: ['pdf', 'excel'],
    color: '#F59E0B',
    charts: ['profit_loss', 'expenses', 'taxes', 'cash_flow'],
    tables: ['income_statement', 'balance_sheet', 'tax_summary']
  }
};

const DATE_RANGES = [
  { value: 'today', label: 'Heute' },
  { value: 'yesterday', label: 'Gestern' },
  { value: 'last7days', label: 'Letzte 7 Tage' },
  { value: 'last30days', label: 'Letzte 30 Tage' },
  { value: 'thisMonth', label: 'Dieser Monat' },
  { value: 'lastMonth', label: 'Letzter Monat' },
  { value: 'thisQuarter', label: 'Dieses Quartal' },
  { value: 'lastQuarter', label: 'Letztes Quartal' },
  { value: 'thisYear', label: 'Dieses Jahr' },
  { value: 'custom', label: 'Benutzerdefiniert' }
];

// Main Component
const ReportGenerator = () => {
  // State
  const [selectedType, setSelectedType] = useState('sales');
  const [dateRange, setDateRange] = useState('thisMonth');
  const [customDateRange, setCustomDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [selectedCharts, setSelectedCharts] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [services, setServices] = useState({});
  const [reportConfig, setReportConfig] = useState({
    includeCharts: true,
    includeTables: true,
    includeFilters: true,
    includeSummary: true,
    includeFooter: true,
    orientation: 'portrait',
    paperSize: 'A4',
    language: 'de'
  });

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { user } = useAuth();

  // Load services
  useEffect(() => {
    const loadServices = async () => {
      try {
        const [
          reportSvc,
          pdfGen,
          excelGen,
          emailSvc,
          dataSvc,
          toastLib,
          jsPDFLib,
          excelLib,
          html2canvasLib
        ] = await Promise.all([
          import('../../services/reportService'),
          import('../../services/pdfGenerator'),
          import('../../services/excelGenerator'),
          import('../../services/emailService'),
          import('../../services/dataService'),
          import('react-hot-toast'),
          import('jspdf'),
          import('exceljs'),
          import('html2canvas')
        ]);
        
        setServices({
          report: reportSvc.default,
          pdf: pdfGen.default,
          excel: excelGen.default,
          email: emailSvc.default,
          data: dataSvc.default,
          toast: toastLib.default,
          jsPDF: jsPDFLib.default,
          ExcelJS: excelLib.default,
          html2canvas: html2canvasLib.default
        });
      } catch (error) {
        console.error('Failed to load services:', error);
      }
    };
    loadServices();
  }, []);

  // Initialize from URL params
  useEffect(() => {
    const type = searchParams.get('type');
    const range = searchParams.get('range');
    
    if (type && REPORT_TYPES[type.toUpperCase()]) {
      setSelectedType(type);
    }
    if (range && DATE_RANGES.find(r => r.value === range)) {
      setDateRange(range);
    }
  }, [searchParams]);

  // Auto-select default charts and tables when type changes
  useEffect(() => {
    const reportType = REPORT_TYPES[selectedType.toUpperCase()];
    if (reportType) {
      setSelectedCharts(reportType.charts.slice(0, 2)); // Select first 2 charts by default
      setSelectedTables(reportType.tables.slice(0, 2)); // Select first 2 tables by default
    }
  }, [selectedType]);

  // Calculate date range
  const calculatedDateRange = useMemo(() => {
    const now = new Date();
    let start, end;

    switch (dateRange) {
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
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'custom':
        start = customDateRange.start;
        end = customDateRange.end;
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { start, end };
  }, [dateRange, customDateRange]);

  // Load report data
  const loadReportData = useCallback(async () => {
    if (!services.data || !tenant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await services.data.getReportData({
        tenantId: tenant.id,
        type: selectedType,
        dateRange: calculatedDateRange,
        charts: selectedCharts,
        tables: selectedTables
      });

      setReportData(data);
    } catch (error) {
      console.error('Error loading report data:', error);
      setError('Fehler beim Laden der Daten');
      if (services.toast) {
        services.toast.error('Fehler beim Laden der Report-Daten');
      }
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, selectedType, calculatedDateRange, selectedCharts, selectedTables, services]);

  // Generate report
  const generateReport = useCallback(async (format = 'pdf') => {
    if (!reportData || !services.pdf || !services.excel || !services.toast) return;

    setGenerating(true);
    setError(null);

    try {
      let file;
      const reportTitle = `${REPORT_TYPES[selectedType.toUpperCase()].name} - ${
        format(calculatedDateRange.start, 'dd.MM.yyyy', { locale: de })
      } bis ${
        format(calculatedDateRange.end, 'dd.MM.yyyy', { locale: de })
      }`;

      if (format === 'pdf') {
        file = await services.pdf.generateReport({
          title: reportTitle,
          data: reportData,
          config: reportConfig,
          charts: selectedCharts,
          tables: selectedTables,
          tenant: tenant
        });
        
        downloadFile(file, `bericht-${selectedType}-${Date.now()}.pdf`, 'application/pdf');
      } else if (format === 'excel') {
        file = await services.excel.generateReport({
          title: reportTitle,
          data: reportData,
          config: reportConfig,
          charts: selectedCharts,
          tables: selectedTables,
          tenant: tenant
        });
        
        downloadFile(file, `bericht-${selectedType}-${Date.now()}.xlsx`, 
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      }

      services.toast.success(`${format.toUpperCase()} erfolgreich generiert`);

      // Save to history
      if (services.report) {
        await services.report.saveToHistory({
          tenantId: tenant.id,
          type: selectedType,
          format: format,
          dateRange: calculatedDateRange,
          generatedBy: user.id,
          fileSize: file.size
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Fehler beim Generieren des Reports');
      services.toast.error('Fehler beim Generieren des Reports');
    } finally {
      setGenerating(false);
    }
  }, [reportData, selectedType, calculatedDateRange, reportConfig, selectedCharts, selectedTables, tenant, user, services]);

  // Handlers
  const handleChartToggle = useCallback((chartId) => {
    setSelectedCharts(prev =>
      prev.includes(chartId)
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    );
  }, []);

  const handleTableToggle = useCallback((tableId) => {
    setSelectedTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  }, []);

  const handleGenerateClick = useCallback(() => {
    if (selectedCharts.length === 0 && selectedTables.length === 0) {
      if (services.toast) {
        services.toast.error('Bitte wählen Sie mindestens ein Diagramm oder eine Tabelle aus');
      }
      return;
    }
    
    loadReportData();
  }, [selectedCharts.length, selectedTables.length, loadReportData, services]);

  const handleExport = useCallback((format) => {
    setExportFormat(format);
    generateReport(format);
    setShowExportOptions(false);
  }, [generateReport]);

  const handleEmailReport = useCallback(async (emailData) => {
    if (!services.email || !services.toast) return;

    try {
      // First generate the report
      const format = emailData.format || 'pdf';
      await generateReport(format);
      
      // Then send email
      await services.email.sendReport({
        to: emailData.recipients,
        subject: emailData.subject,
        message: emailData.message,
        reportType: selectedType,
        format: format,
        attachReport: true
      });
      
      services.toast.success('Report erfolgreich versendet');
      setShowEmailModal(false);
    } catch (error) {
      console.error('Error sending report:', error);
      services.toast.error('Fehler beim Versenden des Reports');
    }
  }, [services, generateReport, selectedType]);

  const handleScheduleReport = useCallback(async (scheduleData) => {
    if (!services.report || !services.toast) return;

    try {
      await services.report.scheduleReport({
        tenantId: tenant.id,
        ...scheduleData,
        reportType: selectedType,
        dateRange: dateRange,
        charts: selectedCharts,
        tables: selectedTables,
        config: reportConfig
      });
      
      services.toast.success('Report-Zeitplan erfolgreich erstellt');
      setShowScheduler(false);
    } catch (error) {
      console.error('Error scheduling report:', error);
      services.toast.error('Fehler beim Erstellen des Zeitplans');
    }
  }, [services, tenant?.id, selectedType, dateRange, selectedCharts, selectedTables, reportConfig]);

  // Render chart selector
  const renderChartSelector = () => {
    const reportType = REPORT_TYPES[selectedType.toUpperCase()];
    
    return (
      <Card className={styles.selectorCard}>
        <h3 className={styles.selectorTitle}>
          <BarChart3 size={20} />
          Diagramme auswählen
        </h3>
        <div className={styles.selectorGrid}>
          {reportType.charts.map(chartId => (
            <label key={chartId} className={styles.selectorItem}>
              <Checkbox
                checked={selectedCharts.includes(chartId)}
                onChange={() => handleChartToggle(chartId)}
              />
              <span className={styles.selectorLabel}>
                {chartId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </label>
          ))}
        </div>
      </Card>
    );
  };

  // Render table selector
  const renderTableSelector = () => {
    const reportType = REPORT_TYPES[selectedType.toUpperCase()];
    
    return (
      <Card className={styles.selectorCard}>
        <h3 className={styles.selectorTitle}>
          <Database size={20} />
          Tabellen auswählen
        </h3>
        <div className={styles.selectorGrid}>
          {reportType.tables.map(tableId => (
            <label key={tableId} className={styles.selectorItem}>
              <Checkbox
                checked={selectedTables.includes(tableId)}
                onChange={() => handleTableToggle(tableId)}
              />
              <span className={styles.selectorLabel}>
                {tableId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </label>
          ))}
        </div>
      </Card>
    );
  };

  // Render report preview
  const renderReportPreview = () => {
    if (!reportData) return null;

    const reportType = REPORT_TYPES[selectedType.toUpperCase()];

    return (
      <div className={styles.previewContainer}>
        <div className={styles.previewHeader}>
          <h2 className={styles.previewTitle}>
            <reportType.icon size={24} />
            {reportType.name}
          </h2>
          <Badge variant="secondary">
            {format(calculatedDateRange.start, 'dd.MM.yyyy', { locale: de })} - 
            {format(calculatedDateRange.end, 'dd.MM.yyyy', { locale: de })}
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className={styles.summaryGrid}>
          {reportData.summary && Object.entries(reportData.summary).map(([key, value]) => (
            <Card key={key} className={styles.summaryCard}>
              <h4 className={styles.summaryLabel}>
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h4>
              <p className={styles.summaryValue}>
                {typeof value === 'number' && key.includes('revenue')
                  ? formatCurrency(value)
                  : value.toLocaleString('de-CH')}
              </p>
            </Card>
          ))}
        </div>

        {/* Charts */}
        {selectedCharts.length > 0 && (
          <div className={styles.chartsSection}>
            <h3 className={styles.sectionTitle}>Diagramme</h3>
            <div className={styles.chartsGrid}>
              {selectedCharts.map(chartId => (
                <Suspense key={chartId} fallback={<ChartSkeleton />}>
                  <Card className={styles.chartCard}>
                    {chartId === 'revenue' && <SalesChart data={reportData.charts[chartId]} />}
                    {chartId === 'orders' && <OrdersChart data={reportData.charts[chartId]} />}
                    {chartId === 'products' && <ProductsChart data={reportData.charts[chartId]} />}
                    {chartId === 'new_customers' && <CustomersChart data={reportData.charts[chartId]} />}
                    {chartId === 'profit_loss' && <FinancialChart data={reportData.charts[chartId]} />}
                  </Card>
                </Suspense>
              ))}
            </div>
          </div>
        )}

        {/* Tables */}
        {selectedTables.length > 0 && (
          <div className={styles.tablesSection}>
            <h3 className={styles.sectionTitle}>Detailtabellen</h3>
            <Suspense fallback={<LoadingSpinner />}>
              <DataTableBuilder
                tables={selectedTables}
                data={reportData.tables}
                config={reportConfig}
              />
            </Suspense>
          </div>
        )}
      </div>
    );
  };

  // Main render
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <FileText size={28} />
            Report Generator
          </h1>
          <p className={styles.subtitle}>
            Erstellen Sie detaillierte Berichte und Analysen
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/reports/history')}
          >
            <Clock size={20} />
            Verlauf
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowScheduler(true)}
          >
            <Calendar size={20} />
            Zeitplan
          </Button>
        </div>
      </header>

      {/* Report Type Selection */}
      <div className={styles.typeSelection}>
        <h2 className={styles.sectionTitle}>Berichtstyp wählen</h2>
        <div className={styles.typeGrid}>
          {Object.entries(REPORT_TYPES).map(([key, type]) => (
            <Card
              key={key}
              className={`${styles.typeCard} ${selectedType === type.id ? styles.selected : ''}`}
              onClick={() => setSelectedType(type.id)}
            >
              <div
                className={styles.typeIcon}
                style={{ backgroundColor: `${type.color}20`, color: type.color }}
              >
                <type.icon size={32} />
              </div>
              <h3 className={styles.typeName}>{type.name}</h3>
              <p className={styles.typeDescription}>{type.description}</p>
              <div className={styles.typeFormats}>
                {type.formats.map(format => (
                  <Badge key={format} variant="secondary" size="sm">
                    {format.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className={styles.configuration}>
        <h2 className={styles.sectionTitle}>Konfiguration</h2>
        
        {/* Date Range Selection */}
        <Card className={styles.dateRangeCard}>
          <h3 className={styles.cardTitle}>
            <Calendar size={20} />
            Zeitraum
          </h3>
          <div className={styles.dateRangeControls}>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className={styles.dateRangeSelect}
            >
              {DATE_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </Select>
            
            {dateRange === 'custom' && (
              <Suspense fallback={<div className={styles.datePickerSkeleton} />}>
                <DateRangePicker
                  startDate={customDateRange.start}
                  endDate={customDateRange.end}
                  onChange={(range) => setCustomDateRange(range)}
                  className={styles.datePicker}
                />
              </Suspense>
            )}
          </div>
          
          <div className={styles.dateRangeDisplay}>
            <Calendar size={16} />
            {format(calculatedDateRange.start, 'dd.MM.yyyy', { locale: de })} - 
            {format(calculatedDateRange.end, 'dd.MM.yyyy', { locale: de })}
          </div>
        </Card>

        {/* Chart and Table Selection */}
        <div className={styles.selectionGrid}>
          {renderChartSelector()}
          {renderTableSelector()}
        </div>

        {/* Report Options */}
        <Card className={styles.optionsCard}>
          <h3 className={styles.cardTitle}>
            <Settings size={20} />
            Report-Optionen
          </h3>
          <div className={styles.optionsGrid}>
            <label className={styles.optionItem}>
              <Checkbox
                checked={reportConfig.includeCharts}
                onChange={(e) => setReportConfig(prev => ({ ...prev, includeCharts: e.target.checked }))}
              />
              <span>Diagramme einschließen</span>
            </label>
            <label className={styles.optionItem}>
              <Checkbox
                checked={reportConfig.includeTables}
                onChange={(e) => setReportConfig(prev => ({ ...prev, includeTables: e.target.checked }))}
              />
              <span>Tabellen einschließen</span>
            </label>
            <label className={styles.optionItem}>
              <Checkbox
                checked={reportConfig.includeSummary}
                onChange={(e) => setReportConfig(prev => ({ ...prev, includeSummary: e.target.checked }))}
              />
              <span>Zusammenfassung einschließen</span>
            </label>
            <label className={styles.optionItem}>
              <Checkbox
                checked={reportConfig.includeFilters}
                onChange={(e) => setReportConfig(prev => ({ ...prev, includeFilters: e.target.checked }))}
              />
              <span>Filterkriterien anzeigen</span>
            </label>
          </div>
          
          <div className={styles.optionsRow}>
            <div className={styles.optionGroup}>
              <label>Ausrichtung</label>
              <Select
                value={reportConfig.orientation}
                onChange={(e) => setReportConfig(prev => ({ ...prev, orientation: e.target.value }))}
              >
                <option value="portrait">Hochformat</option>
                <option value="landscape">Querformat</option>
              </Select>
            </div>
            <div className={styles.optionGroup}>
              <label>Papierformat</label>
              <Select
                value={reportConfig.paperSize}
                onChange={(e) => setReportConfig(prev => ({ ...prev, paperSize: e.target.value }))}
              >
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Generate Button */}
        <div className={styles.generateSection}>
          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerateClick}
            disabled={loading || generating}
            className={styles.generateButton}
          >
            {loading ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Lade Daten...
              </>
            ) : (
              <>
                <Zap size={20} />
                Report generieren
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Report Preview */}
      {reportData && !loading && (
        <>
          <div className={styles.previewSection}>
            <div className={styles.previewHeader}>
              <h2 className={styles.sectionTitle}>Vorschau</h2>
              <div className={styles.previewActions}>
                <Button
                  variant="secondary"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye size={20} />
                  Vollbild
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowEmailModal(true)}
                >
                  <Mail size={20} />
                  Per E-Mail
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowExportOptions(true)}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      Exportieren
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {renderReportPreview()}
          </div>
        </>
      )}

      {/* Error Display */}
      {error && (
        <Card className={styles.errorCard}>
          <AlertCircle size={20} />
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={loadReportData}>
            Erneut versuchen
          </Button>
        </Card>
      )}

      {/* Modals */}
      {showPreview && reportData && (
        <Suspense fallback={<LoadingSpinner />}>
          <Modal
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            title="Report-Vorschau"
            size="full"
          >
            <ReportPreview
              data={reportData}
              config={reportConfig}
              type={selectedType}
              dateRange={calculatedDateRange}
              onExport={(format) => {
                setShowPreview(false);
                handleExport(format);
              }}
            />
          </Modal>
        </Suspense>
      )}

      {showExportOptions && (
        <Suspense fallback={<LoadingSpinner />}>
          <ExportOptionsModal
            isOpen={showExportOptions}
            onClose={() => setShowExportOptions(false)}
            onExport={handleExport}
            availableFormats={REPORT_TYPES[selectedType.toUpperCase()].formats}
            generating={generating}
          />
        </Suspense>
      )}

      {showEmailModal && (
        <Suspense fallback={<LoadingSpinner />}>
          <EmailReportModal
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            onSend={handleEmailReport}
            reportType={selectedType}
            dateRange={calculatedDateRange}
          />
        </Suspense>
      )}

      {showScheduler && (
        <Suspense fallback={<LoadingSpinner />}>
          <ReportScheduler
            isOpen={showScheduler}
            onClose={() => setShowScheduler(false)}
            onSchedule={handleScheduleReport}
            reportType={selectedType}
            currentConfig={{
              charts: selectedCharts,
              tables: selectedTables,
              dateRange: dateRange,
              config: reportConfig
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ReportGenerator;