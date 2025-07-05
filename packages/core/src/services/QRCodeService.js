/**
 * EATECH QR Code Service
 * Generates and manages QR codes for tables and ordering
 * File Path: /packages/core/src/services/QRCodeService.js
 */

import QRCode from 'qrcode';
import { getDatabase, ref, set, get, update } from 'firebase/database';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

class QRCodeService {
  constructor() {
    this.db = getDatabase();
    this.storage = getStorage();
    this.baseUrl = process.env.VITE_APP_URL || 'https://app.eatech.ch';
  }

  /**
   * Generate QR code for a table
   */
  async generateTableQR(tenantId, tableData) {
    try {
      // Create unique session ID
      const sessionId = uuidv4();
      const tableId = tableData.id || `table_${Date.now()}`;
      
      // Create QR code data
      const qrData = {
        id: tableId,
        tenantId,
        sessionId,
        tableNumber: tableData.tableNumber,
        tableName: tableData.tableName || `Tisch ${tableData.tableNumber}`,
        capacity: tableData.capacity || 4,
        area: tableData.area || 'main',
        created: Date.now(),
        lastUsed: null,
        active: true
      };

      // Generate QR code URL
      const qrUrl = `${this.baseUrl}/scan?t=${tenantId}&table=${tableId}&s=${sessionId}`;
      
      // Generate QR code image
      const qrOptions = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 512
      };

      const qrImageData = await QRCode.toDataURL(qrUrl, qrOptions);
      
      // Save QR code image to Firebase Storage
      const qrImageRef = storageRef(this.storage, `tenants/${tenantId}/qrcodes/${tableId}.png`);
      await uploadString(qrImageRef, qrImageData, 'data_url');
      const qrImageUrl = await getDownloadURL(qrImageRef);

      // Save QR code data to database
      const qrRef = ref(this.db, `tenants/${tenantId}/tables/${tableId}`);
      await set(qrRef, {
        ...qrData,
        qrUrl,
        qrImageUrl
      });

      // Generate printable version
      const printableQR = await this.generatePrintableQR({
        ...qrData,
        qrUrl,
        qrImageData,
        tenantName: tableData.tenantName
      });

      return {
        tableId,
        sessionId,
        qrUrl,
        qrImageUrl,
        qrImageData,
        printableQR,
        tableData: qrData
      };

    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Generate printable QR code with branding
   */
  async generatePrintableQR(data) {
    const { qrImageData, tableName, tenantName, tableNumber } = data;
    
    // Create SVG template for print
    const printTemplate = `
      <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="800" height="1000" fill="white"/>
        
        <!-- Header -->
        <rect width="800" height="120" fill="#ff6b6b"/>
        <text x="400" y="75" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">
          ${tenantName || 'EATECH'}
        </text>
        
        <!-- QR Code Container -->
        <rect x="100" y="200" width="600" height="600" fill="white" stroke="#f3f4f6" stroke-width="4" rx="20"/>
        
        <!-- QR Code Image (placeholder - will be replaced) -->
        <image x="150" y="250" width="500" height="500" href="${qrImageData}"/>
        
        <!-- Table Info -->
        <text x="400" y="870" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#1f2937" text-anchor="middle">
          ${tableName}
        </text>
        <text x="400" y="920" font-family="Arial, sans-serif" font-size="36" fill="#6b7280" text-anchor="middle">
          Tisch Nummer ${tableNumber}
        </text>
        
        <!-- Instructions -->
        <text x="400" y="980" font-family="Arial, sans-serif" font-size="24" fill="#9ca3af" text-anchor="middle">
          QR-Code scannen und bestellen
        </text>
      </svg>
    `;

    // Convert to base64 for easy printing
    const printableBase64 = btoa(unescape(encodeURIComponent(printTemplate)));
    const printableDataUrl = `data:image/svg+xml;base64,${printableBase64}`;

    return {
      svg: printTemplate,
      dataUrl: printableDataUrl,
      printUrl: `data:text/html,<html><body onload="window.print()"><img src="${printableDataUrl}" style="width:100%;max-width:400px;"/></body></html>`
    };
  }

  /**
   * Validate QR code scan
   */
  async validateQRScan(tenantId, tableId, sessionId) {
    try {
      const tableRef = ref(this.db, `tenants/${tenantId}/tables/${tableId}`);
      const snapshot = await get(tableRef);
      
      if (!snapshot.exists()) {
        throw new Error('Invalid QR code - table not found');
      }

      const tableData = snapshot.val();
      
      // Check if table is active
      if (!tableData.active) {
        throw new Error('This table is currently unavailable');
      }

      // Create new session
      const sessionData = {
        id: sessionId,
        tableId,
        tenantId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        }
      };

      // Save session
      const sessionRef = ref(this.db, `tenants/${tenantId}/sessions/${sessionId}`);
      await set(sessionRef, sessionData);

      // Update table last used
      await update(tableRef, {
        lastUsed: Date.now(),
        currentSession: sessionId
      });

      return {
        valid: true,
        tableData,
        sessionData
      };

    } catch (error) {
      console.error('Error validating QR scan:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Generate bulk QR codes for all tables
   */
  async generateBulkQR(tenantId, tables) {
    const results = [];
    
    for (const table of tables) {
      try {
        const qrResult = await this.generateTableQR(tenantId, table);
        results.push({
          success: true,
          table,
          qrData: qrResult
        });
      } catch (error) {
        results.push({
          success: false,
          table,
          error: error.message
        });
      }
    }

    // Generate combined PDF for printing
    const pdfUrl = await this.generateBulkPDF(results.filter(r => r.success));

    return {
      results,
      pdfUrl,
      summary: {
        total: tables.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  }

  /**
   * Generate PDF with all QR codes
   */
  async generateBulkPDF(qrResults) {
    // This would integrate with a PDF generation service
    // For now, return a placeholder
    return 'https://example.com/bulk-qr-codes.pdf';
  }

  /**
   * Track QR code usage analytics
   */
  async trackQRUsage(tenantId, tableId, event) {
    const analyticsRef = ref(this.db, `tenants/${tenantId}/analytics/qr/${tableId}/${Date.now()}`);
    await set(analyticsRef, {
      event,
      timestamp: Date.now(),
      ...event
    });
  }

  /**
   * Get QR code statistics
   */
  async getQRStats(tenantId, timeRange = 'day') {
    const now = Date.now();
    const ranges = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };

    const startTime = now - (ranges[timeRange] || ranges.day);
    
    // Get all tables
    const tablesRef = ref(this.db, `tenants/${tenantId}/tables`);
    const tablesSnapshot = await get(tablesRef);
    
    if (!tablesSnapshot.exists()) {
      return { tables: [], totalScans: 0 };
    }

    const tables = Object.entries(tablesSnapshot.val()).map(([id, data]) => ({
      id,
      ...data,
      scans: 0 // Will be populated from analytics
    }));

    // Get scan analytics
    const analyticsRef = ref(this.db, `tenants/${tenantId}/analytics/qr`);
    const analyticsSnapshot = await get(analyticsRef);

    if (analyticsSnapshot.exists()) {
      const analytics = analyticsSnapshot.val();
      
      // Count scans per table
      Object.entries(analytics).forEach(([tableId, events]) => {
        const table = tables.find(t => t.id === tableId);
        if (table) {
          table.scans = Object.values(events).filter(
            event => event.timestamp >= startTime
          ).length;
        }
      });
    }

    return {
      tables: tables.sort((a, b) => b.scans - a.scans),
      totalScans: tables.reduce((sum, table) => sum + table.scans, 0),
      timeRange,
      startTime,
      endTime: now
    };
  }

  /**
   * Regenerate QR code (e.g., for security)
   */
  async regenerateQR(tenantId, tableId) {
    const tableRef = ref(this.db, `tenants/${tenantId}/tables/${tableId}`);
    const snapshot = await get(tableRef);
    
    if (!snapshot.exists()) {
      throw new Error('Table not found');
    }

    const tableData = snapshot.val();
    
    // Generate new QR with same table data
    return await this.generateTableQR(tenantId, {
      ...tableData,
      id: tableId
    });
  }
}

export default new QRCodeService();