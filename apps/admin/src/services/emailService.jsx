/**
 * EATECH - Email Service
 * Version: 23.0.0
 * Description: Service für den Versand von E-Mails und Report-Benachrichtigungen
 * File Path: /apps/admin/src/services/emailService.js
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Initialize Firebase Functions
const functions = getFunctions();

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

// Report Email Template
const getReportEmailTemplate = ({ 
  recipientName, 
  reportType, 
  dateRange, 
  downloadLink,
  tenantName 
}) => {
  const reportTypeNames = {
    sales: 'Umsatzbericht',
    orders: 'Bestellübersicht',
    inventory: 'Inventarbericht',
    customers: 'Kundenbericht',
    financial: 'Finanzbericht'
  };

  const reportName = reportTypeNames[reportType] || 'Report';
  const dateRangeText = `${format(dateRange.start, 'dd.MM.yyyy')} - ${format(dateRange.end, 'dd.MM.yyyy')}`;

  return {
    subject: `${reportName} für ${tenantName} - ${dateRangeText}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${reportName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background-color: #3B82F6;
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 30px 20px;
            }
            .button {
              display: inline-block;
              background-color: #3B82F6;
              color: white;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 5px;
              margin-top: 20px;
            }
            .button:hover {
              background-color: #2563EB;
            }
            .info-box {
              background-color: #F3F4F6;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              background-color: #F9FAFB;
              padding: 20px;
              text-align: center;
              font-size: 14px;
              color: #6B7280;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">EATECH</div>
              <h1>${reportName} ist bereit</h1>
            </div>
            
            <div class="content">
              <p>Hallo ${recipientName || 'Team'},</p>
              
              <p>Ihr ${reportName} für <strong>${tenantName}</strong> wurde erfolgreich generiert.</p>
              
              <div class="info-box">
                <strong>Report-Details:</strong><br>
                Typ: ${reportName}<br>
                Zeitraum: ${dateRangeText}<br>
                Erstellt am: ${format(new Date(), 'dd.MM.yyyy HH:mm')} Uhr
              </div>
              
              <p>Sie können den Report über den folgenden Link herunterladen:</p>
              
              <a href="${downloadLink}" class="button">Report herunterladen</a>
              
              <p style="margin-top: 30px; font-size: 14px; color: #6B7280;">
                <strong>Hinweis:</strong> Der Download-Link ist 7 Tage gültig. 
                Nach Ablauf dieser Zeit müssen Sie einen neuen Report generieren.
              </p>
            </div>
            
            <div class="footer">
              <p>Diese E-Mail wurde automatisch von EATECH generiert.</p>
              <p>© ${new Date().getFullYear()} EATECH - Foodtruck Management System</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
${reportName} für ${tenantName}

Hallo ${recipientName || 'Team'},

Ihr ${reportName} für ${tenantName} wurde erfolgreich generiert.

Report-Details:
- Typ: ${reportName}
- Zeitraum: ${dateRangeText}
- Erstellt am: ${format(new Date(), 'dd.MM.yyyy HH:mm')} Uhr

Download-Link: ${downloadLink}

Hinweis: Der Download-Link ist 7 Tage gültig.

Diese E-Mail wurde automatisch von EATECH generiert.
© ${new Date().getFullYear()} EATECH - Foodtruck Management System
    `
  };
};

// Scheduled Report Notification Template
const getScheduledReportNotificationTemplate = ({
  recipientName,
  reportName,
  nextRunDate,
  frequency,
  tenantName
}) => {
  const frequencyText = {
    daily: 'täglich',
    weekly: 'wöchentlich',
    monthly: 'monatlich'
  }[frequency] || frequency;

  return {
    subject: `Report-Plan erstellt: ${reportName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background-color: #10B981; color: white; padding: 20px; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .info { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Report-Plan erfolgreich erstellt</h2>
            </div>
            <div class="content">
              <p>Hallo ${recipientName},</p>
              <p>Sie haben erfolgreich einen automatischen Report-Plan für <strong>${tenantName}</strong> erstellt.</p>
              
              <div class="info">
                <strong>Plan-Details:</strong><br>
                Report: ${reportName}<br>
                Häufigkeit: ${frequencyText}<br>
                Nächste Ausführung: ${format(new Date(nextRunDate), 'dd.MM.yyyy HH:mm', { locale: de })}<br>
              </div>
              
              <p>Sie erhalten automatisch eine E-Mail, sobald der Report generiert wurde.</p>
              
              <p>Mit freundlichen Grüßen<br>
              Ihr EATECH Team</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
};

// Report Error Template
const getReportErrorTemplate = ({
  recipientName,
  reportName,
  errorMessage,
  tenantName
}) => {
  return {
    subject: `Fehler bei Report-Generierung: ${reportName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background-color: #EF4444; color: white; padding: 20px; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .error-box { 
              background-color: #FEE2E2; 
              border: 1px solid #FECACA; 
              padding: 15px; 
              border-radius: 5px; 
              margin: 15px 0; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Fehler bei Report-Generierung</h2>
            </div>
            <div class="content">
              <p>Hallo ${recipientName},</p>
              <p>Bei der Generierung Ihres Reports für <strong>${tenantName}</strong> ist ein Fehler aufgetreten.</p>
              
              <div class="error-box">
                <strong>Fehler-Details:</strong><br>
                Report: ${reportName}<br>
                Fehlermeldung: ${errorMessage}<br>
                Zeit: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}<br>
              </div>
              
              <p>Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support, falls das Problem weiterhin besteht.</p>
              
              <p>Mit freundlichen Grüßen<br>
              Ihr EATECH Team</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
};

// ============================================================================
// EMAIL SERVICE FUNCTIONS
// ============================================================================

/**
 * Send Report Email
 * @param {Object} params - Email parameters
 * @returns {Promise} Result of email send operation
 */
export const sendReportEmail = async ({
  to,
  recipientName,
  reportType,
  dateRange,
  downloadLink,
  tenantName,
  attachmentUrl = null
}) => {
  try {
    const emailTemplate = getReportEmailTemplate({
      recipientName,
      reportType,
      dateRange,
      downloadLink,
      tenantName
    });

    const sendEmail = httpsCallable(functions, 'sendEmail');
    
    const result = await sendEmail({
      to: Array.isArray(to) ? to : [to],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      attachmentUrl,
      metadata: {
        type: 'report',
        reportType,
        tenantId: tenantName
      }
    });

    return result.data;
  } catch (error) {
    console.error('Error sending report email:', error);
    throw error;
  }
};

/**
 * Send Scheduled Report Notification
 * @param {Object} params - Notification parameters
 * @returns {Promise} Result of email send operation
 */
export const sendScheduledReportNotification = async ({
  to,
  recipientName,
  reportName,
  nextRunDate,
  frequency,
  tenantName
}) => {
  try {
    const emailTemplate = getScheduledReportNotificationTemplate({
      recipientName,
      reportName,
      nextRunDate,
      frequency,
      tenantName
    });

    const sendEmail = httpsCallable(functions, 'sendEmail');
    
    const result = await sendEmail({
      to: Array.isArray(to) ? to : [to],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      metadata: {
        type: 'scheduled_report_notification',
        tenantId: tenantName
      }
    });

    return result.data;
  } catch (error) {
    console.error('Error sending scheduled report notification:', error);
    throw error;
  }
};

/**
 * Send Report Error Notification
 * @param {Object} params - Error notification parameters
 * @returns {Promise} Result of email send operation
 */
export const sendReportErrorNotification = async ({
  to,
  recipientName,
  reportName,
  errorMessage,
  tenantName
}) => {
  try {
    const emailTemplate = getReportErrorTemplate({
      recipientName,
      reportName,
      errorMessage,
      tenantName
    });

    const sendEmail = httpsCallable(functions, 'sendEmail');
    
    const result = await sendEmail({
      to: Array.isArray(to) ? to : [to],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      metadata: {
        type: 'report_error',
        tenantId: tenantName
      }
    });

    return result.data;
  } catch (error) {
    console.error('Error sending error notification:', error);
    throw error;
  }
};

/**
 * Send Batch Emails
 * @param {Array} emails - Array of email configurations
 * @returns {Promise} Results of batch send operation
 */
export const sendBatchEmails = async (emails) => {
  try {
    const sendBatchEmails = httpsCallable(functions, 'sendBatchEmails');
    
    const result = await sendBatchEmails({
      emails: emails.map(email => ({
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachmentUrl: email.attachmentUrl,
        metadata: email.metadata
      }))
    });

    return result.data;
  } catch (error) {
    console.error('Error sending batch emails:', error);
    throw error;
  }
};

/**
 * Validate Email Address
 * @param {string} email - Email address to validate
 * @returns {boolean} Whether email is valid
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Format Email List
 * @param {Array|string} emails - Email(s) to format
 * @returns {Array} Formatted email array
 */
export const formatEmailList = (emails) => {
  if (!emails) return [];
  
  if (typeof emails === 'string') {
    return emails.split(',').map(email => email.trim()).filter(validateEmail);
  }
  
  if (Array.isArray(emails)) {
    return emails.map(email => email.trim()).filter(validateEmail);
  }
  
  return [];
};