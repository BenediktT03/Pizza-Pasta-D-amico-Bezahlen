/**
 * EATECH - File Download Utility
 * Version: 23.0.0
 * Description: Utility-Funktionen für Browser-basierte Datei-Downloads
 * File Path: /apps/admin/src/utils/fileDownload.js
 */

/**
 * Download a file in the browser
 * @param {Blob|File} file - The file to download
 * @param {string} filename - The name for the downloaded file
 */
export const downloadFile = (file, filename) => {
  // Create a temporary URL for the file
  const url = window.URL.createObjectURL(file);
  
  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Download JSON data as a file
 * @param {Object} data - The data to download
 * @param {string} filename - The name for the downloaded file
 */
export const downloadJSON = (data, filename = 'data.json') => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadFile(blob, filename);
};

/**
 * Download CSV data as a file
 * @param {string} csvContent - The CSV content
 * @param {string} filename - The name for the downloaded file
 */
export const downloadCSV = (csvContent, filename = 'data.csv') => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, filename);
};

/**
 * Convert array of objects to CSV and download
 * @param {Array} data - Array of objects to convert
 * @param {string} filename - The name for the downloaded file
 * @param {Array} columns - Optional array of column names to include
 */
export const downloadArrayAsCSV = (data, filename = 'export.csv', columns = null) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }
  
  // Get headers from first object or use provided columns
  const headers = columns || Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Headers
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape values containing commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');
  
  downloadCSV(csvContent, filename);
};

/**
 * Download text content as a file
 * @param {string} content - The text content
 * @param {string} filename - The name for the downloaded file
 * @param {string} mimeType - The MIME type of the file
 */
export const downloadText = (content, filename = 'file.txt', mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  downloadFile(blob, filename);
};

/**
 * Download HTML content as a file
 * @param {string} htmlContent - The HTML content
 * @param {string} filename - The name for the downloaded file
 */
export const downloadHTML = (htmlContent, filename = 'document.html') => {
  downloadText(htmlContent, filename, 'text/html');
};

/**
 * Trigger download from a URL
 * @param {string} url - The URL to download from
 * @param {string} filename - The name for the downloaded file
 */
export const downloadFromURL = async (url, filename) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    downloadFile(blob, filename);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Check if browser supports download
 * @returns {boolean} Whether the browser supports download
 */
export const isDownloadSupported = () => {
  return 'download' in document.createElement('a');
};

/**
 * Format bytes to human readable string
 * @param {number} bytes - The number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} The file extension
 */
export const getFileExtension = (filename) => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Validate file type
 * @param {File} file - The file to validate
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @returns {boolean} Whether the file type is valid
 */
export const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.type);
};

/**
 * Validate file size
 * @param {File} file - The file to validate
 * @param {number} maxSizeInMB - Maximum size in megabytes
 * @returns {boolean} Whether the file size is valid
 */
export const validateFileSize = (file, maxSizeInMB) => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};