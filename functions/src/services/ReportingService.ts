/**
 * EATECH - Reporting Service
 * Version: 1.0.0
 * Description: Umfassender Berichterstattungsdienst mit automatisierten Reports
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/services/ReportingService.ts
 * 
 * Features:
 * - Automated report generation
 * - Multiple export formats
 * - Scheduled reports
 * - Custom report builder
 * - Email distribution
 * - Report templates
 * - Data visualization
 * - Compliance reports
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import { 
  Report,
  ReportTemplate,
  ReportSchedule,
  ReportData,
  ExportFormat,
  ReportType
} from '../types/report.types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { 
  format, 
  startOfDay, 
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths
} from 'date-fns';
import { de } from 'date-fns/locale';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ReportGenerationOptions {
  type: ReportType;
  period: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  groupBy?: string[];
  metrics?: string[];
  format: ExportFormat;
  includeCharts?: boolean;
  template?: string;
}

interface ReportResult {
  reportId: string;
  url: string;
  size: number;
  pages?: number;
  generatedAt: string;
  expiresAt: string;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  data: any;
  options?: any;
  width?: number;
  height?: number;
}

interface ReportSection {
  title: string;
  content: any;
  charts?: ChartConfig[];
  tables?: any[];
  summary?: string;
}

interface EmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  attachments: Array<{
    filename: string;
    path: string;
  }>;
  template: string;
  data: any;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const REPORTS_COLLECTION = 'reports';
const REPORT_TEMPLATES_COLLECTION = 'report_templates';
const REPORT_SCHEDULES_COLLECTION = 'report_schedules';

const REPORTS_BUCKET = functions.config().storage?.reports_bucket || 'eatech-reports';
const REPORT_EXPIRY_DAYS = 30;

const EMAIL_CONFIG = {
  host: functions.config().email?.host || 'smtp.gmail.com',
  port: parseInt(functions.config().email?.port || '587'),
  secure: false,
  auth: {
    user: functions.config().email?.user,
    pass: functions.config().email?.password
  }
};

const DEFAULT_TEMPLATES: Record<ReportType, ReportTemplate> = {
  daily_summary: {
    id: 'daily_summary',
    name: 'Tägliche Zusammenfassung',
    type: 'daily_summary',
    sections: ['revenue', 'orders', 'products', 'customers'],
    metrics: ['total_revenue', 'order_count', 'avg_order_value', 'new_customers'],
    charts: ['revenue_timeline', 'top_products', 'order_distribution'],
    layout: 'standard'
  },
  sales_report: {
    id: 'sales_report',
    name: 'Umsatzbericht',
    type: 'sales_report',
    sections: ['overview', 'breakdown', 'trends', 'comparison'],
    metrics: ['revenue', 'transactions', 'growth', 'margins'],
    charts: ['revenue_chart', 'category_breakdown', 'payment_methods'],
    layout: 'detailed'
  },
  inventory_report: {
    id: 'inventory_report',
    name: 'Bestandsbericht',
    type: 'inventory_report',
    sections: ['current_stock', 'movements', 'alerts', 'forecast'],
    metrics: ['total_value', 'low_stock_items', 'turnover_rate'],
    charts: ['stock_levels', 'usage_trends'],
    layout: 'standard'
  },
  customer_report: {
    id: 'customer_report',
    name: 'Kundenbericht',
    type: 'customer_report',
    sections: ['overview', 'segments', 'behavior', 'retention'],
    metrics: ['total_customers', 'new_customers', 'retention_rate', 'ltv'],
    charts: ['growth_chart', 'segment_distribution', 'cohort_analysis'],
    layout: 'detailed'
  },
  financial_report: {
    id: 'financial_report',
    name: 'Finanzbericht',
    type: 'financial_report',
    sections: ['income', 'expenses', 'profit', 'cash_flow'],
    metrics: ['gross_revenue', 'net_profit', 'margins', 'roi'],
    charts: ['pl_statement', 'expense_breakdown', 'trend_analysis'],
    layout: 'financial'
  },
  compliance_report: {
    id: 'compliance_report',
    name: 'Compliance-Bericht',
    type: 'compliance_report',
    sections: ['data_privacy', 'security', 'audit_trail', 'incidents'],
    metrics: ['compliance_score', 'incidents', 'resolved_issues'],
    charts: ['compliance_timeline', 'issue_categories'],
    layout: 'compliance'
  }
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export default class ReportingService {
  private firestore: admin.firestore.Firestore;
  private storage: admin.storage.Storage;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.firestore = admin.firestore();
    this.storage = admin.storage();
    this.transporter = nodemailer.createTransport(EMAIL_CONFIG);
    this.registerHandlebarsHelpers();
  }

  /**
   * Generate report
   */
  async generateReport(
    tenantId: string,
    options: ReportGenerationOptions
  ): Promise<ReportResult> {
    const reportId = uuidv4();
    logger.info(`Generating ${options.type} report for tenant ${tenantId}`);

    try {
      // Get report template
      const template = await this.getReportTemplate(options.template || options.type);

      // Collect report data
      const reportData = await this.collectReportData(tenantId, options, template);

      // Generate report sections
      const sections = await this.generateReportSections(reportData, template, options);

      // Create report document
      let fileUrl: string;
      let fileSize: number;
      let pages: number | undefined;

      switch (options.format) {
        case 'pdf':
          const pdfResult = await this.generatePDFReport(sections, reportData, template);
          fileUrl = pdfResult.url;
          fileSize = pdfResult.size;
          pages = pdfResult.pages;
          break;

        case 'excel':
          const excelResult = await this.generateExcelReport(sections, reportData, template);
          fileUrl = excelResult.url;
          fileSize = excelResult.size;
          break;

        case 'csv':
          const csvResult = await this.generateCSVReport(sections, reportData);
          fileUrl = csvResult.url;
          fileSize = csvResult.size;
          break;

        case 'json':
          const jsonResult = await this.generateJSONReport(sections, reportData);
          fileUrl = jsonResult.url;
          fileSize = jsonResult.size;
          break;

        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      // Save report metadata
      await this.saveReportMetadata({
        id: reportId,
        tenantId,
        type: options.type,
        format: options.format,
        url: fileUrl,
        size: fileSize,
        pages,
        period: options.period,
        filters: options.filters,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + REPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      });

      const result: ReportResult = {
        reportId,
        url: fileUrl,
        size: fileSize,
        pages,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + REPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
      };

      logger.info(`Report ${reportId} generated successfully`);
      return result;

    } catch (error) {
      logger.error(`Report generation failed for ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule report
   */
  async scheduleReport(
    tenantId: string,
    schedule: ReportSchedule
  ): Promise<void> {
    try {
      const scheduleId = uuidv4();
      
      await this.firestore
        .collection(REPORT_SCHEDULES_COLLECTION)
        .doc(scheduleId)
        .set({
          id: scheduleId,
          tenantId,
          ...schedule,
          active: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          nextRun: this.calculateNextRun(schedule)
        });

      logger.info(`Report schedule ${scheduleId} created for tenant ${tenantId}`);
    } catch (error) {
      logger.error('Error scheduling report:', error);
      throw error;
    }
  }

  /**
   * Process scheduled reports
   */
  async processScheduledReports(): Promise<void> {
    try {
      const now = new Date();
      
      // Get due schedules
      const schedulesSnapshot = await this.firestore
        .collection(REPORT_SCHEDULES_COLLECTION)
        .where('active', '==', true)
        .where('nextRun', '<=', now)
        .get();

      for (const doc of schedulesSnapshot.docs) {
        const schedule = doc.data() as ReportSchedule;
        
        try {
          // Generate report
          const period = this.getReportPeriod(schedule.frequency);
          
          const report = await this.generateReport(schedule.tenantId, {
            type: schedule.reportType,
            period,
            format: schedule.format,
            filters: schedule.filters,
            includeCharts: true
          });

          // Send report
          if (schedule.recipients && schedule.recipients.length > 0) {
            await this.sendReportEmail(
              schedule.recipients,
              report,
              schedule.reportType,
              period
            );
          }

          // Update schedule
          await doc.ref.update({
            lastRun: admin.firestore.FieldValue.serverTimestamp(),
            nextRun: this.calculateNextRun(schedule),
            lastReportId: report.reportId
          });

        } catch (error) {
          logger.error(`Scheduled report failed for ${schedule.id}:`, error);
          
          await doc.ref.update({
            lastError: error.message,
            failureCount: admin.firestore.FieldValue.increment(1)
          });
        }
      }
    } catch (error) {
      logger.error('Error processing scheduled reports:', error);
      throw error;
    }
  }

  /**
   * Get report
   */
  async getReport(reportId: string): Promise<Report | null> {
    try {
      const doc = await this.firestore
        .collection(REPORTS_COLLECTION)
        .doc(reportId)
        .get();

      return doc.exists ? doc.data() as Report : null;
    } catch (error) {
      logger.error('Error getting report:', error);
      throw error;
    }
  }

  /**
   * List reports
   */
  async listReports(
    tenantId: string,
    options?: {
      type?: ReportType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<Report[]> {
    try {
      let query = this.firestore
        .collection(REPORTS_COLLECTION)
        .where('tenantId', '==', tenantId)
        .orderBy('generatedAt', 'desc');

      if (options?.type) {
        query = query.where('type', '==', options.type);
      }

      if (options?.startDate) {
        query = query.where('generatedAt', '>=', options.startDate);
      }

      if (options?.endDate) {
        query = query.where('generatedAt', '<=', options.endDate);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data() as Report);

    } catch (error) {
      logger.error('Error listing reports:', error);
      throw error;
    }
  }

  // ============================================================================
  // REPORT GENERATION METHODS
  // ============================================================================

  /**
   * Generate PDF report
   */
  private async generatePDFReport(
    sections: ReportSection[],
    data: ReportData,
    template: ReportTemplate
  ): Promise<{ url: string; size: number; pages: number }> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: data.title,
        Author: 'EATECH Reporting System',
        Subject: template.name,
        CreationDate: new Date()
      }
    });

    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));

    // Add header
    this.addPDFHeader(doc, data);

    // Add sections
    for (const section of sections) {
      this.addPDFSection(doc, section);
    }

    // Add footer
    this.addPDFFooter(doc, data);

    doc.end();

    // Wait for PDF generation to complete
    await new Promise(resolve => doc.on('end', resolve));

    const pdfBuffer = Buffer.concat(chunks);
    
    // Upload to storage
    const fileName = `reports/${data.tenantId}/${data.reportId}.pdf`;
    const file = this.storage.bucket(REPORTS_BUCKET).file(fileName);
    
    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          reportId: data.reportId,
          tenantId: data.tenantId,
          type: data.type
        }
      }
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + REPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    });

    return {
      url,
      size: pdfBuffer.length,
      pages: doc.bufferedPageRange().count
    };
  }

  /**
   * Generate Excel report
   */
  private async generateExcelReport(
    sections: ReportSection[],
    data: ReportData,
    template: ReportTemplate
  ): Promise<{ url: string; size: number }> {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'EATECH Reporting System';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.properties = {
      title: data.title,
      subject: template.name,
      company: data.tenantName
    };

    // Add overview sheet
    const overviewSheet = workbook.addWorksheet('Übersicht');
    this.addExcelOverview(overviewSheet, data);

    // Add section sheets
    for (const section of sections) {
      const sheet = workbook.addWorksheet(section.title);
      this.addExcelSection(sheet, section);
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Upload to storage
    const fileName = `reports/${data.tenantId}/${data.reportId}.xlsx`;
    const file = this.storage.bucket(REPORTS_BUCKET).file(fileName);
    
    await file.save(buffer, {
      metadata: {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        metadata: {
          reportId: data.reportId,
          tenantId: data.tenantId,
          type: data.type
        }
      }
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + REPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    });

    return {
      url,
      size: buffer.length
    };
  }

  /**
   * Generate CSV report
   */
  private async generateCSVReport(
    sections: ReportSection[],
    data: ReportData
  ): Promise<{ url: string; size: number }> {
    const csvLines: string[] = [];
    
    // Add header
    csvLines.push(`"${data.title}"`);
    csvLines.push(`"Erstellt am: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}"`);
    csvLines.push('');

    // Add sections
    for (const section of sections) {
      csvLines.push(`"${section.title}"`);
      
      // Add tables as CSV
      if (section.tables) {
        for (const table of section.tables) {
          csvLines.push(...this.tableToCSV(table));
          csvLines.push('');
        }
      }
      
      csvLines.push('');
    }

    const csvContent = csvLines.join('\n');
    const buffer = Buffer.from(csvContent, 'utf8');

    // Upload to storage
    const fileName = `reports/${data.tenantId}/${data.reportId}.csv`;
    const file = this.storage.bucket(REPORTS_BUCKET).file(fileName);
    
    await file.save(buffer, {
      metadata: {
        contentType: 'text/csv',
        metadata: {
          reportId: data.reportId,
          tenantId: data.tenantId,
          type: data.type
        }
      }
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + REPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    });

    return {
      url,
      size: buffer.length
    };
  }

  /**
   * Generate JSON report
   */
  private async generateJSONReport(
    sections: ReportSection[],
    data: ReportData
  ): Promise<{ url: string; size: number }> {
    const jsonData = {
      metadata: {
        reportId: data.reportId,
        title: data.title,
        type: data.type,
        generatedAt: new Date().toISOString(),
        period: data.period
      },
      sections,
      summary: data.summary,
      metrics: data.metrics
    };

    const jsonContent = JSON.stringify(jsonData, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf8');

    // Upload to storage
    const fileName = `reports/${data.tenantId}/${data.reportId}.json`;
    const file = this.storage.bucket(REPORTS_BUCKET).file(fileName);
    
    await file.save(buffer, {
      metadata: {
        contentType: 'application/json',
        metadata: {
          reportId: data.reportId,
          tenantId: data.tenantId,
          type: data.type
        }
      }
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + REPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    });

    return {
      url,
      size: buffer.length
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get report template
   */
  private async getReportTemplate(templateId: string): Promise<ReportTemplate> {
    // Try to get custom template
    const doc = await this.firestore
      .collection(REPORT_TEMPLATES_COLLECTION)
      .doc(templateId)
      .get();

    if (doc.exists) {
      return doc.data() as ReportTemplate;
    }

    // Fall back to default template
    return DEFAULT_TEMPLATES[templateId as ReportType] || DEFAULT_TEMPLATES.daily_summary;
  }

  /**
   * Collect report data
   */
  private async collectReportData(
    tenantId: string,
    options: ReportGenerationOptions,
    template: ReportTemplate
  ): Promise<ReportData> {
    const data: ReportData = {
      reportId: uuidv4(),
      tenantId,
      tenantName: await this.getTenantName(tenantId),
      title: this.generateReportTitle(options.type, options.period),
      type: options.type,
      period: options.period,
      generatedAt: new Date(),
      sections: {},
      metrics: {},
      summary: {}
    };

    // Collect metrics
    for (const metric of template.metrics) {
      data.metrics[metric] = await this.collectMetric(
        tenantId,
        metric,
        options.period,
        options.filters
      );
    }

    // Collect section data
    for (const section of template.sections) {
      data.sections[section] = await this.collectSectionData(
        tenantId,
        section,
        options.period,
        options.filters
      );
    }

    // Generate summary
    data.summary = await this.generateSummary(data);

    return data;
  }

  /**
   * Generate report sections
   */
  private async generateReportSections(
    data: ReportData,
    template: ReportTemplate,
    options: ReportGenerationOptions
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];

    for (const sectionId of template.sections) {
      const sectionData = data.sections[sectionId];
      
      const section: ReportSection = {
        title: this.getSectionTitle(sectionId),
        content: sectionData,
        tables: this.generateSectionTables(sectionId, sectionData),
        summary: this.generateSectionSummary(sectionId, sectionData)
      };

      // Add charts if requested
      if (options.includeCharts && template.charts.includes(`${sectionId}_chart`)) {
        section.charts = await this.generateSectionCharts(sectionId, sectionData);
      }

      sections.push(section);
    }

    return sections;
  }

  /**
   * Add PDF header
   */
  private addPDFHeader(doc: PDFKit.PDFDocument, data: ReportData): void {
    // Logo
    // doc.image('path/to/logo.png', 50, 45, { width: 100 });

    // Title
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text(data.title, 50, 50, { align: 'center' });

    // Tenant name
    doc.fontSize(14)
       .font('Helvetica')
       .text(data.tenantName, { align: 'center' });

    // Period
    doc.fontSize(12)
       .text(
         `${format(data.period.start, 'dd.MM.yyyy', { locale: de })} - ` +
         `${format(data.period.end, 'dd.MM.yyyy', { locale: de })}`,
         { align: 'center' }
       );

    doc.moveDown(2);
  }

  /**
   * Add PDF section
   */
  private addPDFSection(doc: PDFKit.PDFDocument, section: ReportSection): void {
    // Section title
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(section.title);
    
    doc.moveDown();

    // Section summary
    if (section.summary) {
      doc.fontSize(12)
         .font('Helvetica')
         .text(section.summary);
      
      doc.moveDown();
    }

    // Tables
    if (section.tables) {
      for (const table of section.tables) {
        this.addPDFTable(doc, table);
        doc.moveDown();
      }
    }

    // Add page break if needed
    if (doc.y > 700) {
      doc.addPage();
    }
  }

  /**
   * Add PDF footer
   */
  private addPDFFooter(doc: PDFKit.PDFDocument, data: ReportData): void {
    const pages = doc.bufferedPageRange();
    
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      // Page number
      doc.fontSize(10)
         .font('Helvetica')
         .text(
           `Seite ${i + 1} von ${pages.count}`,
           50,
           doc.page.height - 50,
           { align: 'center' }
         );
      
      // Generation date
      doc.fontSize(8)
         .text(
           `Erstellt am ${format(data.generatedAt, 'dd.MM.yyyy HH:mm', { locale: de })}`,
           { align: 'right' }
         );
    }
  }

  /**
   * Add PDF table
   */
  private addPDFTable(doc: PDFKit.PDFDocument, table: any): void {
    const startX = 50;
    let currentY = doc.y;
    
    // Table header
    doc.fontSize(10)
       .font('Helvetica-Bold');
    
    let currentX = startX;
    for (const header of table.headers) {
      doc.text(header, currentX, currentY, { width: 100, align: 'left' });
      currentX += 100;
    }
    
    currentY += 20;
    
    // Table rows
    doc.font('Helvetica');
    
    for (const row of table.rows) {
      currentX = startX;
      for (const cell of row) {
        doc.text(String(cell), currentX, currentY, { width: 100, align: 'left' });
        currentX += 100;
      }
      currentY += 15;
      
      // Check for page break
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
    }
    
    doc.y = currentY;
  }

  /**
   * Add Excel overview
   */
  private addExcelOverview(sheet: ExcelJS.Worksheet, data: ReportData): void {
    // Title
    sheet.getCell('A1').value = data.title;
    sheet.getCell('A1').font = { size: 16, bold: true };
    
    // Tenant
    sheet.getCell('A3').value = 'Tenant:';
    sheet.getCell('B3').value = data.tenantName;
    
    // Period
    sheet.getCell('A4').value = 'Zeitraum:';
    sheet.getCell('B4').value = `${format(data.period.start, 'dd.MM.yyyy')} - ${format(data.period.end, 'dd.MM.yyyy')}`;
    
    // Generated
    sheet.getCell('A5').value = 'Erstellt:';
    sheet.getCell('B5').value = format(data.generatedAt, 'dd.MM.yyyy HH:mm');
    
    // Key metrics
    sheet.getCell('A7').value = 'Hauptmetriken';
    sheet.getCell('A7').font = { bold: true };
    
    let row = 8;
    for (const [key, value] of Object.entries(data.metrics)) {
      sheet.getCell(`A${row}`).value = this.getMetricLabel(key);
      sheet.getCell(`B${row}`).value = value;
      row++;
    }
    
    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  /**
   * Add Excel section
   */
  private addExcelSection(sheet: ExcelJS.Worksheet, section: ReportSection): void {
    let row = 1;
    
    // Section title
    sheet.getCell(`A${row}`).value = section.title;
    sheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row += 2;
    
    // Tables
    if (section.tables) {
      for (const table of section.tables) {
        // Table title
        if (table.title) {
          sheet.getCell(`A${row}`).value = table.title;
          sheet.getCell(`A${row}`).font = { bold: true };
          row++;
        }
        
        // Headers
        table.headers.forEach((header: string, index: number) => {
          const cell = sheet.getCell(row, index + 1);
          cell.value = header;
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
          };
        });
        row++;
        
        // Data rows
        table.rows.forEach((rowData: any[]) => {
          rowData.forEach((value, index) => {
            sheet.getCell(row, index + 1).value = value;
          });
          row++;
        });
        
        row += 2; // Space between tables
      }
    }
    
    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 15;
    });
  }

  /**
   * Convert table to CSV
   */
  private tableToCSV(table: any): string[] {
    const lines: string[] = [];
    
    // Headers
    lines.push(table.headers.map((h: string) => `"${h}"`).join(','));
    
    // Rows
    for (const row of table.rows) {
      lines.push(row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    }
    
    return lines;
  }

  /**
   * Send report email
   */
  private async sendReportEmail(
    recipients: string[],
    report: ReportResult,
    reportType: ReportType,
    period: { start: Date; end: Date }
  ): Promise<void> {
    try {
      const templatePath = path.join(__dirname, '../templates/email/report.hbs');
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);
      
      const html = template({
        reportType: this.getReportTypeName(reportType),
        period: {
          start: format(period.start, 'dd.MM.yyyy', { locale: de }),
          end: format(period.end, 'dd.MM.yyyy', { locale: de })
        },
        reportUrl: report.url,
        expiresAt: format(new Date(report.expiresAt), 'dd.MM.yyyy', { locale: de })
      });

      const mailOptions: nodemailer.SendMailOptions = {
        from: EMAIL_CONFIG.auth.user,
        to: recipients.join(', '),
        subject: `EATECH ${this.getReportTypeName(reportType)} - ${format(period.end, 'dd.MM.yyyy')}`,
        html
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Report email sent to ${recipients.join(', ')}`);
      
    } catch (error) {
      logger.error('Error sending report email:', error);
      throw error;
    }
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(schedule: ReportSchedule): Date {
    const now = new Date();
    
    switch (schedule.frequency) {
      case 'daily':
        return addDays(startOfDay(now), 1);
      case 'weekly':
        return addDays(startOfWeek(now, { locale: de }), 7);
      case 'monthly':
        return startOfMonth(addDays(now, 32));
      default:
        return addDays(now, 1);
    }
  }

  /**
   * Get report period
   */
  private getReportPeriod(frequency: string): { start: Date; end: Date } {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        return {
          start: startOfDay(subDays(now, 1)),
          end: endOfDay(subDays(now, 1))
        };
      case 'weekly':
        return {
          start: startOfWeek(subDays(now, 7), { locale: de }),
          end: endOfWeek(subDays(now, 7), { locale: de })
        };
      case 'monthly':
        return {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1))
        };
      default:
        return {
          start: startOfDay(subDays(now, 1)),
          end: endOfDay(subDays(now, 1))
        };
    }
  }

  /**
   * Generate report title
   */
  private generateReportTitle(type: ReportType, period: { start: Date; end: Date }): string {
    const typeName = this.getReportTypeName(type);
    const periodStr = format(period.start, 'dd.MM.yyyy') === format(period.end, 'dd.MM.yyyy')
      ? format(period.start, 'dd.MM.yyyy', { locale: de })
      : `${format(period.start, 'dd.MM.yyyy', { locale: de })} - ${format(period.end, 'dd.MM.yyyy', { locale: de })}`;
    
    return `${typeName} - ${periodStr}`;
  }

  /**
   * Get report type name
   */
  private getReportTypeName(type: ReportType): string {
    const names: Record<ReportType, string> = {
      daily_summary: 'Tägliche Zusammenfassung',
      sales_report: 'Umsatzbericht',
      inventory_report: 'Bestandsbericht',
      customer_report: 'Kundenbericht',
      financial_report: 'Finanzbericht',
      compliance_report: 'Compliance-Bericht'
    };
    
    return names[type] || type;
  }

  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    handlebars.registerHelper('formatDate', (date: Date) => {
      return format(new Date(date), 'dd.MM.yyyy', { locale: de });
    });
    
    handlebars.registerHelper('formatCurrency', (amount: number) => {
      return new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: 'CHF'
      }).format(amount);
    });
    
    handlebars.registerHelper('formatNumber', (num: number) => {
      return new Intl.NumberFormat('de-CH').format(num);
    });
  }

  /**
   * Get tenant name
   */
  private async getTenantName(tenantId: string): Promise<string> {
    const doc = await this.firestore
      .collection('tenants')
      .doc(tenantId)
      .get();
    
    return doc.exists ? doc.data()!.name : 'Unknown Tenant';
  }

  /**
   * Collect metric
   */
  private async collectMetric(
    tenantId: string,
    metric: string,
    period: { start: Date; end: Date },
    filters?: Record<string, any>
  ): Promise<any> {
    // This would implement actual metric collection
    // For now, return placeholder data
    return Math.floor(Math.random() * 10000);
  }

  /**
   * Collect section data
   */
  private async collectSectionData(
    tenantId: string,
    section: string,
    period: { start: Date; end: Date },
    filters?: Record<string, any>
  ): Promise<any> {
    // This would implement actual data collection
    // For now, return placeholder data
    return {
      total: Math.floor(Math.random() * 10000),
      items: []
    };
  }

  /**
   * Generate summary
   */
  private async generateSummary(data: ReportData): Promise<any> {
    return {
      totalRevenue: data.metrics.total_revenue || 0,
      orderCount: data.metrics.order_count || 0,
      avgOrderValue: data.metrics.avg_order_value || 0
    };
  }

  /**
   * Get section title
   */
  private getSectionTitle(sectionId: string): string {
    const titles: Record<string, string> = {
      revenue: 'Umsatz',
      orders: 'Bestellungen',
      products: 'Produkte',
      customers: 'Kunden',
      overview: 'Übersicht',
      breakdown: 'Aufschlüsselung',
      trends: 'Trends',
      comparison: 'Vergleich'
    };
    
    return titles[sectionId] || sectionId;
  }

  /**
   * Generate section tables
   */
  private generateSectionTables(sectionId: string, data: any): any[] {
    // This would generate actual tables based on section data
    return [];
  }

  /**
   * Generate section summary
   */
  private generateSectionSummary(sectionId: string, data: any): string {
    // This would generate actual summary based on section data
    return '';
  }

  /**
   * Generate section charts
   */
  private async generateSectionCharts(sectionId: string, data: any): Promise<ChartConfig[]> {
    // This would generate actual chart configurations
    return [];
  }

  /**
   * Get metric label
   */
  private getMetricLabel(metric: string): string {
    const labels: Record<string, string> = {
      total_revenue: 'Gesamtumsatz',
      order_count: 'Anzahl Bestellungen',
      avg_order_value: 'Durchschnittlicher Bestellwert',
      new_customers: 'Neue Kunden'
    };
    
    return labels[metric] || metric;
  }

  /**
   * Save report metadata
   */
  private async saveReportMetadata(report: Partial<Report>): Promise<void> {
    await this.firestore
      .collection(REPORTS_COLLECTION)
      .doc(report.id!)
      .set({
        ...report,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }
}