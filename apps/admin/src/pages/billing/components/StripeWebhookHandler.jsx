/**
 * EATECH - Stripe Webhook Handler
 * Version: 21.0.0
 * Description: Verarbeitung von Stripe Webhooks für automatisierte Billing-Prozesse
 * File Path: /apps/admin/src/pages/billing/components/StripeWebhookHandler.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Webhook, CheckCircle, XCircle, AlertCircle, Clock,
  RefreshCw, Shield, Code, Calendar, Activity,
  Zap, Database, Send, Terminal, Copy, Eye, EyeOff,
  Filter, Search, Download, Trash2, Play, Pause
} from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================
const WEBHOOK_EVENTS = {
  // Payment Events
  'payment_intent.succeeded': {
    label: 'Zahlung erfolgreich',
    category: 'payment',
    icon: CheckCircle,
    color: '#4ECDC4'
  },
  'payment_intent.payment_failed': {
    label: 'Zahlung fehlgeschlagen',
    category: 'payment',
    icon: XCircle,
    color: '#FF6B6B'
  },
  'charge.refunded': {
    label: 'Rückerstattung',
    category: 'payment',
    icon: RefreshCw,
    color: '#FFD93D'
  },
  
  // Subscription Events
  'customer.subscription.created': {
    label: 'Abonnement erstellt',
    category: 'subscription',
    icon: CheckCircle,
    color: '#4ECDC4'
  },
  'customer.subscription.updated': {
    label: 'Abonnement aktualisiert',
    category: 'subscription',
    icon: RefreshCw,
    color: '#FFD93D'
  },
  'customer.subscription.deleted': {
    label: 'Abonnement gekündigt',
    category: 'subscription',
    icon: XCircle,
    color: '#FF6B6B'
  },
  'customer.subscription.trial_will_end': {
    label: 'Testphase endet bald',
    category: 'subscription',
    icon: Clock,
    color: '#FFD93D'
  },
  
  // Invoice Events
  'invoice.payment_succeeded': {
    label: 'Rechnung bezahlt',
    category: 'invoice',
    icon: CheckCircle,
    color: '#4ECDC4'
  },
  'invoice.payment_failed': {
    label: 'Rechnungszahlung fehlgeschlagen',
    category: 'invoice',
    icon: XCircle,
    color: '#FF6B6B'
  },
  'invoice.upcoming': {
    label: 'Kommende Rechnung',
    category: 'invoice',
    icon: Clock,
    color: '#FFD93D'
  },
  
  // Customer Events
  'customer.created': {
    label: 'Kunde erstellt',
    category: 'customer',
    icon: CheckCircle,
    color: '#4ECDC4'
  },
  'customer.updated': {
    label: 'Kunde aktualisiert',
    category: 'customer',
    icon: RefreshCw,
    color: '#FFD93D'
  }
};

const WEBHOOK_STATUS = {
  pending: { label: 'Ausstehend', color: '#FFD93D', icon: Clock },
  processing: { label: 'Verarbeitung', color: '#4ECDC4', icon: RefreshCw },
  succeeded: { label: 'Erfolgreich', color: '#4ECDC4', icon: CheckCircle },
  failed: { label: 'Fehlgeschlagen', color: '#FF6B6B', icon: XCircle },
  retrying: { label: 'Wiederholung', color: '#FFD93D', icon: RefreshCw }
};

// ============================================================================
// MOCK DATA
// ============================================================================
const generateMockWebhooks = () => {
  const events = [
    {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      status: 'succeeded',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      attempts: 1,
      data: {
        amount: 38650,
        currency: 'chf',
        customer: 'cus_123',
        description: 'Subscription payment'
      }
    },
    {
      id: 'evt_2',
      type: 'customer.subscription.created',
      status: 'succeeded',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      attempts: 1,
      data: {
        plan: 'professional',
        customer: 'cus_456',
        interval: 'month'
      }
    },
    {
      id: 'evt_3',
      type: 'invoice.payment_failed',
      status: 'failed',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      attempts: 3,
      error: 'Card declined',
      data: {
        amount: 9900,
        customer: 'cus_789'
      }
    },
    {
      id: 'evt_4',
      type: 'customer.subscription.trial_will_end',
      status: 'succeeded',
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      attempts: 1,
      data: {
        customer: 'cus_101',
        trial_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  ];
  
  return events;
};

// ============================================================================
// SUB-KOMPONENTEN
// ============================================================================

// Webhook Configuration
const WebhookConfiguration = ({ endpoint, secret, onUpdate }) => {
  const [showSecret, setShowSecret] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState(endpoint);
  
  const handleSave = () => {
    onUpdate({ endpoint: newEndpoint });
    setEditing(false);
  };
  
  const copySecret = () => {
    navigator.clipboard.writeText(secret);
  };
  
  return (
    <div className="webhook-config">
      <h3>Webhook-Konfiguration</h3>
      <div className="config-grid">
        <div className="config-item">
          <label>Endpoint URL</label>
          {editing ? (
            <div className="endpoint-edit">
              <input
                type="text"
                value={newEndpoint}
                onChange={(e) => setNewEndpoint(e.target.value)}
                placeholder="https://api.eatech.ch/webhooks/stripe"
              />
              <button className="save-btn" onClick={handleSave}>
                Speichern
              </button>
              <button className="cancel-btn" onClick={() => setEditing(false)}>
                Abbrechen
              </button>
            </div>
          ) : (
            <div className="endpoint-display">
              <code>{endpoint}</code>
              <button className="edit-btn" onClick={() => setEditing(true)}>
                Bearbeiten
              </button>
            </div>
          )}
        </div>
        
        <div className="config-item">
          <label>Webhook Secret</label>
          <div className="secret-display">
            <code>
              {showSecret ? secret : '••••••••••••••••••••••••••••••••'}
            </code>
            <button
              className="icon-btn"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button className="icon-btn" onClick={copySecret}>
              <Copy size={16} />
            </button>
          </div>
        </div>
        
        <div className="config-item">
          <label>Aktive Events</label>
          <div className="event-count">
            {Object.keys(WEBHOOK_EVENTS).length} Events konfiguriert
          </div>
        </div>
      </div>
    </div>
  );
};

// Event Filters
const EventFilters = ({ filters, onChange }) => {
  const categories = ['all', 'payment', 'subscription', 'invoice', 'customer'];
  const statuses = ['all', 'succeeded', 'failed', 'pending', 'retrying'];
  
  return (
    <div className="event-filters">
      <div className="filter-group">
        <label>Kategorie</label>
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'Alle Kategorien' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>
      
      <div className="filter-group">
        <label>Status</label>
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
        >
          {statuses.map(status => (
            <option key={status} value={status}>
              {status === 'all' ? 'Alle Status' : WEBHOOK_STATUS[status]?.label || status}
            </option>
          ))}
        </select>
      </div>
      
      <div className="filter-group">
        <label>Zeitraum</label>
        <select
          value={filters.timeRange}
          onChange={(e) => onChange({ ...filters, timeRange: e.target.value })}
        >
          <option value="1h">Letzte Stunde</option>
          <option value="24h">Letzte 24 Stunden</option>
          <option value="7d">Letzte 7 Tage</option>
          <option value="30d">Letzte 30 Tage</option>
        </select>
      </div>
    </div>
  );
};

// Event Details Modal
const EventDetailsModal = ({ event, isOpen, onClose }) => {
  if (!isOpen || !event) return null;
  
  const eventConfig = WEBHOOK_EVENTS[event.type] || {
    label: event.type,
    icon: Activity,
    color: '#999'
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-details" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Webhook Event Details</h3>
          <button className="close-btn" onClick={onClose}>
            <XCircle size={20} />
          </button>
        </div>
        
        <div className="event-summary">
          <div className="event-type-large">
            <eventConfig.icon size={24} style={{ color: eventConfig.color }} />
            <span>{eventConfig.label}</span>
          </div>
          <span className={`status-badge ${event.status}`}>
            {WEBHOOK_STATUS[event.status].label}
          </span>
        </div>
        
        <div className="detail-sections">
          <div className="detail-section">
            <h4>Event Information</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Event ID</label>
                <code>{event.id}</code>
              </div>
              <div className="detail-item">
                <label>Type</label>
                <code>{event.type}</code>
              </div>
              <div className="detail-item">
                <label>Timestamp</label>
                <span>{new Date(event.timestamp).toLocaleString('de-CH')}</span>
              </div>
              <div className="detail-item">
                <label>Attempts</label>
                <span>{event.attempts}</span>
              </div>
            </div>
          </div>
          
          <div className="detail-section">
            <h4>Event Data</h4>
            <pre className="event-data">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </div>
          
          {event.error && (
            <div className="detail-section error">
              <h4>Error Details</h4>
              <p>{event.error}</p>
            </div>
          )}
        </div>
        
        <div className="modal-actions">
          <button className="secondary-btn" onClick={() => console.log('Retry:', event)}>
            <RefreshCw size={16} /> Wiederholen
          </button>
          <button className="primary-btn" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================
const StripeWebhookHandler = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    timeRange: '24h'
  });
  const [webhookConfig, setWebhookConfig] = useState({
    endpoint: 'https://api.eatech.ch/webhooks/stripe',
    secret: 'whsec_1234567890abcdef',
    active: true
  });

  // Load webhook events
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setEvents(generateMockWebhooks());
      setLoading(false);
    }, 1000);
  }, []);

  // Filter events
  const filteredEvents = events.filter(event => {
    if (filters.category !== 'all') {
      const eventCategory = WEBHOOK_EVENTS[event.type]?.category;
      if (eventCategory !== filters.category) return false;
    }
    
    if (filters.status !== 'all' && event.status !== filters.status) {
      return false;
    }
    
    // Time range filter would be implemented here
    return true;
  });

  // Handlers
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowDetails(true);
  };

  const handleRetryEvent = (event) => {
    console.log('Retrying event:', event);
    // Implement retry logic
  };

  const handleDeleteEvent = (eventId) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handleConfigUpdate = (updates) => {
    setWebhookConfig(prev => ({ ...prev, ...updates }));
  };

  const handleToggleWebhook = () => {
    setWebhookConfig(prev => ({ ...prev, active: !prev.active }));
  };

  if (loading) {
    return (
      <div className="webhook-loading">
        <RefreshCw className="loading-spinner" />
        <p>Lade Webhook-Events...</p>
      </div>
    );
  }

  return (
    <div className="webhook-handler">
      {/* Header */}
      <div className="handler-header">
        <div className="header-content">
          <h1>Stripe Webhook Handler</h1>
          <p>Verwalten Sie eingehende Webhook-Events von Stripe</p>
        </div>
        <div className="header-actions">
          <button
            className={`toggle-btn ${webhookConfig.active ? 'active' : 'inactive'}`}
            onClick={handleToggleWebhook}
          >
            {webhookConfig.active ? (
              <>
                <Pause size={16} /> Webhook pausieren
              </>
            ) : (
              <>
                <Play size={16} /> Webhook aktivieren
              </>
            )}
          </button>
        </div>
      </div>

      {/* Webhook Configuration */}
      <WebhookConfiguration
        endpoint={webhookConfig.endpoint}
        secret={webhookConfig.secret}
        onUpdate={handleConfigUpdate}
      />

      {/* Filters */}
      <EventFilters filters={filters} onChange={setFilters} />

      {/* Events Table */}
      <div className="events-section">
        <div className="section-header">
          <h3>Webhook Events ({filteredEvents.length})</h3>
          <div className="section-actions">
            <button className="icon-btn">
              <Download size={16} />
            </button>
            <button className="icon-btn">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="events-table">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Zeitstempel</th>
                <th>Versuche</th>
                <th>Details</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(event => {
                const eventConfig = WEBHOOK_EVENTS[event.type] || {
                  label: event.type,
                  icon: Activity,
                  color: '#999'
                };
                const StatusIcon = WEBHOOK_STATUS[event.status].icon;
                const EventIcon = eventConfig.icon;
                
                return (
                  <tr key={event.id} onClick={() => handleEventClick(event)}>
                    <td>
                      <div className="event-type">
                        <EventIcon size={16} style={{ color: eventConfig.color }} />
                        <span>{eventConfig.label}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${event.status}`}>
                        <StatusIcon size={14} />
                        {WEBHOOK_STATUS[event.status].label}
                      </span>
                    </td>
                    <td>{new Date(event.timestamp).toLocaleString('de-CH')}</td>
                    <td>
                      <span className={event.attempts > 1 ? 'attempts-warning' : ''}>
                        {event.attempts}
                      </span>
                    </td>
                    <td>
                      {event.data.customer && <span className="detail-chip">Customer: {event.data.customer}</span>}
                      {event.data.amount && <span className="detail-chip">CHF {(event.data.amount / 100).toFixed(2)}</span>}
                    </td>
                    <td>
                      <div className="event-actions" onClick={e => e.stopPropagation()}>
                        {event.status === 'failed' && (
                          <button
                            className="icon-btn"
                            onClick={() => handleRetryEvent(event)}
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        <button
                          className="icon-btn"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
      />
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = `
  .webhook-handler {
    background: #0A0A0A;
    color: #FFF;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }

  /* Header */
  .handler-header {
    background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%);
    padding: 2rem;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-content h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    background: linear-gradient(135deg, #4ECDC4 0%, #44A3AA 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-content p {
    margin: 0;
    color: #999;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-btn.active {
    background: #FFD93D;
    color: #0A0A0A;
  }

  .toggle-btn.inactive {
    background: #4ECDC4;
    color: #0A0A0A;
  }

  .toggle-btn:hover {
    transform: translateY(-1px);
  }

  /* Webhook Configuration */
  .webhook-config {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2rem;
    margin: 2rem;
  }

  .webhook-config h3 {
    margin: 0 0 1.5rem 0;
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .config-item {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .config-item label {
    font-size: 0.875rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .endpoint-display,
  .secret-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #2D2D2D;
    padding: 0.75rem 1rem;
    border-radius: 8px;
  }

  .endpoint-display code,
  .secret-display code {
    flex: 1;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: #4ECDC4;
  }

  .endpoint-edit {
    display: flex;
    gap: 0.5rem;
  }

  .endpoint-edit input {
    flex: 1;
    padding: 0.75rem;
    background: #2D2D2D;
    border: 1px solid #333;
    border-radius: 6px;
    color: #FFF;
  }

  .endpoint-edit input:focus {
    outline: none;
    border-color: #4ECDC4;
  }

  .save-btn,
  .cancel-btn,
  .edit-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .save-btn {
    background: #4ECDC4;
    color: #0A0A0A;
  }

  .cancel-btn {
    background: #333;
    color: #FFF;
  }

  .edit-btn {
    background: #2D2D2D;
    color: #FFF;
    border: 1px solid #333;
  }

  .save-btn:hover,
  .cancel-btn:hover,
  .edit-btn:hover {
    transform: translateY(-1px);
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    color: #999;
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-btn:hover {
    color: #FFF;
  }

  .event-count {
    background: #2D2D2D;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    color: #4ECDC4;
  }

  /* Event Filters */
  .event-filters {
    display: flex;
    gap: 1rem;
    padding: 0 2rem 2rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-group label {
    font-size: 0.875rem;
    color: #999;
  }

  .filter-group select {
    padding: 0.5rem 1rem;
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 6px;
    color: #FFF;
    cursor: pointer;
  }

  .filter-group select:focus {
    outline: none;
    border-color: #4ECDC4;
  }

  /* Events Section */
  .events-section {
    margin: 0 2rem 2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-header h3 {
    margin: 0;
  }

  .section-actions {
    display: flex;
    gap: 0.5rem;
  }

  /* Events Table */
  .events-table {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    overflow: hidden;
  }

  .events-table table {
    width: 100%;
    border-collapse: collapse;
  }

  .events-table th {
    text-align: left;
    padding: 1rem 1.5rem;
    background: #2D2D2D;
    border-bottom: 1px solid #333;
    color: #999;
    font-weight: 500;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
  }

  .events-table td {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #222;
  }

  .events-table tr:last-child td {
    border-bottom: none;
  }

  .events-table tbody tr {
    cursor: pointer;
    transition: background 0.2s;
  }

  .events-table tbody tr:hover {
    background: rgba(78, 205, 196, 0.05);
  }

  .event-type {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status-badge.succeeded {
    background: rgba(78, 205, 196, 0.2);
    color: #4ECDC4;
  }

  .status-badge.failed {
    background: rgba(255, 107, 107, 0.2);
    color: #FF6B6B;
  }

  .status-badge.pending {
    background: rgba(255, 217, 61, 0.2);
    color: #FFD93D;
  }

  .status-badge.retrying {
    background: rgba(255, 217, 61, 0.2);
    color: #FFD93D;
  }

  .attempts-warning {
    color: #FFD93D;
    font-weight: 600;
  }

  .detail-chip {
    display: inline-block;
    background: #2D2D2D;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    margin-right: 0.5rem;
  }

  .event-actions {
    display: flex;
    gap: 0.5rem;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 16px;
    max-width: 800px;
    max-height: 90vh;
    width: 90%;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2rem;
    border-bottom: 1px solid #333;
  }

  .modal-header h3 {
    margin: 0;
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

  .event-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background: #2D2D2D;
  }

  .event-type-large {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.125rem;
    font-weight: 500;
  }

  .detail-sections {
    padding: 2rem;
  }

  .detail-section {
    margin-bottom: 2rem;
  }

  .detail-section:last-child {
    margin-bottom: 0;
  }

  .detail-section h4 {
    margin: 0 0 1rem 0;
    color: #999;
    text-transform: uppercase;
    font-size: 0.875rem;
    letter-spacing: 0.5px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-item label {
    font-size: 0.875rem;
    color: #666;
  }

  .detail-item code {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: #4ECDC4;
  }

  .event-data {
    background: #2D2D2D;
    padding: 1rem;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: #CCC;
    overflow-x: auto;
  }

  .detail-section.error {
    background: rgba(255, 107, 107, 0.1);
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid #FF6B6B;
  }

  .detail-section.error p {
    margin: 0;
    color: #FF6B6B;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 2rem;
    border-top: 1px solid #333;
  }

  .secondary-btn,
  .primary-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .secondary-btn {
    background: #2D2D2D;
    color: #FFF;
    border: 1px solid #333;
  }

  .primary-btn {
    background: #4ECDC4;
    color: #0A0A0A;
  }

  .secondary-btn:hover,
  .primary-btn:hover {
    transform: translateY(-1px);
  }

  /* Loading */
  .webhook-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #0A0A0A;
    color: #999;
  }

  .loading-spinner {
    animation: spin 1s linear infinite;
    color: #4ECDC4;
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .handler-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .webhook-config {
      margin: 1rem;
      padding: 1.5rem;
    }

    .config-grid {
      grid-template-columns: 1fr;
    }

    .event-filters {
      flex-direction: column;
      padding: 0 1rem 1rem;
    }

    .events-section {
      margin: 0 1rem 1rem;
    }

    .events-table {
      overflow-x: auto;
    }

    .events-table table {
      min-width: 800px;
    }

    .modal-content {
      max-width: 100%;
      height: 100%;
      border-radius: 0;
    }

    .detail-grid {
      grid-template-columns: 1fr;
    }
  }
`;

// Styles hinzufügen
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

export default StripeWebhookHandler;