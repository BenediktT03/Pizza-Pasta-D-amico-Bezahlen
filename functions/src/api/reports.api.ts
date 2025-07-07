/**
 * EATECH - Reports API Endpoints
 * Version: 1.0.0
 * Description: REST API endpoints for report generation and management
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/api/reports.api.ts
 */

import * as express from 'express';
import { 
  authenticate, 
  requireRole, 
  requirePermission,
  requireTenantAccess 
} from '../middleware/auth.middleware';
import { 
  validate, 
  validateDateRange,
  CommonSchemas 
} from '../middleware/validation.middleware';
import { 
  authenticatedApiLimiter,
  reportGenerationLimiter 
} from '../middleware/rateLimiting.middleware';
import { 
  asyncHandler, 
  NotFoundError, 
  BusinessError 
} from '../utils/errorHandler';
import { ReportingService } from '../services/ReportingService';
import { AnalyticsService } from '../services/AnalyticsService';
import { EmailService } from '../services/EmailService';
import { getCollection } from '../config/firebase.config';
import * as Joi from 'joi';
import { ROLES, PERMISSIONS } from '../config/constants';
import * as admin from 'firebase-admin';

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = express.Router();

// Initialize services
const reportingService = new ReportingService();
const analyticsService = new AnalyticsService();
const emailService = new EmailService();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ReportSchemas = {
  // Report configuration
  reportConfig: Joi.object({
    type: Joi.string().valid(
      'sales', 'inventory', 'customer', 'financial', 
      'performance', 'tax', 'employee', 'custom'
    ).required(),
    
    format: Joi.string().valid('pdf', 'excel', 'csv', 'json', 'html').default('pdf'),
    
    dateRange: Joi.object({
      type: Joi.string().valid(
        'custom', 'today', 'yesterday', 'thisWeek', 'lastWeek',
        'thisMonth', 'lastMonth', 'thisQuarter', 'lastQuarter',
        'thisYear', 'lastYear', 'last7Days', 'last30Days', 'last90Days'
      ).required(),
      start: Joi.when('type', {
        is: 'custom',
        then: Joi.date().iso().required()
      }),
      end: Joi.when('type', {
        is: 'custom',
        then: Joi.date().iso().min(Joi.ref('start')).required()
      })
    }).required(),
    
    filters: Joi.object({
      locations: Joi.array().items(CommonSchemas.id).optional(),
      categories: Joi.array().items(Joi.string()).optional(),
      products: Joi.array().items(CommonSchemas.id).optional(),
      customers: Joi.array().items(CommonSchemas.id).optional(),
      employees: Joi.array().items(CommonSchemas.id).optional(),
      paymentMethods: Joi.array().items(Joi.string()).optional(),
      orderTypes: Joi.array().items(Joi.string()).optional(),
      statuses: Joi.array().items(Joi.string()).optional()
    }).optional(),
    
    groupBy: Joi.array().items(
      Joi.string().valid(
        'day', 'week', 'month', 'quarter', 'year',
        'location', 'category', 'product', 'customer',
        'employee', 'paymentMethod', 'orderType'
      )
    ).optional(),
    
    metrics: Joi.array().items(
      Joi.string().valid(
        'revenue', 'profit', 'orders', 'items', 'customers',
        'averageOrderValue', 'conversionRate', 'returnRate',
        'inventory', 'wastage', 'laborCost', 'foodCost'
      )
    ).min(1).required(),
    
    comparison: Joi.object({
      enabled: Joi.boolean().default(false),
      type: Joi.string().valid('period', 'target', 'benchmark').optional(),
      value: Joi.any().optional()
    }).optional(),
    
    options: Joi.object({
      includeCharts: Joi.boolean().default(true),
      includeTables: Joi.boolean().default(true),
      includeRawData: Joi.boolean().default(false),
      language: Joi.string().valid('de', 'fr', 'it', 'en').default('de'),
      timezone: Joi.string().default('Europe/Zurich'),
      currency: Joi.string().default('CHF'),
      branding: Joi.object({
        logo: Joi.string().uri().optional(),
        primaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
        companyName: Joi.string().optional()
      }).optional()
    }).optional()
  }),
  
  // Report schedule
  reportSchedule: Joi.object({
    enabled: Joi.boolean().required(),
    frequency: Joi.string().valid(
      'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
    ).required(),
    
    time: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).required(),
    
    dayOfWeek: Joi.when('frequency', {
      is: Joi.valid('weekly', 'biweekly'),
      then: Joi.number().integer().min(0).max(6).required()
    }),
    
    dayOfMonth: Joi.when('frequency', {
      is: 'monthly',
      then: Joi.number().integer().min(1).max(31).required()
    }),
    
    recipients: Joi.array().items(
      Joi.object({
        email: CommonSchemas.email,
        name: Joi.string().optional(),
        role: Joi.string().optional()
      })
    ).min(1).required(),
    
    reportConfig: Joi.object().required(), // References reportConfig schema
    
    startDate: Joi.date().iso().default(() => new Date()),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    
    metadata: Joi.object().optional()
  }),
  
  // Report template
  reportTemplate: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    type: Joi.string().required(),
    config: Joi.object().required(),
    tags: Joi.array().items(Joi.string()).optional(),
    isPublic: Joi.boolean().default(false)
  })
};

// ============================================================================
// ROUTES - REPORT GENERATION
// ============================================================================

/**
 * POST /reports/generate
 * Generate a new report
 */
router.post('/generate',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_CREATE),
  reportGenerationLimiter,
  validate(ReportSchemas.reportConfig),
  asyncHandler(async (req, res) => {
    const { tenantId, uid: userId } = req.user!;
    const reportConfig = req.body;
    
    // Create report job
    const report = await reportingService.createReportJob({
      tenantId,
      userId,
      config: reportConfig,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(202).json({
      success: true,
      data: {
        reportId: report.id,
        status: 'pending',
        estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      },
      message: 'Report generation started'
    });
  })
);

/**
 * GET /reports
 * List generated reports
 */
router.get('/',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status, 
      startDate, 
      endDate 
    } = req.query;
    
    const query = getCollection('reports')
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc');
    
    // Apply filters
    if (type) {
      query.where('type', '==', type);
    }
    if (status) {
      query.where('status', '==', status);
    }
    if (startDate && endDate) {
      query.where('createdAt', '>=', new Date(startDate as string))
           .where('createdAt', '<=', new Date(endDate as string));
    }
    
    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    query.limit(Number(limit)).offset(offset);
    
    const snapshot = await query.get();
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get total count
    const countSnapshot = await getCollection('reports')
      .where('tenantId', '==', tenantId)
      .count()
      .get();
    const total = countSnapshot.data().count;
    
    res.json({
      success: true,
      data: reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  })
);

/**
 * GET /reports/:reportId
 * Get report details
 */
router.get('/:reportId',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { reportId } = req.params;
    
    const reportDoc = await getCollection('reports').doc(reportId).get();
    
    if (!reportDoc.exists) {
      throw new NotFoundError('Report', reportId);
    }
    
    const report = reportDoc.data()!;
    
    // Verify tenant access
    if (report.tenantId !== tenantId) {
      throw new NotFoundError('Report', reportId);
    }
    
    res.json({
      success: true,
      data: {
        id: reportDoc.id,
        ...report
      }
    });
  })
);

/**
 * GET /reports/:reportId/download
 * Download report file
 */
router.get('/:reportId/download',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_EXPORT),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { reportId } = req.params;
    
    const { url, filename, contentType } = await reportingService.getReportDownloadUrl(
      reportId,
      tenantId
    );
    
    res.json({
      success: true,
      data: {
        url,
        filename,
        contentType,
        expiresIn: 3600 // 1 hour
      }
    });
  })
);

/**
 * DELETE /reports/:reportId
 * Delete a report
 */
router.delete('/:reportId',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_CREATE),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { reportId } = req.params;
    
    await reportingService.deleteReport(reportId, tenantId);
    
    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  })
);

/**
 * POST /reports/:reportId/share
 * Share report via email
 */
router.post('/:reportId/share',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId, uid: userId } = req.user!;
    const { reportId } = req.params;
    const { recipients, message } = req.body;
    
    // Get report
    const reportDoc = await getCollection('reports').doc(reportId).get();
    if (!reportDoc.exists || reportDoc.data()!.tenantId !== tenantId) {
      throw new NotFoundError('Report', reportId);
    }
    
    const report = reportDoc.data()!;
    
    // Get download URL
    const { url, filename } = await reportingService.getReportDownloadUrl(
      reportId,
      tenantId
    );
    
    // Send emails
    await Promise.all(recipients.map(async (recipient: any) => {
      await emailService.sendReportEmail({
        to: recipient.email,
        reportType: report.type,
        reportName: report.name || `${report.type} Report`,
        downloadUrl: url,
        message,
        senderName: req.user!.email || 'EATECH User',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    }));
    
    res.json({
      success: true,
      message: `Report shared with ${recipients.length} recipient(s)`
    });
  })
);

// ============================================================================
// ROUTES - REPORT SCHEDULES
// ============================================================================

/**
 * GET /reports/schedules
 * List report schedules
 */
router.get('/schedules',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    
    const schedulesSnapshot = await getCollection('reportSchedules')
      .where('tenantId', '==', tenantId)
      .where('enabled', '==', true)
      .get();
    
    const schedules = schedulesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: schedules
    });
  })
);

/**
 * POST /reports/schedules
 * Create report schedule
 */
router.post('/schedules',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_CREATE),
  authenticatedApiLimiter,
  validate(ReportSchemas.reportSchedule),
  asyncHandler(async (req, res) => {
    const { tenantId, uid: userId } = req.user!;
    const scheduleData = req.body;
    
    const schedule = await reportingService.createReportSchedule({
      ...scheduleData,
      tenantId,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      nextRunAt: reportingService.calculateNextRunTime(scheduleData)
    });
    
    res.status(201).json({
      success: true,
      data: schedule
    });
  })
);

/**
 * PUT /reports/schedules/:scheduleId
 * Update report schedule
 */
router.put('/schedules/:scheduleId',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_CREATE),
  authenticatedApiLimiter,
  validate(ReportSchemas.reportSchedule),
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { scheduleId } = req.params;
    const updates = req.body;
    
    const schedule = await reportingService.updateReportSchedule(
      scheduleId,
      tenantId,
      updates
    );
    
    res.json({
      success: true,
      data: schedule
    });
  })
);

/**
 * DELETE /reports/schedules/:scheduleId
 * Delete report schedule
 */
router.delete('/schedules/:scheduleId',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_CREATE),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { scheduleId } = req.params;
    
    await reportingService.deleteReportSchedule(scheduleId, tenantId);
    
    res.json({
      success: true,
      message: 'Report schedule deleted successfully'
    });
  })
);

// ============================================================================
// ROUTES - REPORT TEMPLATES
// ============================================================================

/**
 * GET /reports/templates
 * List report templates
 */
router.get('/templates',
  authenticate(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { type, isPublic } = req.query;
    
    let query = getCollection('reportTemplates');
    
    // Show public templates and tenant-specific templates
    if (isPublic === 'true') {
      query = query.where('isPublic', '==', true);
    } else {
      query = query.where('tenantId', 'in', [tenantId, 'system']);
    }
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    const snapshot = await query.get();
    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: templates
    });
  })
);

/**
 * POST /reports/templates
 * Create report template
 */
router.post('/templates',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_CREATE),
  authenticatedApiLimiter,
  validate(ReportSchemas.reportTemplate),
  asyncHandler(async (req, res) => {
    const { tenantId, uid: userId } = req.user!;
    const templateData = req.body;
    
    const template = await getCollection('reportTemplates').add({
      ...templateData,
      tenantId,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: template.id,
        ...templateData
      }
    });
  })
);

/**
 * PUT /reports/templates/:templateId
 * Update report template
 */
router.put('/templates/:templateId',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_CREATE),
  authenticatedApiLimiter,
  validate(ReportSchemas.reportTemplate),
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { templateId } = req.params;
    const updates = req.body;
    
    const templateRef = getCollection('reportTemplates').doc(templateId);
    const templateDoc = await templateRef.get();
    
    if (!templateDoc.exists) {
      throw new NotFoundError('Template', templateId);
    }
    
    // Verify ownership
    if (templateDoc.data()!.tenantId !== tenantId) {
      throw new BusinessError('Cannot update template from another tenant');
    }
    
    await templateRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      data: {
        id: templateId,
        ...updates
      }
    });
  })
);

/**
 * DELETE /reports/templates/:templateId
 * Delete report template
 */
router.delete('/templates/:templateId',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_CREATE),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { templateId } = req.params;
    
    const templateRef = getCollection('reportTemplates').doc(templateId);
    const templateDoc = await templateRef.get();
    
    if (!templateDoc.exists) {
      throw new NotFoundError('Template', templateId);
    }
    
    // Verify ownership
    if (templateDoc.data()!.tenantId !== tenantId) {
      throw new BusinessError('Cannot delete template from another tenant');
    }
    
    await templateRef.delete();
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  })
);

// ============================================================================
// ROUTES - QUICK REPORTS
// ============================================================================

/**
 * GET /reports/quick/daily-summary
 * Get daily summary report
 */
router.get('/quick/daily-summary',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { date = new Date().toISOString() } = req.query;
    
    const summary = await analyticsService.getDailySummary(
      tenantId,
      new Date(date as string)
    );
    
    res.json({
      success: true,
      data: summary
    });
  })
);

/**
 * GET /reports/quick/top-products
 * Get top products report
 */
router.get('/quick/top-products',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_VIEW),
  authenticatedApiLimiter,
  validateDateRange,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { start, end, limit = 10 } = req.query;
    
    const products = await analyticsService.getTopProducts(
      tenantId,
      {
        start: new Date(start as string),
        end: new Date(end as string)
      },
      Number(limit)
    );
    
    res.json({
      success: true,
      data: products
    });
  })
);

/**
 * GET /reports/quick/customer-insights
 * Get customer insights report
 */
router.get('/quick/customer-insights',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_VIEW),
  authenticatedApiLimiter,
  validateDateRange,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { start, end, segment } = req.query;
    
    const insights = await analyticsService.getCustomerInsights(
      tenantId,
      {
        start: new Date(start as string),
        end: new Date(end as string)
      },
      segment as string
    );
    
    res.json({
      success: true,
      data: insights
    });
  })
);

// ============================================================================
// ROUTES - COMPLIANCE REPORTS
// ============================================================================

/**
 * GET /reports/compliance/tax
 * Generate tax compliance report
 */
router.get('/compliance/tax',
  authenticate(),
  requireRole(ROLES.TENANT_ADMIN, ROLES.TENANT_OWNER),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { year, quarter, format = 'pdf' } = req.query;
    
    const report = await reportingService.generateTaxReport(
      tenantId,
      {
        year: Number(year),
        quarter: quarter ? Number(quarter) : undefined,
        format: format as string
      }
    );
    
    res.json({
      success: true,
      data: report
    });
  })
);

/**
 * GET /reports/compliance/audit
 * Generate audit trail report
 */
router.get('/compliance/audit',
  authenticate(),
  requireRole(ROLES.TENANT_ADMIN, ROLES.TENANT_OWNER),
  authenticatedApiLimiter,
  validateDateRange,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { start, end, userId, action } = req.query;
    
    const report = await reportingService.generateAuditReport(
      tenantId,
      {
        dateRange: {
          start: new Date(start as string),
          end: new Date(end as string)
        },
        filters: {
          userId: userId as string,
          action: action as string
        }
      }
    );
    
    res.json({
      success: true,
      data: report
    });
  })
);

// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;