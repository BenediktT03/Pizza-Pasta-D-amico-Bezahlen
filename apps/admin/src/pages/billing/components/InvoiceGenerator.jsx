/**
 * EATECH - Invoice Generator Component
 * Version: 21.0.0
 * Description: Automatische Rechnungserstellung und PDF-Export
 * File Path: /apps/admin/src/pages/billing/components/InvoiceGenerator.jsx
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Download, Send, Printer, Eye, Edit,
  Calendar, DollarSign, CheckCircle, Clock,
  AlertCircle, Plus, X, Copy, ExternalLink,
  CreditCard, Building, Mail, Phone, Globe
} from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================
const INVOICE_STATUSES = {
  draft: { label: 'Entwurf', color: '#999', icon: Edit },
  pending: { label: 'Ausstehend', color: '#FFD93D', icon: Clock },
  paid: { label: 'Bezahlt', color: '#4ECDC4', icon: CheckCircle },
  overdue: { label: 'Überfällig', color: '#FF6B6B', icon: AlertCircle },
  void: { label: 'Storniert', color: '#666', icon: X }
};

const TAX_RATES = {
  standard: { rate: 7.7, label: 'Standard MwSt.' },
  reduced: { rate: 2.5, label: 'Reduzierter Satz' },
  special: { rate: 3.7, label: 'Sondersatz' },
  exempt: { rate: 0, label: 'MwSt. befreit' }
};

// ============================================================================
// MOCK DATA
// ============================================================================
const generateMockInvoice = () => ({
  id: 'INV-2025-001',
  status: 'draft',
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  customer: {
    id: 'cust_123',
    name: 'Pizza Express Zürich',
    email: 'info@pizzaexpress.ch',
    phone: '+41 44 123 45 67',
    address: {
      street: 'Bahnhofstrasse 10',
      city: 'Zürich',
      postalCode: '8001',
      country: 'Schweiz'
    },
    taxId: 'CHE-123.456.789 MWST'
  },
  vendor: {
    name: 'EATECH GmbH',
    address: {
      street: 'Technoparkstrasse 1',
      city: 'Zürich',
      postalCode: '8005',
      country: 'Schweiz'
    },
    taxId: 'CHE-987.654.321 MWST',
    email: 'billing@eatech.ch',
    phone: '+41 44 999 88 77',
    website: 'www.eatech.ch'
  },
  items: [
    {
      id: 1,
      description: 'Professional Plan - Monatliches Abonnement',
      quantity: 1,
      unit: 'Monat',
      unitPrice: 299,
      taxRate: 'standard',
      total: 299
    },
    {
      id: 2,
      description: 'Transaktionsgebühren (1,450 Bestellungen @ 2%)',
      quantity: 1450,
      unit: 'Bestellungen',
      unitPrice: 0.06,
      taxRate: 'standard',
      total: 87
    }
  ],
  subtotal: 386,
  taxAmount: 29.72,
  total: 415.72,
  currency: 'CHF',
  notes: '',
  paymentTerms: 'Zahlbar innerhalb von 30 Tagen',
  bankDetails: {
    bank: 'Zürcher Kantonalbank',
    iban: 'CH93 0070 0110 0012 3456 7',
    bic: 'ZKBKCHZZ80A'
  }
});

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================
const InvoiceGenerator = ({ invoiceId, onClose }) => {
  const [invoice, setInvoice] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const invoiceRef = useRef(null);

  // Load invoice data
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setInvoice(generateMockInvoice());
      setLoading(false);
      setIsEditing(!invoiceId); // New invoice = edit mode
    }, 500);
  }, [invoiceId]);

  // Calculate totals
  const calculateTotals = useCallback((items) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = items.reduce((sum, item) => {
      const taxRate = TAX_RATES[item.taxRate].rate;
      return sum + (item.total * taxRate / 100);
    }, 0);
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    };
  }, []);

  // Handlers
  const handleSave = useCallback(() => {
    console.log('Saving invoice:', invoice);
    setIsEditing(false);
  }, [invoice]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleDownloadPDF = useCallback(() => {
    console.log('Downloading PDF...');
    // Implementierung mit jsPDF oder react-pdf
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleSendEmail = useCallback(async () => {
    setSending(true);
    try {
      // API call to send invoice
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Invoice sent to:', invoice.customer.email);
    } finally {
      setSending(false);
    }
  }, [invoice]);

  const handleItemChange = useCallback((index, field, value) => {
    const newItems = [...invoice.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      total: field === 'quantity' || field === 'unitPrice' 
        ? (field === 'quantity' ? value : newItems[index].quantity) * 
          (field === 'unitPrice' ? value : newItems[index].unitPrice)
        : newItems[index].total
    };
    
    const totals = calculateTotals(newItems);
    setInvoice(prev => ({
      ...prev,
      items: newItems,
      ...totals
    }));
  }, [invoice, calculateTotals]);

  const handleAddItem = useCallback(() => {
    const newItem = {
      id: invoice.items.length + 1,
      description: '',
      quantity: 1,
      unit: 'Stück',
      unitPrice: 0,
      taxRate: 'standard',
      total: 0
    };
    
    const newItems = [...invoice.items, newItem];
    const totals = calculateTotals(newItems);
    
    setInvoice(prev => ({
      ...prev,
      items: newItems,
      ...totals
    }));
  }, [invoice, calculateTotals]);

  const handleRemoveItem = useCallback((index) => {
    const newItems = invoice.items.filter((_, i) => i !== index);
    const totals = calculateTotals(newItems);
    
    setInvoice(prev => ({
      ...prev,
      items: newItems,
      ...totals
    }));
  }, [invoice, calculateTotals]);

  if (loading) {
    return (
      <div className="invoice-loading">
        <div className="loading-spinner" />
        <p>Lade Rechnung...</p>
      </div>
    );
  }

  const StatusIcon = INVOICE_STATUSES[invoice.status].icon;

  return (
    <div className="invoice-generator">
      {/* Toolbar */}
      <div className="invoice-toolbar">
        <div className="toolbar-left">
          <h2>Rechnung {invoice.id}</h2>
          <span className={`status-badge ${invoice.status}`}>
            <StatusIcon size={14} />
            {INVOICE_STATUSES[invoice.status].label}
          </span>
        </div>
        <div className="toolbar-actions">
          {isEditing ? (
            <>
              <button className="secondary-btn" onClick={() => setIsEditing(false)}>
                Abbrechen
              </button>
              <button className="primary-btn" onClick={handleSave}>
                Speichern
              </button>
            </>
          ) : (
            <>
              <button className="icon-btn" onClick={handleEdit}>
                <Edit size={16} />
              </button>
              <button className="icon-btn" onClick={handlePrint}>
                <Printer size={16} />
              </button>
              <button className="icon-btn" onClick={handleDownloadPDF}>
                <Download size={16} />
              </button>
              <button 
                className="primary-btn" 
                onClick={handleSendEmail}
                disabled={sending}
              >
                {sending ? (
                  <>Wird gesendet...</>
                ) : (
                  <><Send size={16} /> Per E-Mail senden</>
                )}
              </button>
            </>
          )}
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="invoice-content" ref={invoiceRef}>
        {/* Header */}
        <div className="invoice-header">
          <div className="vendor-section">
            <h1 className="vendor-name">{invoice.vendor.name}</h1>
            <div className="vendor-details">
              <p>{invoice.vendor.address.street}</p>
              <p>{invoice.vendor.address.postalCode} {invoice.vendor.address.city}</p>
              <p>{invoice.vendor.address.country}</p>
              <div className="vendor-contact">
                <p><Mail size={14} /> {invoice.vendor.email}</p>
                <p><Phone size={14} /> {invoice.vendor.phone}</p>
                <p><Globe size={14} /> {invoice.vendor.website}</p>
              </div>
            </div>
          </div>
          
          <div className="invoice-meta">
            <h2>RECHNUNG</h2>
            <div className="meta-details">
              <div className="meta-item">
                <span className="label">Rechnungsnummer:</span>
                <span className="value">{invoice.id}</span>
              </div>
              <div className="meta-item">
                <span className="label">Rechnungsdatum:</span>
                <span className="value">{new Date(invoice.date).toLocaleDateString('de-CH')}</span>
              </div>
              <div className="meta-item">
                <span className="label">Fälligkeitsdatum:</span>
                <span className="value">{new Date(invoice.dueDate).toLocaleDateString('de-CH')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="invoice-body">
          {/* Customer Details */}
          <div className="customer-details">
            <h3>Rechnungsempfänger</h3>
            {isEditing ? (
              <div className="edit-grid">
                <input
                  type="text"
                  value={invoice.customer.name}
                  onChange={(e) => setInvoice(prev => ({
                    ...prev,
                    customer: { ...prev.customer, name: e.target.value }
                  }))}
                  placeholder="Firmenname"
                />
                <input
                  type="email"
                  value={invoice.customer.email}
                  onChange={(e) => setInvoice(prev => ({
                    ...prev,
                    customer: { ...prev.customer, email: e.target.value }
                  }))}
                  placeholder="E-Mail"
                />
                <input
                  type="tel"
                  value={invoice.customer.phone}
                  onChange={(e) => setInvoice(prev => ({
                    ...prev,
                    customer: { ...prev.customer, phone: e.target.value }
                  }))}
                  placeholder="Telefon"
                />
                <input
                  type="text"
                  value={invoice.customer.taxId}
                  onChange={(e) => setInvoice(prev => ({
                    ...prev,
                    customer: { ...prev.customer, taxId: e.target.value }
                  }))}
                  placeholder="MwSt.-ID"
                />
              </div>
            ) : (
              <div className="customer-info">
                <p className="customer-name">{invoice.customer.name}</p>
                <p>{invoice.customer.address.street}</p>
                <p>{invoice.customer.address.postalCode} {invoice.customer.address.city}</p>
                <p>{invoice.customer.address.country}</p>
                {invoice.customer.taxId && <p className="tax-id">MwSt.-ID: {invoice.customer.taxId}</p>}
              </div>
            )}
          </div>

          {/* Invoice Items */}
          <div className="invoice-items">
            <table>
              <thead>
                <tr>
                  <th>Beschreibung</th>
                  <th>Menge</th>
                  <th>Einheit</th>
                  <th>Einzelpreis</th>
                  <th>MwSt.</th>
                  <th>Gesamt</th>
                  {isEditing && <th></th>}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="description-input"
                        />
                      ) : (
                        item.description
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="quantity-input"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="unit-input"
                        />
                      ) : (
                        item.unit
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                          step="0.01"
                          className="price-input"
                        />
                      ) : (
                        `CHF ${item.unitPrice.toFixed(2)}`
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={item.taxRate}
                          onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                          className="tax-select"
                        >
                          {Object.entries(TAX_RATES).map(([key, tax]) => (
                            <option key={key} value={key}>{tax.label}</option>
                          ))}
                        </select>
                      ) : (
                        TAX_RATES[item.taxRate].label
                      )}
                    </td>
                    <td>CHF {item.total.toFixed(2)}</td>
                    {isEditing && (
                      <td>
                        <button
                          className="remove-item-btn"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <X size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {isEditing && (
              <button className="add-item-btn" onClick={handleAddItem}>
                <Plus size={16} /> Position hinzufügen
              </button>
            )}
          </div>

          {/* Summary */}
          <div className="invoice-summary">
            <div className="summary-row">
              <span>Zwischensumme</span>
              <span>CHF {invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>MwSt. (7.7%)</span>
              <span>CHF {invoice.taxAmount.toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Gesamtbetrag</span>
              <span>CHF {invoice.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="payment-info">
            <div className="payment-terms">
              <h4>Zahlungsbedingungen</h4>
              <p>{invoice.paymentTerms}</p>
            </div>
            <div className="bank-details">
              <h4>Bankverbindung</h4>
              <p>{invoice.bankDetails.bank}</p>
              <p>IBAN: {invoice.bankDetails.iban}</p>
              <p>BIC: {invoice.bankDetails.bic}</p>
            </div>
          </div>

          {/* Notes */}
          {(invoice.notes || isEditing) && (
            <div className="invoice-notes">
              <h4>Bemerkungen</h4>
              {isEditing ? (
                <textarea
                  value={invoice.notes}
                  onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Zusätzliche Bemerkungen..."
                  rows={3}
                />
              ) : (
                <p>{invoice.notes}</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="invoice-footer">
            <p>Vielen Dank für Ihr Vertrauen!</p>
            <p className="footer-legal">
              {invoice.vendor.name} | {invoice.vendor.taxId} | {invoice.vendor.email} | {invoice.vendor.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = `
  .invoice-generator {
    background: #0A0A0A;
    color: #FFF;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }

  /* Toolbar */
  .invoice-toolbar {
    background: #1A1A1A;
    border-bottom: 1px solid #333;
    padding: 1.5rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .toolbar-left h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .status-badge.draft {
    background: rgba(153, 153, 153, 0.2);
    color: #999;
  }

  .status-badge.pending {
    background: rgba(255, 217, 61, 0.2);
    color: #FFD93D;
  }

  .status-badge.paid {
    background: rgba(78, 205, 196, 0.2);
    color: #4ECDC4;
  }

  .status-badge.overdue {
    background: rgba(255, 107, 107, 0.2);
    color: #FF6B6B;
  }

  .status-badge.void {
    background: rgba(102, 102, 102, 0.2);
    color: #666;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: #2D2D2D;
    border: 1px solid #333;
    border-radius: 6px;
    color: #999;
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-btn:hover {
    color: #FFF;
    border-color: #4ECDC4;
  }

  .primary-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #4ECDC4;
    color: #0A0A0A;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .primary-btn:hover {
    background: #44A3AA;
  }

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .secondary-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #2D2D2D;
    border: 1px solid #333;
    color: #FFF;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .secondary-btn:hover {
    background: #333;
    border-color: #4ECDC4;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 0.5rem;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: #FFF;
  }

  /* Invoice Content */
  .invoice-content {
    max-width: 800px;
    margin: 2rem auto;
    background: #FFF;
    color: #000;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  /* Invoice Header */
  .invoice-header {
    background: #F8F8F8;
    padding: 3rem;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2rem;
    border-bottom: 2px solid #E0E0E0;
  }

  .vendor-name {
    margin: 0 0 1rem 0;
    font-size: 2rem;
    color: #1A1A1A;
  }

  .vendor-details p {
    margin: 0 0 0.25rem 0;
    color: #666;
  }

  .vendor-contact {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #E0E0E0;
  }

  .vendor-contact p {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .invoice-meta h2 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    text-align: right;
    color: #1A1A1A;
  }

  .meta-details {
    text-align: right;
  }

  .meta-item {
    margin-bottom: 0.5rem;
  }

  .meta-item .label {
    color: #666;
    font-size: 0.875rem;
  }

  .meta-item .value {
    color: #1A1A1A;
    font-weight: 600;
    margin-left: 0.5rem;
  }

  /* Invoice Body */
  .invoice-body {
    padding: 3rem;
  }

  /* Customer Details */
  .customer-details {
    margin-bottom: 3rem;
  }

  .customer-details h3 {
    margin: 0 0 1rem 0;
    color: #1A1A1A;
    font-size: 1.125rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .customer-info p {
    margin: 0 0 0.25rem 0;
    color: #333;
  }

  .customer-name {
    font-weight: 600;
    font-size: 1.125rem;
    margin-bottom: 0.5rem !important;
  }

  .tax-id {
    margin-top: 0.5rem !important;
    font-size: 0.875rem;
    color: #666;
  }

  .edit-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .edit-grid input {
    padding: 0.75rem;
    border: 1px solid #DDD;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  /* Invoice Items Table */
  .invoice-items {
    margin-bottom: 3rem;
  }

  .invoice-items table {
    width: 100%;
    border-collapse: collapse;
  }

  .invoice-items th {
    text-align: left;
    padding: 0.75rem;
    border-bottom: 2px solid #1A1A1A;
    color: #1A1A1A;
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .invoice-items td {
    padding: 1rem 0.75rem;
    border-bottom: 1px solid #E0E0E0;
    color: #333;
  }

  .invoice-items tr:last-child td {
    border-bottom: 2px solid #1A1A1A;
  }

  .invoice-items input,
  .invoice-items select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #DDD;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .description-input {
    min-width: 200px;
  }

  .quantity-input,
  .unit-input {
    max-width: 80px;
  }

  .price-input {
    max-width: 100px;
  }

  .tax-select {
    max-width: 150px;
  }

  .remove-item-btn {
    background: #FF6B6B;
    border: none;
    color: #FFF;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .remove-item-btn:hover {
    background: #E55555;
  }

  .add-item-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #F8F8F8;
    border: 1px dashed #999;
    color: #666;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-item-btn:hover {
    border-color: #4ECDC4;
    color: #4ECDC4;
  }

  /* Invoice Summary */
  .invoice-summary {
    margin-left: auto;
    max-width: 300px;
    margin-bottom: 3rem;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    color: #666;
  }

  .summary-row.total {
    border-top: 2px solid #1A1A1A;
    padding-top: 1rem;
    margin-top: 0.5rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1A1A1A;
  }

  /* Payment Info */
  .payment-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 3rem;
    padding: 2rem;
    background: #F8F8F8;
    border-radius: 8px;
  }

  .payment-info h4 {
    margin: 0 0 0.75rem 0;
    color: #1A1A1A;
    font-size: 1rem;
  }

  .payment-info p {
    margin: 0 0 0.25rem 0;
    color: #666;
    font-size: 0.875rem;
  }

  /* Notes */
  .invoice-notes {
    margin-bottom: 3rem;
  }

  .invoice-notes h4 {
    margin: 0 0 1rem 0;
    color: #1A1A1A;
  }

  .invoice-notes p {
    color: #666;
    line-height: 1.6;
  }

  .invoice-notes textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #DDD;
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
  }

  /* Footer */
  .invoice-footer {
    text-align: center;
    padding-top: 2rem;
    border-top: 1px solid #E0E0E0;
  }

  .invoice-footer p {
    margin: 0 0 0.5rem 0;
    color: #666;
  }

  .footer-legal {
    font-size: 0.75rem;
    color: #999;
  }

  /* Loading */
  .invoice-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: #999;
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid #333;
    border-top-color: #4ECDC4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Print Styles */
  @media print {
    .invoice-toolbar {
      display: none;
    }
    
    .invoice-content {
      margin: 0;
      box-shadow: none;
      border-radius: 0;
    }
    
    .invoice-header {
      background: #FFF;
      border-bottom: 2px solid #000;
    }
    
    .payment-info {
      background: #FFF;
      border: 1px solid #000;
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .invoice-toolbar {
      padding: 1rem;
      flex-direction: column;
      gap: 1rem;
    }
    
    .toolbar-left,
    .toolbar-actions {
      width: 100%;
      justify-content: space-between;
    }
    
    .invoice-content {
      margin: 1rem;
      border-radius: 8px;
    }
    
    .invoice-header {
      padding: 2rem 1.5rem;
      grid-template-columns: 1fr;
    }
    
    .invoice-meta {
      text-align: left;
      margin-top: 2rem;
    }
    
    .invoice-body {
      padding: 1.5rem;
    }
    
    .edit-grid {
      grid-template-columns: 1fr;
    }
    
    .payment-info {
      grid-template-columns: 1fr;
    }
    
    .invoice-items {
      overflow-x: auto;
    }
    
    .invoice-items table {
      min-width: 600px;
    }
  }
`;

// Styles hinzufügen
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

export default InvoiceGenerator;