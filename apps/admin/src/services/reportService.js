/**
 * EATECH - Report Service
 * Version: 23.0.0
 * Description: Service für die Generierung von PDF und Excel Reports
 * File Path: /apps/admin/src/services/reportService.js
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatCurrency, formatPercent } from '../utils/formatters';

// ============================================================================
// PDF REPORT GENERATOR
// ============================================================================
export const generatePDFReport = async (reportData) => {
  const doc = new jsPDF();
  
  // Set document properties
  doc.setProperties({
    title: `${reportData.type} Report - ${format(new Date(), 'yyyy-MM-dd')}`,
    subject: 'EATECH Report',
    author: 'EATECH System',
    keywords: 'report, eatech, foodtruck',
    creator: 'EATECH Report Generator'
  });
  
  // Add fonts for better typography
  doc.setFont('helvetica');
  
  // Generate report based on type
  switch (reportData.type) {
    case 'sales':
      generateSalesPDF(doc, reportData);
      break;
    case 'orders':
      generateOrdersPDF(doc, reportData);
      break;
    case 'inventory':
      generateInventoryPDF(doc, reportData);
      break;
    case 'customers':
      generateCustomersPDF(doc, reportData);
      break;
    case 'financial':
      generateFinancialPDF(doc, reportData);
      break;
    default:
      generateGenericPDF(doc, reportData);
  }
  
  // Return as blob
  return doc.output('blob');
};

// Sales Report PDF
const generateSalesPDF = (doc, data) => {
  const { summary, salesByDate, topProducts } = data;
  let yPosition = 20;
  
  // Header
  addHeader(doc, 'Umsatzbericht', summary.dateRange);
  yPosition = 60;
  
  // Summary Box
  doc.setFillColor(245, 247, 250);
  doc.rect(15, yPosition, 180, 40, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Zusammenfassung', 20, yPosition + 10);
  
  doc.setFontSize(12);
  doc.setTextColor(0);
  const summaryData = [
    ['Gesamtumsatz:', formatCurrency(summary.totalRevenue)],
    ['Anzahl Bestellungen:', summary.totalOrders.toString()],
    ['Durchschnittlicher Bestellwert:', formatCurrency(summary.averageOrderValue)],
    ['Verkaufte Artikel:', summary.itemsSold.toString()]
  ];
  
  let summaryY = yPosition + 20;
  summaryData.forEach(([label, value]) => {
    doc.text(label, 20, summaryY);
    doc.text(value, 120, summaryY, { align: 'right' });
    summaryY += 7;
  });
  
  yPosition += 50;
  
  // Top Products Table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Top 10 Produkte', 15, yPosition);
  yPosition += 10;
  
  const productHeaders = ['Produkt', 'Menge', 'Umsatz'];
  const productRows = topProducts.map(product => [
    product.name,
    product.quantity.toString(),
    formatCurrency(product.revenue)
  ]);
  
  doc.autoTable({
    head: [productHeaders],
    body: productRows,
    startY: yPosition,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 15, right: 15 }
  });
  
  yPosition = doc.lastAutoTable.finalY + 20;
  
  // Daily Sales Chart (simplified table representation)
  if (yPosition < 200) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFontSize(14);
  doc.text('Tägliche Umsätze', 15, yPosition);
  yPosition += 10;
  
  const dailyHeaders = ['Datum', 'Umsatz', 'Bestellungen', 'Artikel'];
  const dailyRows = Object.entries(salesByDate).map(([date, data]) => [
    format(new Date(date), 'dd.MM.yyyy', { locale: de }),
    formatCurrency(data.revenue),
    data.orders.toString(),
    data.items.toString()
  ]);
  
  doc.autoTable({
    head: [dailyHeaders],
    body: dailyRows,
    startY: yPosition,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] }
  });
  
  // Footer
  addFooter(doc);
};

// Orders Report PDF
const generateOrdersPDF = (doc, data) => {
  const { summary, orders } = data;
  let yPosition = 20;
  
  // Header
  addHeader(doc, 'Bestellübersicht', summary.dateRange);
  yPosition = 60;
  
  // Summary Statistics
  doc.setFillColor(245, 247, 250);
  doc.rect(15, yPosition, 180, 60, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Statistiken', 20, yPosition + 10);
  
  // Status Distribution
  doc.setFontSize(11);
  doc.setTextColor(0);
  let statusY = yPosition + 20;
  doc.text('Status-Verteilung:', 20, statusY);
  statusY += 8;
  
  Object.entries(summary.ordersByStatus).forEach(([status, count]) => {
    doc.setFontSize(10);
    doc.text(`${translateStatus(status)}:`, 25, statusY);
    doc.text(count.toString(), 80, statusY, { align: 'right' });
    statusY += 6;
  });
  
  // Payment Methods
  doc.text('Zahlungsmethoden:', 110, yPosition + 20);
  let paymentY = yPosition + 28;
  Object.entries(summary.paymentMethods).forEach(([method, count]) => {
    doc.setFontSize(10);
    doc.text(`${translatePaymentMethod(method)}:`, 115, paymentY);
    doc.text(count.toString(), 170, paymentY, { align: 'right' });
    paymentY += 6;
  });
  
  yPosition += 70;
  
  // Average Preparation Time
  doc.setFontSize(12);
  doc.text(`Durchschnittliche Zubereitungszeit: ${summary.averagePreparationTime} Minuten`, 15, yPosition);
  yPosition += 15;
  
  // Orders Table
  doc.setFontSize(14);
  doc.text('Bestelldetails', 15, yPosition);
  yPosition += 10;
  
  const orderHeaders = ['Bestellung #', 'Zeit', 'Kunde', 'Betrag', 'Status'];
  const orderRows = orders.slice(0, 30).map(order => [
    order.orderNumber || order.id.slice(-6),
    format(new Date(order.createdAt), 'dd.MM HH:mm'),
    order.customer?.name || 'Gast',
    formatCurrency(order.total),
    translateStatus(order.status)
  ]);
  
  doc.autoTable({
    head: [orderHeaders],
    body: orderRows,
    startY: yPosition,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 }
  });
  
  // Footer
  addFooter(doc);
};

// Inventory Report PDF
const generateInventoryPDF = (doc, data) => {
  const { summary, inventory, lowStockItems } = data;
  let yPosition = 20;
  
  // Header
  addHeader(doc, 'Inventarbericht', summary.dateRange);
  yPosition = 60;
  
  // Summary
  doc.setFillColor(255, 237, 213);
  doc.rect(15, yPosition, 180, 35, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Lagerübersicht', 20, yPosition + 10);
  
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Gesamtartikel: ${summary.totalItems}`, 20, yPosition + 20);
  doc.text(`Artikel mit niedrigem Bestand: ${summary.lowStockItems}`, 20, yPosition + 28);
  doc.text(`Gesamtwert: ${formatCurrency(summary.totalValue)}`, 110, yPosition + 20);
  
  yPosition += 45;
  
  // Low Stock Alert
  if (lowStockItems.length > 0) {
    doc.setFillColor(254, 226, 226);
    doc.rect(15, yPosition, 180, 8, 'F');
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text('⚠ Warnung: Folgende Artikel haben niedrigen Lagerbestand!', 20, yPosition + 5);
    yPosition += 15;
    
    const lowStockHeaders = ['Artikel', 'Aktueller Bestand', 'Min. Bestand', 'Einheit'];
    const lowStockRows = lowStockItems.map(item => [
      item.name,
      item.currentStock.toString(),
      item.minStock.toString(),
      item.unit
    ]);
    
    doc.autoTable({
      head: [lowStockHeaders],
      body: lowStockRows,
      startY: yPosition,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 9 }
    });
    
    yPosition = doc.lastAutoTable.finalY + 20;
  }
  
  // Full Inventory List
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Vollständige Inventarliste', 15, yPosition);
  yPosition += 10;
  
  const inventoryHeaders = ['Artikel', 'Kategorie', 'Bestand', 'Einheit', 'Wert'];
  const inventoryRows = inventory.map(item => [
    item.name,
    item.category,
    item.currentStock.toString(),
    item.unit,
    formatCurrency(item.currentStock * item.unitCost)
  ]);
  
  doc.autoTable({
    head: [inventoryHeaders],
    body: inventoryRows,
    startY: yPosition,
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] },
    styles: { fontSize: 9 }
  });
  
  // Footer
  addFooter(doc);
};

// Customers Report PDF
const generateCustomersPDF = (doc, data) => {
  const { summary, topCustomers, segments } = data;
  let yPosition = 20;
  
  // Header
  addHeader(doc, 'Kundenbericht', summary.dateRange);
  yPosition = 60;
  
  // Summary
  doc.setFillColor(245, 247, 250);
  doc.rect(15, yPosition, 180, 40, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Kundenstatistiken', 20, yPosition + 10);
  
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Gesamtkunden: ${summary.totalCustomers}`, 20, yPosition + 20);
  doc.text(`Neue Kunden: ${summary.newCustomers}`, 20, yPosition + 30);
  
  // Segment Distribution
  doc.text('Kundensegmente:', 110, yPosition + 20);
  let segmentY = yPosition + 28;
  doc.setFontSize(10);
  Object.entries(summary.segments).forEach(([segment, count]) => {
    doc.text(`${translateSegment(segment)}: ${count}`, 115, segmentY);
    segmentY += 6;
  });
  
  yPosition += 50;
  
  // Top Customers
  doc.setFontSize(14);
  doc.text('Top 10 Kunden nach Umsatz', 15, yPosition);
  yPosition += 10;
  
  const customerHeaders = ['Kunde', 'E-Mail', 'Umsatz'];
  const customerRows = topCustomers.map(customer => [
    customer.name,
    customer.email || '-',
    formatCurrency(customer.revenue)
  ]);
  
  doc.autoTable({
    head: [customerHeaders],
    body: customerRows,
    startY: yPosition,
    theme: 'grid',
    headStyles: { fillColor: [236, 72, 153] },
    styles: { fontSize: 10 }
  });
  
  // Footer
  addFooter(doc);
};

// Financial Report PDF
const generateFinancialPDF = (doc, data) => {
  const { summary, revenueByPayment, dailyRevenue } = data;
  let yPosition = 20;
  
  // Header
  addHeader(doc, 'Finanzbericht', summary.dateRange);
  yPosition = 60;
  
  // Financial Summary
  doc.setFillColor(254, 243, 199);
  doc.rect(15, yPosition, 180, 70, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Finanzübersicht', 20, yPosition + 10);
  
  doc.setFontSize(11);
  doc.setTextColor(0);
  const financialData = [
    ['Umsatz (netto):', formatCurrency(summary.revenue)],
    ['Steuern:', formatCurrency(summary.tax)],
    ['Trinkgelder:', formatCurrency(summary.tips)],
    ['Liefergebühren:', formatCurrency(summary.deliveryFees)],
    ['Rabatte:', `-${formatCurrency(summary.discounts)}`],
    ['', ''],
    ['Gesamtumsatz:', formatCurrency(summary.totalRevenue)],
    ['Transaktionsgebühren:', `-${formatCurrency(summary.processingFees)}`],
    ['', ''],
    ['Nettoumsatz:', formatCurrency(summary.netRevenue)]
  ];
  
  let finY = yPosition + 20;
  financialData.forEach(([label, value]) => {
    if (label === '') {
      doc.setLineWidth(0.5);
      doc.line(20, finY - 2, 180, finY - 2);
    } else {
      doc.setFont('helvetica', label.includes('Gesamt') || label.includes('Netto') ? 'bold' : 'normal');
      doc.text(label, 20, finY);
      doc.text(value, 175, finY, { align: 'right' });
    }
    finY += 6;
  });
  
  yPosition += 80;
  
  // Revenue by Payment Method
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Umsatz nach Zahlungsmethode', 15, yPosition);
  yPosition += 10;
  
  const paymentHeaders = ['Zahlungsmethode', 'Betrag', 'Anteil'];
  const paymentRows = Object.entries(revenueByPayment).map(([method, amount]) => [
    translatePaymentMethod(method),
    formatCurrency(amount),
    formatPercent(amount / summary.totalRevenue)
  ]);
  
  doc.autoTable({
    head: [paymentHeaders],
    body: paymentRows,
    startY: yPosition,
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] }
  });
  
  // Footer
  addFooter(doc);
};

// Generic Report PDF
const generateGenericPDF = (doc, data) => {
  let yPosition = 20;
  
  // Header
  addHeader(doc, 'Report', data.dateRange);
  yPosition = 60;
  
  // Content
  doc.setFontSize(12);
  doc.text('Report-Daten:', 15, yPosition);
  yPosition += 10;
  
  // Convert data to table format
  const dataRows = Object.entries(data).map(([key, value]) => [
    key,
    typeof value === 'object' ? JSON.stringify(value) : value.toString()
  ]);
  
  doc.autoTable({
    head: [['Feld', 'Wert']],
    body: dataRows,
    startY: yPosition,
    theme: 'grid',
    styles: { fontSize: 9 }
  });
  
  // Footer
  addFooter(doc);
};

// ============================================================================
// EXCEL REPORT GENERATOR
// ============================================================================
export const generateExcelReport = async (reportData) => {
  const wb = XLSX.utils.book_new();
  
  // Set workbook properties
  wb.Props = {
    Title: `${reportData.type} Report`,
    Subject: 'EATECH Report',
    Author: 'EATECH System',
    CreatedDate: new Date()
  };
  
  // Generate sheets based on report type
  switch (reportData.type) {
    case 'sales':
      generateSalesExcel(wb, reportData);
      break;
    case 'orders':
      generateOrdersExcel(wb, reportData);
      break;
    case 'inventory':
      generateInventoryExcel(wb, reportData);
      break;
    case 'customers':
      generateCustomersExcel(wb, reportData);
      break;
    case 'financial':
      generateFinancialExcel(wb, reportData);
      break;
    default:
      generateGenericExcel(wb, reportData);
  }
  
  // Generate buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Return as blob
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

// Sales Report Excel
const generateSalesExcel = (wb, data) => {
  const { summary, salesByDate, topProducts, orders } = data;
  
  // Summary Sheet
  const summaryData = [
    ['UMSATZBERICHT', ''],
    ['', ''],
    ['Zeitraum:', `${format(summary.dateRange.start, 'dd.MM.yyyy')} - ${format(summary.dateRange.end, 'dd.MM.yyyy')}`],
    ['', ''],
    ['ZUSAMMENFASSUNG', ''],
    ['Gesamtumsatz:', summary.totalRevenue],
    ['Anzahl Bestellungen:', summary.totalOrders],
    ['Durchschnittlicher Bestellwert:', summary.averageOrderValue],
    ['Verkaufte Artikel:', summary.itemsSold]
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ width: 30 }, { width: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Zusammenfassung');
  
  // Top Products Sheet
  const productsData = [
    ['TOP PRODUKTE', '', ''],
    ['Produkt', 'Menge', 'Umsatz'],
    ...topProducts.map(p => [p.name, p.quantity, p.revenue])
  ];
  
  const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
  productsSheet['!cols'] = [{ width: 40 }, { width: 15 }, { width: 20 }];
  XLSX.utils.book_append_sheet(wb, productsSheet, 'Top Produkte');
  
  // Daily Sales Sheet
  const dailyData = [
    ['TÄGLICHE UMSÄTZE', '', '', ''],
    ['Datum', 'Umsatz', 'Bestellungen', 'Artikel'],
    ...Object.entries(salesByDate).map(([date, data]) => [
      date,
      data.revenue,
      data.orders,
      data.items
    ])
  ];
  
  const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
  XLSX.utils.book_append_sheet(wb, dailySheet, 'Tägliche Umsätze');
  
  // Orders Detail Sheet (if included)
  if (orders && orders.length > 0) {
    const ordersData = [
      ['BESTELLDETAILS', '', '', '', ''],
      ['Bestellnummer', 'Datum', 'Kunde', 'Betrag', 'Status'],
      ...orders.map(order => [
        order.orderNumber || order.id,
        format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm'),
        order.customer?.name || 'Gast',
        order.total,
        order.status
      ])
    ];
    
    const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, ordersSheet, 'Bestellungen');
  }
};

// Orders Report Excel
const generateOrdersExcel = (wb, data) => {
  const { summary, orders } = data;
  
  // Summary Sheet
  const summaryData = [
    ['BESTELLÜBERSICHT', ''],
    ['', ''],
    ['Zeitraum:', `${format(summary.dateRange.start, 'dd.MM.yyyy')} - ${format(summary.dateRange.end, 'dd.MM.yyyy')}`],
    ['', ''],
    ['STATISTIKEN', ''],
    ['Gesamtbestellungen:', summary.totalOrders],
    ['Durchschn. Zubereitungszeit:', `${summary.averagePreparationTime} Minuten`],
    ['', ''],
    ['STATUS-VERTEILUNG', ''],
    ...Object.entries(summary.ordersByStatus).map(([status, count]) => [
      translateStatus(status),
      count
    ]),
    ['', ''],
    ['ZAHLUNGSMETHODEN', ''],
    ...Object.entries(summary.paymentMethods).map(([method, count]) => [
      translatePaymentMethod(method),
      count
    ])
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ width: 30 }, { width: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Zusammenfassung');
  
  // Orders Detail Sheet
  const ordersData = [
    ['BESTELLDETAILS', '', '', '', '', '', ''],
    ['Bestellnummer', 'Datum', 'Zeit', 'Kunde', 'Betrag', 'Status', 'Zahlungsmethode'],
    ...orders.map(order => [
      order.orderNumber || order.id,
      format(new Date(order.createdAt), 'dd.MM.yyyy'),
      format(new Date(order.createdAt), 'HH:mm'),
      order.customer?.name || 'Gast',
      order.total,
      translateStatus(order.status),
      translatePaymentMethod(order.paymentMethod)
    ])
  ];
  
  const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData);
  XLSX.utils.book_append_sheet(wb, ordersSheet, 'Bestellungen');
};

// Inventory Report Excel
const generateInventoryExcel = (wb, data) => {
  const { summary, inventory, lowStockItems, movements } = data;
  
  // Summary Sheet
  const summaryData = [
    ['INVENTARBERICHT', ''],
    ['', ''],
    ['Zeitraum:', `${format(summary.dateRange.start, 'dd.MM.yyyy')} - ${format(summary.dateRange.end, 'dd.MM.yyyy')}`],
    ['', ''],
    ['ÜBERSICHT', ''],
    ['Gesamtartikel:', summary.totalItems],
    ['Artikel mit niedrigem Bestand:', summary.lowStockItems],
    ['Gesamtwert:', summary.totalValue],
    ['', ''],
    ['BEWEGUNGEN', ''],
    ...Object.entries(summary.movementsByType || {}).map(([type, count]) => [
      type,
      count
    ])
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ width: 30 }, { width: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Zusammenfassung');
  
  // Low Stock Items Sheet
  if (lowStockItems.length > 0) {
    const lowStockData = [
      ['ARTIKEL MIT NIEDRIGEM BESTAND', '', '', '', ''],
      ['Artikel', 'Kategorie', 'Aktueller Bestand', 'Min. Bestand', 'Einheit'],
      ...lowStockItems.map(item => [
        item.name,
        item.category,
        item.currentStock,
        item.minStock,
        item.unit
      ])
    ];
    
    const lowStockSheet = XLSX.utils.aoa_to_sheet(lowStockData);
    lowStockSheet['!cols'] = [{ width: 30 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 15 }];
    XLSX.utils.book_append_sheet(wb, lowStockSheet, 'Niedriger Bestand');
  }
  
  // Full Inventory Sheet
  const inventoryData = [
    ['VOLLSTÄNDIGE INVENTARLISTE', '', '', '', '', ''],
    ['Artikel', 'Kategorie', 'Bestand', 'Min. Bestand', 'Einheit', 'Stückkosten', 'Gesamtwert'],
    ...inventory.map(item => [
      item.name,
      item.category,
      item.currentStock,
      item.minStock,
      item.unit,
      item.unitCost,
      item.currentStock * item.unitCost
    ])
  ];
  
  const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryData);
  XLSX.utils.book_append_sheet(wb, inventorySheet, 'Inventar');
};

// Customers Report Excel
const generateCustomersExcel = (wb, data) => {
  const { summary, topCustomers, newCustomers } = data;
  
  // Summary Sheet
  const summaryData = [
    ['KUNDENBERICHT', ''],
    ['', ''],
    ['Zeitraum:', `${format(summary.dateRange.start, 'dd.MM.yyyy')} - ${format(summary.dateRange.end, 'dd.MM.yyyy')}`],
    ['', ''],
    ['STATISTIKEN', ''],
    ['Gesamtkunden:', summary.totalCustomers],
    ['Neue Kunden:', summary.newCustomers],
    ['', ''],
    ['KUNDENSEGMENTE', ''],
    ...Object.entries(summary.segments).map(([segment, count]) => [
      translateSegment(segment),
      count
    ])
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ width: 30 }, { width: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Zusammenfassung');
  
  // Top Customers Sheet
  const topCustomersData = [
    ['TOP KUNDEN NACH UMSATZ', '', ''],
    ['Kunde', 'E-Mail', 'Umsatz'],
    ...topCustomers.map(customer => [
      customer.name,
      customer.email || '-',
      customer.revenue
    ])
  ];
  
  const topCustomersSheet = XLSX.utils.aoa_to_sheet(topCustomersData);
  topCustomersSheet['!cols'] = [{ width: 30 }, { width: 30 }, { width: 20 }];
  XLSX.utils.book_append_sheet(wb, topCustomersSheet, 'Top Kunden');
  
  // New Customers Sheet
  if (newCustomers && newCustomers.length > 0) {
    const newCustomersData = [
      ['NEUE KUNDEN', '', '', ''],
      ['Name', 'E-Mail', 'Telefon', 'Registriert am'],
      ...newCustomers.map(customer => [
        customer.name,
        customer.email || '-',
        customer.phone || '-',
        format(new Date(customer.createdAt), 'dd.MM.yyyy HH:mm')
      ])
    ];
    
    const newCustomersSheet = XLSX.utils.aoa_to_sheet(newCustomersData);
    XLSX.utils.book_append_sheet(wb, newCustomersSheet, 'Neue Kunden');
  }
};

// Financial Report Excel
const generateFinancialExcel = (wb, data) => {
  const { summary, revenueByPayment, dailyRevenue } = data;
  
  // Summary Sheet
  const summaryData = [
    ['FINANZBERICHT', ''],
    ['', ''],
    ['Zeitraum:', `${format(summary.dateRange.start, 'dd.MM.yyyy')} - ${format(summary.dateRange.end, 'dd.MM.yyyy')}`],
    ['', ''],
    ['FINANZÜBERSICHT', ''],
    ['Umsatz (netto):', summary.revenue],
    ['Steuern:', summary.tax],
    ['Trinkgelder:', summary.tips],
    ['Liefergebühren:', summary.deliveryFees],
    ['Rabatte:', -summary.discounts],
    ['', ''],
    ['Gesamtumsatz:', summary.totalRevenue],
    ['Transaktionsgebühren:', -summary.processingFees],
    ['', ''],
    ['Nettoumsatz:', summary.netRevenue],
    ['', ''],
    ['KENNZAHLEN', ''],
    ['Anzahl Bestellungen:', summary.orderCount],
    ['Durchschn. Bestellwert:', summary.averageOrderValue]
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ width: 30 }, { width: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Zusammenfassung');
  
  // Revenue by Payment Method Sheet
  const paymentData = [
    ['UMSATZ NACH ZAHLUNGSMETHODE', '', ''],
    ['Zahlungsmethode', 'Betrag', 'Anteil %'],
    ...Object.entries(revenueByPayment).map(([method, amount]) => [
      translatePaymentMethod(method),
      amount,
      (amount / summary.totalRevenue * 100).toFixed(2)
    ])
  ];
  
  const paymentSheet = XLSX.utils.aoa_to_sheet(paymentData);
  paymentSheet['!cols'] = [{ width: 30 }, { width: 20 }, { width: 15 }];
  XLSX.utils.book_append_sheet(wb, paymentSheet, 'Zahlungsmethoden');
  
  // Daily Revenue Sheet
  const dailyData = [
    ['TÄGLICHE EINNAHMEN', '', '', '', ''],
    ['Datum', 'Umsatz', 'Bestellungen', 'Steuern', 'Trinkgelder'],
    ...Object.entries(dailyRevenue).map(([date, data]) => [
      date,
      data.revenue,
      data.orders,
      data.tax,
      data.tips
    ])
  ];
  
  const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
  XLSX.utils.book_append_sheet(wb, dailySheet, 'Tägliche Einnahmen');
};

// Generic Report Excel
const generateGenericExcel = (wb, data) => {
  const sheetData = [
    ['REPORT', ''],
    ['', ''],
    ...Object.entries(data).map(([key, value]) => [
      key,
      typeof value === 'object' ? JSON.stringify(value) : value
    ])
  ];
  
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet['!cols'] = [{ width: 30 }, { width: 50 }];
  XLSX.utils.book_append_sheet(wb, sheet, 'Report');
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Add PDF Header
const addHeader = (doc, title, dateRange) => {
  // Logo placeholder
  doc.setFillColor(59, 130, 246);
  doc.rect(15, 10, 40, 15, 'F');
  doc.setFontSize(14);
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.text('EATECH', 35, 20, { align: 'center' });
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(0);
  doc.text(title, 105, 20, { align: 'center' });
  
  // Date range
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  const dateRangeText = `${format(dateRange.start, 'dd. MMMM yyyy', { locale: de })} - ${format(dateRange.end, 'dd. MMMM yyyy', { locale: de })}`;
  doc.text(dateRangeText, 105, 30, { align: 'center' });
  
  // Separator line
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(15, 40, 195, 40);
};

// Add PDF Footer
const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(15, 280, 195, 280);
    
    // Footer text
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Erstellt am ${format(new Date(), 'dd.MM.yyyy HH:mm')} Uhr`,
      15,
      285
    );
    doc.text(
      `Seite ${i} von ${pageCount}`,
      195,
      285,
      { align: 'right' }
    );
  }
};

// Translate Status
const translateStatus = (status) => {
  const translations = {
    'pending': 'Ausstehend',
    'confirmed': 'Bestätigt',
    'preparing': 'In Zubereitung',
    'ready': 'Bereit',
    'completed': 'Abgeschlossen',
    'delivered': 'Geliefert',
    'cancelled': 'Storniert'
  };
  return translations[status] || status;
};

// Translate Payment Method
const translatePaymentMethod = (method) => {
  const translations = {
    'card': 'Kreditkarte',
    'cash': 'Bargeld',
    'twint': 'TWINT',
    'invoice': 'Rechnung',
    'paypal': 'PayPal',
    'crypto': 'Kryptowährung'
  };
  return translations[method] || method;
};

// Translate Customer Segment
const translateSegment = (segment) => {
  const translations = {
    'bronze': 'Bronze',
    'silver': 'Silber',
    'gold': 'Gold',
    'platinum': 'Platin',
    'none': 'Keine Stufe'
  };
  return translations[segment] || segment;
};