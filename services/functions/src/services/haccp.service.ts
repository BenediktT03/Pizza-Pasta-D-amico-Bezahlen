import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { 
  HACCPRecord,
  TemperatureReading,
  CleaningTask,
  MaintenanceRecord,
  SensorType,
  ComplianceStatus
} from '@eatech/types';
import { notificationService } from './notification.service';

interface SensorReading {
  sensorId: string;
  type: 'temperature' | 'humidity';
  value: number;
  unit: string;
  location: string;
  batteryLevel?: number;
  timestamp: Date;
}

interface DigitalSignature {
  method: 'pin' | 'fingerprint' | 'signature';
  userId: string;
  hash?: string;
  timestamp: Date;
  credentialId?: string;
}

export class HACCPService {
  private db = admin.firestore();
  
  // Temperature thresholds (Celsius)
  private readonly TEMP_THRESHOLDS = {
    refrigerator: { min: 2, max: 5 },
    freezer: { min: -20, max: -18 },
    hotHolding: { min: 63, max: null },
    dangerZone: { min: 5, max: 63 }
  };

  // Cleaning schedules
  private readonly CLEANING_TASKS = {
    daily: [
      { id: 'morning_temp_check', name: 'Morgen Temperatur-Check', time: '08:00' },
      { id: 'grill_clean', name: 'Grill Reinigung', time: '14:00' },
      { id: 'evening_clean', name: 'Abend-Reinigung', time: '20:00' },
      { id: 'surface_sanitize', name: 'Oberflächen desinfizieren', time: '21:00' }
    ],
    weekly: [
      { id: 'deep_clean', name: 'Grundreinigung', dayOfWeek: 0 }, // Sunday
      { id: 'oil_change', name: 'Öl wechseln', dayOfWeek: 3 }, // Wednesday
      { id: 'equipment_check', name: 'Geräte-Check', dayOfWeek: 5 } // Friday
    ],
    monthly: [
      { id: 'full_inspection', name: 'Komplett-Inspektion', dayOfMonth: 1 },
      { id: 'pest_control', name: 'Schädlingskontrolle', dayOfMonth: 15 }
    ]
  };

  /**
   * Record temperature reading from sensor
   */
  async recordTemperature(truckId: string, reading: SensorReading): Promise<void> {
    try {
      // Create HACCP record
      const record: HACCPRecord = {
        id: this.generateRecordId(),
        truckId,
        type: 'temperature',
        timestamp: reading.timestamp,
        data: {
          sensorId: reading.sensorId,
          location: reading.location,
          value: reading.value,
          unit: reading.unit,
          batteryLevel: reading.batteryLevel
        },
        compliant: this.isTemperatureCompliant(reading.location, reading.value),
        createdAt: new Date()
      };

      // Save to Firestore
      await this.db
        .collection(`foodtrucks/${truckId}/haccp`)
        .doc(record.id)
        .set(record);

      // Check for violations
      if (!record.compliant) {
        await this.handleTemperatureViolation(truckId, reading);
      }

      // Check battery level
      if (reading.batteryLevel && reading.batteryLevel < 20) {
        await this.handleLowBattery(truckId, reading.sensorId, reading.batteryLevel);
      }

      // Update real-time monitoring
      await this.updateRealtimeMonitoring(truckId, reading);
    } catch (error) {
      logger.error('Failed to record temperature', { truckId, reading, error });
      throw error;
    }
  }

  /**
   * Complete cleaning task with digital signature
   */
  async completeCleaningTask(
    truckId: string,
    taskId: string,
    userId: string,
    signature: DigitalSignature
  ): Promise<void> {
    try {
      // Validate signature
      const isValid = await this.validateSignature(signature, userId);
      if (!isValid) {
        throw new Error('Invalid signature');
      }

      // Create HACCP record
      const record: HACCPRecord = {
        id: this.generateRecordId(),
        truckId,
        type: 'cleaning',
        timestamp: new Date(),
        data: {
          taskId,
          taskName: this.getTaskName(taskId),
          completedBy: userId,
          signature: {
            method: signature.method,
            timestamp: signature.timestamp,
            hash: signature.method === 'pin' ? signature.hash : undefined,
            credentialId: signature.method === 'fingerprint' ? signature.credentialId : undefined
          }
        },
        compliant: true,
        createdAt: new Date()
      };

      // Save record
      await this.db
        .collection(`foodtrucks/${truckId}/haccp`)
        .doc(record.id)
        .set(record);

      // Update task completion status
      await this.updateTaskStatus(truckId, taskId, 'completed');

      // Schedule next occurrence if recurring
      await this.scheduleNextTask(truckId, taskId);
    } catch (error) {
      logger.error('Failed to complete cleaning task', { truckId, taskId, error });
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    truckId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      // Fetch all HACCP records for period
      const records = await this.getHACCPRecords(truckId, startDate, endDate);

      // Analyze compliance
      const analysis = {
        totalRecords: records.length,
        compliantRecords: records.filter(r => r.compliant).length,
        violations: records.filter(r => !r.compliant),
        temperatureReadings: records.filter(r => r.type === 'temperature'),
        cleaningTasks: records.filter(r => r.type === 'cleaning'),
        maintenanceRecords: records.filter(r => r.type === 'maintenance')
      };

      // Calculate compliance rate
      const complianceRate = analysis.totalRecords > 0
        ? (analysis.compliantRecords / analysis.totalRecords) * 100
        : 100;

      // Generate report
      const report = {
        truckId,
        period: {
          start: startDate,
          end: endDate
        },
        complianceRate: Math.round(complianceRate * 10) / 10,
        summary: {
          totalRecords: analysis.totalRecords,
          compliantRecords: analysis.compliantRecords,
          violations: analysis.violations.length
        },
        temperatureSummary: this.summarizeTemperatures(analysis.temperatureReadings),
        cleaningSummary: this.summarizeCleaningTasks(analysis.cleaningTasks),
        violations: analysis.violations.map(v => ({
          date: v.timestamp,
          type: v.type,
          description: this.getViolationDescription(v),
          correctionAction: v.correctionAction
        })),
        generatedAt: new Date(),
        signature: await this.generateReportSignature(report)
      };

      // Save report
      await this.saveComplianceReport(truckId, report);

      return report;
    } catch (error) {
      logger.error('Failed to generate compliance report', { truckId, error });
      throw error;
    }
  }

  /**
   * Monitor temperature continuously
   */
  async monitorTemperatures(truckId: string): Promise<void> {
    const sensors = await this.getTruckSensors(truckId);

    for (const sensor of sensors) {
      try {
        // Get reading from sensor adapter
        const reading = await this.getSensorReading(sensor);
        
        // Record the reading
        await this.recordTemperature(truckId, reading);
      } catch (error) {
        logger.error('Failed to read sensor', { truckId, sensor, error });
        
        // Notify about sensor failure
        await notificationService.send({
          type: 'sensor_failure',
          recipient: truckId,
          channel: 'push',
          title: '⚠️ Sensor-Fehler',
          body: `Sensor ${sensor.name} antwortet nicht`,
          priority: 'high',
          truckId
        });
      }
    }
  }

  /**
   * Check if temperature is compliant
   */
  private isTemperatureCompliant(location: string, value: number): boolean {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('kühl') || locationLower.includes('refrigerator')) {
      return value >= this.TEMP_THRESHOLDS.refrigerator.min && 
             value <= this.TEMP_THRESHOLDS.refrigerator.max;
    } else if (locationLower.includes('gefrier') || locationLower.includes('freezer')) {
      return value >= this.TEMP_THRESHOLDS.freezer.min && 
             value <= this.TEMP_THRESHOLDS.freezer.max;
    } else if (locationLower.includes('warm') || locationLower.includes('hot')) {
      return value >= this.TEMP_THRESHOLDS.hotHolding.min;
    }
    
    // Default: should not be in danger zone
    return value < this.TEMP_THRESHOLDS.dangerZone.min || 
           value > this.TEMP_THRESHOLDS.dangerZone.max;
  }

  /**
   * Handle temperature violation
   */
  private async handleTemperatureViolation(
    truckId: string, 
    reading: SensorReading
  ): Promise<void> {
    const violation = {
      id: this.generateViolationId(),
      truckId,
      type: 'temperature',
      severity: this.calculateViolationSeverity(reading),
      reading,
      timestamp: new Date(),
      escalationStarted: true
    };

    // Save violation
    await this.db.collection('haccp_violations').doc(violation.id).set(violation);

    // Start escalation process
    await notificationService.handleTemperatureAlert(
      truckId,
      reading,
      reading.location
    );

    // Log corrective action required
    await this.logCorrectiveAction(truckId, violation.id, 'Temperature adjustment required');
  }

  /**
   * Calculate violation severity
   */
  private calculateViolationSeverity(reading: SensorReading): 'low' | 'medium' | 'high' | 'critical' {
    const location = reading.location.toLowerCase();
    const value = reading.value;

    if (location.includes('kühl') || location.includes('refrigerator')) {
      if (value > 8) return 'critical';
      if (value > 7) return 'high';
      if (value > 5) return 'medium';
      return 'low';
    } else if (location.includes('gefrier') || location.includes('freezer')) {
      if (value > -10) return 'critical';
      if (value > -15) return 'high';
      if (value > -18) return 'medium';
      return 'low';
    }

    return 'medium';
  }

  /**
   * Validate digital signature
   */
  private async validateSignature(
    signature: DigitalSignature, 
    userId: string
  ): Promise<boolean> {
    if (signature.method === 'pin') {
      // Validate PIN hash
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (!userData?.pinHash) {
        throw new Error('User has no PIN configured');
      }

      // Compare hashes (would use bcrypt in production)
      return signature.hash === userData.pinHash;
    } else if (signature.method === 'fingerprint') {
      // Validate WebAuthn credential
      // This would integrate with WebAuthn API
      return true; // Placeholder
    }

    return false;
  }

  /**
   * Get sensor reading based on sensor type
   */
  private async getSensorReading(sensor: any): Promise<SensorReading> {
    // This would integrate with actual sensor APIs
    // For now, return mock data
    const mockReading: SensorReading = {
      sensorId: sensor.id,
      type: 'temperature',
      value: this.getMockTemperature(sensor.location),
      unit: 'celsius',
      location: sensor.location,
      batteryLevel: Math.floor(Math.random() * 100),
      timestamp: new Date()
    };

    return mockReading;
  }

  /**
   * Generate mock temperature based on location
   */
  private getMockTemperature(location: string): number {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('kühl')) {
      return 3 + Math.random() * 2; // 3-5°C
    } else if (locationLower.includes('gefrier')) {
      return -20 + Math.random() * 2; // -20 to -18°C
    } else if (locationLower.includes('warm')) {
      return 65 + Math.random() * 5; // 65-70°C
    }
    
    return 20 + Math.random() * 5; // Room temperature
  }

  /**
   * Update real-time monitoring dashboard
   */
  private async updateRealtimeMonitoring(
    truckId: string, 
    reading: SensorReading
  ): Promise<void> {
    const monitoringRef = this.db
      .collection('realtime_monitoring')
      .doc(truckId);

    await monitoringRef.set({
      [`sensors.${reading.sensorId}`]: {
        lastReading: reading.value,
        unit: reading.unit,
        location: reading.location,
        compliant: this.isTemperatureCompliant(reading.location, reading.value),
        batteryLevel: reading.batteryLevel,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });
  }

  /**
   * Export compliance data
   */
  async exportComplianceData(
    truckId: string,
    format: 'pdf' | 'excel' | 'csv',
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const report = await this.generateComplianceReport(truckId, startDate, endDate);

    let exportUrl: string;
    
    switch (format) {
      case 'pdf':
        exportUrl = await this.generatePDFReport(report);
        break;
      case 'excel':
        exportUrl = await this.generateExcelReport(report);
        break;
      case 'csv':
        exportUrl = await this.generateCSVReport(report);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    // Log export
    await this.logExport(truckId, format, startDate, endDate);

    return exportUrl;
  }

  /**
   * Generate PDF report (placeholder - would use actual PDF library)
   */
  private async generatePDFReport(report: any): Promise<string> {
    // This would use a library like pdfkit or puppeteer
    // For now, return placeholder URL
    return `https://storage.googleapis.com/eatech-reports/${report.truckId}/compliance-${Date.now()}.pdf`;
  }

  /**
   * Generate Excel report (placeholder - would use actual Excel library)
   */
  private async generateExcelReport(report: any): Promise<string> {
    // This would use a library like exceljs
    return `https://storage.googleapis.com/eatech-reports/${report.truckId}/compliance-${Date.now()}.xlsx`;
  }

  /**
   * Generate CSV report
   */
  private async generateCSVReport(report: any): Promise<string> {
    const csv = this.convertReportToCSV(report);
    
    // Save to Cloud Storage
    const fileName = `compliance-${report.truckId}-${Date.now()}.csv`;
    const file = admin.storage().bucket().file(`reports/${fileName}`);
    
    await file.save(csv, {
      metadata: {
        contentType: 'text/csv'
      }
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return url;
  }

  /**
   * Helper methods
   */
  private generateRecordId(): string {
    return `haccp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTaskName(taskId: string): string {
    // Find task name from all schedules
    const allTasks = [
      ...this.CLEANING_TASKS.daily,
      ...this.CLEANING_TASKS.weekly,
      ...this.CLEANING_TASKS.monthly
    ];
    
    const task = allTasks.find(t => t.id === taskId);
    return task?.name || taskId;
  }

  private async getHACCPRecords(
    truckId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HACCPRecord[]> {
    const snapshot = await this.db
      .collection(`foodtrucks/${truckId}/haccp`)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .orderBy('timestamp', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as HACCPRecord);
  }

  private summarizeTemperatures(readings: any[]): any {
    const byLocation: Record<string, any> = {};

    readings.forEach(reading => {
      const location = reading.data.location;
      if (!byLocation[location]) {
        byLocation[location] = {
          count: 0,
          compliant: 0,
          violations: 0,
          avgTemp: 0,
          minTemp: Infinity,
          maxTemp: -Infinity
        };
      }

      const summary = byLocation[location];
      summary.count++;
      if (reading.compliant) summary.compliant++;
      else summary.violations++;
      
      const temp = reading.data.value;
      summary.avgTemp += temp;
      summary.minTemp = Math.min(summary.minTemp, temp);
      summary.maxTemp = Math.max(summary.maxTemp, temp);
    });

    // Calculate averages
    Object.values(byLocation).forEach((summary: any) => {
      summary.avgTemp = Math.round(summary.avgTemp / summary.count * 10) / 10;
      summary.complianceRate = Math.round(summary.compliant / summary.count * 100);
    });

    return byLocation;
  }

  private summarizeCleaningTasks(tasks: any[]): any {
    const summary = {
      totalTasks: tasks.length,
      completedOnTime: tasks.filter(t => t.data.completedOnTime).length,
      completedLate: tasks.filter(t => !t.data.completedOnTime).length,
      byType: {
        daily: tasks.filter(t => this.isDaily(t.data.taskId)).length,
        weekly: tasks.filter(t => this.isWeekly(t.data.taskId)).length,
        monthly: tasks.filter(t => this.isMonthly(t.data.taskId)).length
      }
    };

    summary.complianceRate = Math.round(summary.completedOnTime / summary.totalTasks * 100);

    return summary;
  }

  private isDaily(taskId: string): boolean {
    return this.CLEANING_TASKS.daily.some(t => t.id === taskId);
  }

  private isWeekly(taskId: string): boolean {
    return this.CLEANING_TASKS.weekly.some(t => t.id === taskId);
  }

  private isMonthly(taskId: string): boolean {
    return this.CLEANING_TASKS.monthly.some(t => t.id === taskId);
  }

  private getViolationDescription(violation: any): string {
    if (violation.type === 'temperature') {
      const data = violation.data;
      return `Temperature ${data.value}°C at ${data.location} (${data.compliant ? 'Compliant' : 'Non-compliant'})`;
    }
    return 'Unknown violation';
  }

  private async generateReportSignature(report: any): Promise<string> {
    // Generate cryptographic signature for report integrity
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(report));
    return hash.digest('hex');
  }

  private async saveComplianceReport(truckId: string, report: any): Promise<void> {
    await this.db
      .collection(`foodtrucks/${truckId}/compliance_reports`)
      .doc(report.signature)
      .set(report);
  }

  private async handleLowBattery(
    truckId: string,
    sensorId: string,
    batteryLevel: number
  ): Promise<void> {
    await notificationService.send({
      type: 'low_battery',
      recipient: truckId,
      channel: 'push',
      title: '🔋 Batterie schwach',
      body: `Sensor ${sensorId}: ${batteryLevel}% Batterie`,
      data: {
        sensorId,
        batteryLevel
      },
      priority: 'medium',
      truckId
    });
  }

  private async updateTaskStatus(
    truckId: string,
    taskId: string,
    status: string
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await this.db
      .collection(`foodtrucks/${truckId}/task_status`)
      .doc(today)
      .set({
        [taskId]: {
          status,
          completedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      }, { merge: true });
  }

  private async scheduleNextTask(truckId: string, taskId: string): Promise<void> {
    // Schedule next occurrence based on task type
    if (this.isDaily(taskId)) {
      // Schedule for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await this.scheduleTaskReminder(truckId, taskId, tomorrow);
    } else if (this.isWeekly(taskId)) {
      // Schedule for next week
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      await this.scheduleTaskReminder(truckId, taskId, nextWeek);
    } else if (this.isMonthly(taskId)) {
      // Schedule for next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      await this.scheduleTaskReminder(truckId, taskId, nextMonth);
    }
  }

  private async scheduleTaskReminder(
    truckId: string,
    taskId: string,
    scheduledDate: Date
  ): Promise<void> {
    await this.db.collection('scheduled_tasks').add({
      truckId,
      taskId,
      scheduledFor: scheduledDate,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private async getTruckSensors(truckId: string): Promise<any[]> {
    const snapshot = await this.db
      .collection(`foodtrucks/${truckId}/sensors`)
      .where('active', '==', true)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private async logCorrectiveAction(
    truckId: string,
    violationId: string,
    action: string
  ): Promise<void> {
    await this.db.collection('corrective_actions').add({
      truckId,
      violationId,
      action,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private async logExport(
    truckId: string,
    format: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    await this.db.collection('export_logs').add({
      truckId,
      type: 'compliance_report',
      format,
      period: {
        start: startDate,
        end: endDate
      },
      exportedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private convertReportToCSV(report: any): string {
    // Convert report object to CSV format
    const headers = ['Date', 'Type', 'Location', 'Value', 'Compliant', 'Notes'];
    const rows = [];

    // Add temperature data
    if (report.temperatureSummary) {
      Object.entries(report.temperatureSummary).forEach(([location, data]: any) => {
        rows.push([
          new Date().toISOString(),
          'Temperature Summary',
          location,
          `Avg: ${data.avgTemp}°C`,
          `${data.complianceRate}%`,
          `Min: ${data.minTemp}°C, Max: ${data.maxTemp}°C`
        ]);
      });
    }

    // Add violations
    report.violations.forEach((violation: any) => {
      rows.push([
        violation.date,
        violation.type,
        violation.description,
        '',
        'No',
        violation.correctionAction || ''
      ]);
    });

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}

// Export singleton instance
export const hacppService = new HACCPService();
