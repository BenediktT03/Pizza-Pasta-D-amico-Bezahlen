/**
 * EATECH - Analytics API Endpoints
 * Version: 1.0.0
 * Description: REST API endpoints for analytics and reporting
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/api/analytics.api.ts
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
  publicApiLimiter, 
  authenticatedApiLimiter 
} from '../middleware/rateLimiting.middleware';
import { asyncHandler } from '../utils/errorHandler';
import { AnalyticsService } from '../services/AnalyticsService';
import { ReportingService } from '../services/ReportingService';
import { AIPredictionService } from '../services/AIPredictionService';
import * as Joi from 'joi';
import { ROLES, PERMISSIONS } from '../config/constants';

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = express.Router();

// Initialize services
const analyticsService = new AnalyticsService();
const reportingService = new ReportingService();
const aiPredictionService = new AIPredictionService();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AnalyticsSchemas = {
  // Query parameters for analytics
  analyticsQuery: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    granularity: Joi.string().valid('hour', 'day', 'week', 'month').default('day'),
    metrics: Joi.array().items(Joi.string()).min(1).required(),
    dimensions: Joi.array().items(Joi.string()).optional(),
    filters: Joi.object().optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0)
  }),
  
  // Real-time analytics parameters
  realtimeQuery: Joi.object({
    metrics: Joi.array().items(
      Joi.string().valid(
        'activeUsers', 'activeOrders', 'revenue', 
        'averageOrderValue', 'conversionRate'
      )
    ).min(1).required(),
    interval: Joi.number().integer().min(5).max(60).default(30) // seconds
  }),
  
  // Report generation request
  reportRequest: Joi.object({
    type: Joi.string().valid(
      'sales', 'inventory', 'customer', 'financial', 
      'performance', 'forecast', 'custom'
    ).required(),
    format: Joi.string().valid('pdf', 'excel', 'csv', 'json').default('pdf'),
    dateRange: CommonSchemas.dateRange.required(),
    filters: Joi.object().optional(),
    sections: Joi.array().items(Joi.string()).optional(),
    schedule: Joi.object({
      frequency: Joi.string().valid('once', 'daily', 'weekly', 'monthly'),
      time: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      dayOfWeek: Joi.number().integer().min(0).max(6),
      dayOfMonth: Joi.number().integer().min(1).max(31),
      recipients: Joi.array().items(CommonSchemas.email).min(1)
    }).optional()
  }),
  
  // Dashboard configuration
  dashboardConfig: Joi.object({
    widgets: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        type: Joi.string().required(),
        position: Joi.object({
          x: Joi.number().integer().min(0).required(),
          y: Joi.number().integer().min(0).required(),
          w: Joi.number().integer().min(1).max(12).required(),
          h: Joi.number().integer().min(1).max(12).required()
        }).required(),
        config: Joi.object().required()
      })
    ).min(1).required(),
    layout: Joi.string().valid('grid', 'list', 'custom').default('grid'),
    refreshInterval: Joi.number().integer().min(0).default(300) // seconds
  })
};

// ============================================================================
// ROUTES - ANALYTICS DATA
// ============================================================================

/**
 * GET /analytics/overview
 * Get analytics overview for tenant
 */
router.get('/overview',
  authenticate(),
  requireTenantAccess(),
  authenticatedApiLimiter,
  validateDateRange,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { start, end } = req.query as any;
    
    const overview = await analyticsService.getOverview(
      tenantId,
      new Date(start),
      new Date(end)
    );
    
    res.json({
      success: true,
      data: overview
    });
  })
);

/**
 * GET /analytics/metrics
 * Get specific metrics with dimensions
 */
router.get('/metrics',
  authenticate(),
  requireTenantAccess(),
  authenticatedApiLimiter,
  validate(AnalyticsSchemas.analyticsQuery, { source: 'query' }),
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const query = req.query as any;
    
    const metrics = await analyticsService.getMetrics(tenantId, {
      dateRange: {
        start: new Date(query.startDate),
        end: new Date(query.endDate)
      },
      granularity: query.granularity,
      metrics: query.metrics,
      dimensions: query.dimensions,
      filters: query.filters,
      pagination: {
        limit: query.limit,
        offset: query.offset
      }
    });
    
    res.json({
      success: true,
      data: metrics.data,
      pagination: metrics.pagination
    });
  })
);

/**
 * GET /analytics/realtime
 * Get real-time analytics data
 */
router.get('/realtime',
  authenticate(),
  requireTenantAccess(),
  authenticatedApiLimiter,
  validate(AnalyticsSchemas.realtimeQuery, { source: 'query' }),
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { metrics, interval } = req.query as any;
    
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Send real-time data
    const sendData = async () => {
      const data = await analyticsService.getRealtimeMetrics(tenantId, metrics);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // Initial data
    await sendData();
    
    // Set up interval
    const intervalId = setInterval(sendData, interval * 1000);
    
    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(intervalId);
      res.end();
    });
  })
);

/**
 * GET /analytics/trends
 * Get trend analysis
 */
router.get('/trends',
  authenticate(),
  requireTenantAccess(),
  authenticatedApiLimiter,
  validateDateRange,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { start, end } = req.query as any;
    
    const trends = await analyticsService.getTrends(
      tenantId,
      new Date(start),
      new Date(end)
    );
    
    res.json({
      success: true,
      data: trends
    });
  })
);

/**
 * GET /analytics/funnel
 * Get conversion funnel analysis
 */
router.get('/funnel',
  authenticate(),
  requireTenantAccess(),
  authenticatedApiLimiter,
  validateDateRange,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { start, end, steps } = req.query as any;
    
    const funnel = await analyticsService.getConversionFunnel(
      tenantId,
      new Date(start),
      new Date(end),
      steps ? steps.split(',') : undefined
    );
    
    res.json({
      success: true,
      data: funnel
    });
  })
);

/**
 * GET /analytics/cohorts
 * Get cohort analysis
 */
router.get('/cohorts',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { cohortType, dateRange, metric } = req.query as any;
    
    const cohorts = await analyticsService.getCohortAnalysis(
      tenantId,
      cohortType || 'monthly',
      {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      },
      metric || 'retention'
    );
    
    res.json({
      success: true,
      data: cohorts
    });
  })
);

// ============================================================================
// ROUTES - REPORTS
// ============================================================================

/**
 * POST /analytics/reports
 * Generate a new report
 */
router.post('/reports',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_CREATE),
  authenticatedApiLimiter,
  validate(AnalyticsSchemas.reportRequest),
  asyncHandler(async (req, res) => {
    const { tenantId, uid: userId } = req.user!;
    const reportRequest = req.body;
    
    const report = await reportingService.generateReport({
      ...reportRequest,
      tenantId,
      requestedBy: userId
    });
    
    res.status(201).json({
      success: true,
      data: {
        reportId: report.id,
        status: report.status,
        estimatedCompletionTime: report.estimatedCompletionTime
      }
    });
  })
);

/**
 * GET /analytics/reports
 * List generated reports
 */
router.get('/reports',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { page = 1, limit = 20, status, type } = req.query;
    
    const reports = await reportingService.listReports(tenantId, {
      page: Number(page),
      limit: Number(limit),
      filters: {
        status: status as string,
        type: type as string
      }
    });
    
    res.json({
      success: true,
      data: reports.data,
      pagination: reports.pagination
    });
  })
);

/**
 * GET /analytics/reports/:reportId
 * Get report details
 */
router.get('/reports/:reportId',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_VIEW),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { reportId } = req.params;
    
    const report = await reportingService.getReport(reportId, tenantId);
    
    res.json({
      success: true,
      data: report
    });
  })
);

/**
 * GET /analytics/reports/:reportId/download
 * Download report file
 */
router.get('/reports/:reportId/download',
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
 * DELETE /analytics/reports/:reportId
 * Delete a report
 */
router.delete('/reports/:reportId',
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

// ============================================================================
// ROUTES - PREDICTIONS
// ============================================================================

/**
 * GET /analytics/predictions/demand
 * Get demand predictions
 */
router.get('/predictions/demand',
  authenticate(),
  requireTenantAccess(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { date, days = 7, products } = req.query;
    
    const predictions = await aiPredictionService.predictDemand(
      tenantId,
      date ? new Date(date as string) : new Date(),
      Number(days),
      products ? (products as string).split(',') : undefined
    );
    
    res.json({
      success: true,
      data: predictions
    });
  })
);

/**
 * GET /analytics/predictions/revenue
 * Get revenue predictions
 */
router.get('/predictions/revenue',
  authenticate(),
  requireTenantAccess(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { period = 'month', periods = 3 } = req.query;
    
    const predictions = await aiPredictionService.predictRevenue(
      tenantId,
      period as string,
      Number(periods)
    );
    
    res.json({
      success: true,
      data: predictions
    });
  })
);

/**
 * GET /analytics/predictions/churn
 * Get customer churn predictions
 */
router.get('/predictions/churn',
  authenticate(),
  requireRole(ROLES.TENANT_ADMIN, ROLES.TENANT_OWNER),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { threshold = 0.7 } = req.query;
    
    const predictions = await aiPredictionService.predictCustomerChurn(
      tenantId,
      Number(threshold)
    );
    
    res.json({
      success: true,
      data: predictions
    });
  })
);

// ============================================================================
// ROUTES - DASHBOARDS
// ============================================================================

/**
 * GET /analytics/dashboards
 * Get user's dashboard configurations
 */
router.get('/dashboards',
  authenticate(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { uid: userId, tenantId } = req.user!;
    
    const dashboards = await analyticsService.getUserDashboards(userId, tenantId);
    
    res.json({
      success: true,
      data: dashboards
    });
  })
);

/**
 * POST /analytics/dashboards
 * Create new dashboard configuration
 */
router.post('/dashboards',
  authenticate(),
  authenticatedApiLimiter,
  validate(AnalyticsSchemas.dashboardConfig),
  asyncHandler(async (req, res) => {
    const { uid: userId, tenantId } = req.user!;
    const config = req.body;
    
    const dashboard = await analyticsService.createDashboard({
      ...config,
      userId,
      tenantId
    });
    
    res.status(201).json({
      success: true,
      data: dashboard
    });
  })
);

/**
 * PUT /analytics/dashboards/:dashboardId
 * Update dashboard configuration
 */
router.put('/dashboards/:dashboardId',
  authenticate(),
  authenticatedApiLimiter,
  validate(AnalyticsSchemas.dashboardConfig),
  asyncHandler(async (req, res) => {
    const { uid: userId } = req.user!;
    const { dashboardId } = req.params;
    const config = req.body;
    
    const dashboard = await analyticsService.updateDashboard(
      dashboardId,
      userId,
      config
    );
    
    res.json({
      success: true,
      data: dashboard
    });
  })
);

/**
 * DELETE /analytics/dashboards/:dashboardId
 * Delete dashboard configuration
 */
router.delete('/dashboards/:dashboardId',
  authenticate(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { uid: userId } = req.user!;
    const { dashboardId } = req.params;
    
    await analyticsService.deleteDashboard(dashboardId, userId);
    
    res.json({
      success: true,
      message: 'Dashboard deleted successfully'
    });
  })
);

// ============================================================================
// ROUTES - EXPORTS
// ============================================================================

/**
 * POST /analytics/export
 * Export analytics data
 */
router.post('/export',
  authenticate(),
  requirePermission(PERMISSIONS.REPORT_EXPORT),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { 
      type, 
      format = 'csv', 
      dateRange, 
      filters 
    } = req.body;
    
    const exportJob = await analyticsService.exportData({
      tenantId,
      type,
      format,
      dateRange,
      filters
    });
    
    res.status(201).json({
      success: true,
      data: {
        jobId: exportJob.id,
        status: exportJob.status,
        estimatedCompletionTime: exportJob.estimatedCompletionTime
      }
    });
  })
);

/**
 * GET /analytics/export/:jobId
 * Get export job status
 */
router.get('/export/:jobId',
  authenticate(),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { jobId } = req.params;
    
    const job = await analyticsService.getExportJobStatus(jobId, tenantId);
    
    res.json({
      success: true,
      data: job
    });
  })
);

// ============================================================================
// ROUTES - BENCHMARKS
// ============================================================================

/**
 * GET /analytics/benchmarks
 * Get industry benchmarks
 */
router.get('/benchmarks',
  authenticate(),
  requireRole(ROLES.TENANT_ADMIN, ROLES.TENANT_OWNER),
  authenticatedApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId } = req.user!;
    const { category, metrics } = req.query;
    
    const benchmarks = await analyticsService.getIndustryBenchmarks(
      tenantId,
      category as string,
      metrics ? (metrics as string).split(',') : undefined
    );
    
    res.json({
      success: true,
      data: benchmarks
    });
  })
);

// ============================================================================
// ROUTES - CUSTOM EVENTS
// ============================================================================

/**
 * POST /analytics/events
 * Track custom analytics event
 */
router.post('/events',
  authenticate({ required: false }), // Allow anonymous events
  publicApiLimiter,
  asyncHandler(async (req, res) => {
    const { tenantId, eventType, eventData } = req.body;
    const userId = req.user?.uid;
    
    await analyticsService.trackEvent({
      tenantId,
      userId,
      eventType,
      eventData,
      timestamp: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: 'Event tracked successfully'
    });
  })
);

// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;