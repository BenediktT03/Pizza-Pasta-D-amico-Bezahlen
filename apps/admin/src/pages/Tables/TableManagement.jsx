/**
 * EATECH - Table Management System
 * Version: 1.0.0
 * Description: Tischverwaltung mit QR-Codes, Reservierungen und Live-Status
 * Features: Table Layout Editor, QR Generation, Occupancy Tracking, Reservations
 * 
 * Kapitel: Phase 4 - Advanced Features - Table Management
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Grid3x3, 
  Plus, 
  Edit2, 
  Trash2, 
  QrCode, 
  Download,
  Users,
  Clock,
  Calendar,
  MapPin,
  Maximize2,
  Eye,
  EyeOff,
  Save,
  X,
  Move,
  Copy,
  Layers,
  Settings,
  CheckCircle,
  AlertCircle,
  Timer,
  Coffee
} from 'lucide-react';
import { format, addMinutes, differenceInMinutes, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import QRCode from 'qrcode';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Hooks
import { useTableManagement } from '../../../packages/core/src/hooks/useTableManagement';
import { useTenant } from '../../../packages/core/src/hooks/useTenant';
import { useOffline } from '../../../packages/core/src/hooks/useOffline';

// Components
import TableEditor from '../../components/Tables/TableEditor';
import ReservationModal from '../../components/Tables/ReservationModal';
import QRCodeModal from '../../components/Tables/QRCodeModal';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

// Styles
import styles from './TableManagement.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const TABLE_TYPES = {
  SQUARE_2: { id: 'square_2', name: '2er Tisch', seats: 2, width: 80, height: 80 },
  SQUARE_4: { id: 'square_4', name: '4er Tisch', seats: 4, width: 100, height: 100 },
  RECT_4: { id: 'rect_4', name: '4er Tisch (länglich)', seats: 4, width: 120, height: 80 },
  RECT_6: { id: 'rect_6', name: '6er Tisch', seats: 6, width: 160, height: 80 },
  RECT_8: { id: 'rect_8', name: '8er Tisch', seats: 8, width: 200, height: 80 },
  ROUND_2: { id: 'round_2', name: '2er Rund', seats: 2, width: 80, height: 80, shape: 'circle' },
  ROUND_4: { id: 'round_4', name: '4er Rund', seats: 4, width: 100, height: 100, shape: 'circle' },
  ROUND_6: { id: 'round_6', name: '6er Rund', seats: 6, width: 120, height: 120, shape: 'circle' },
  BAR: { id: 'bar', name: 'Barplatz', seats: 1, width: 50, height: 50 }
};

const TABLE_STATUSES = {
  AVAILABLE: { id: 'available', name: 'Frei', color: '#10b981', icon: CheckCircle },
  OCCUPIED: { id: 'occupied', name: 'Besetzt', color: '#3b82f6', icon: Users },
  RESERVED: { id: 'reserved', name: 'Reserviert', color: '#f59e0b', icon: Calendar },
  CLEANING: { id: 'cleaning', name: 'Reinigung', color: '#8b5cf6', icon: Coffee },
  BLOCKED: { id: 'blocked', name: 'Gesperrt', color: '#ef4444', icon: X }
};

const AREAS = [
  { id: 'main', name: 'Hauptbereich', color: '#3b82f6' },
  { id: 'terrace', name: 'Terrasse', color: '#10b981' },
  { id: 'vip', name: 'VIP-Bereich', color: '#8b5cf6' },
  { id: 'bar', name: 'Bar', color: '#f59e0b' }
];

const GRID_SIZE = 20;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

// ============================================================================
// TABLE COMPONENT (Draggable)
// ============================================================================
function DraggableTable({ table, isSelected, onSelect, onUpdate, zoom }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'table',
    item: { id: table.id, ...table },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  
  const status = TABLE_STATUSES[table.status] || TABLE_STATUSES.AVAILABLE;
  const tableType = TABLE_TYPES[table.type] || TABLE_TYPES.SQUARE_4;
  
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    onSelect(table);
  };
  
  return (
    <div
      ref={drag}
      className={`${styles.table} ${isSelected ? styles.selected : ''} ${isDragging ? styles.dragging : ''}`}
      style={{
        left: table.x * zoom,
        top: table.y * zoom,
        width: tableType.width * zoom,
        height: tableType.height * zoom,
        backgroundColor: status.color,
        borderRadius: tableType.shape === 'circle' ? '50%' : '8px',
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(table);
      }}
      onDoubleClick={handleDoubleClick}
    >
      <div className={styles.tableContent}>
        <div className={styles.tableNumber}>{table.number}</div>
        <div className={styles.tableSeats}>
          <Users size={12} />
          <span>{tableType.seats}</span>
        </div>
        {table.currentOrder && (
          <div className={styles.tableTimer}>
            <Timer size={12} />
            <span>{differenceInMinutes(new Date(), new Date(table.currentOrder.startTime))}m</span>
          </div>
        )}
      </div>
      
      {table.reservation && (
        <div className={styles.reservationIndicator}>
          <Calendar size={12} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FLOOR PLAN COMPONENT (Droppable)
// ============================================================================
function FloorPlan({ tables, selectedTable, onSelectTable, onUpdateTable, zoom, showGrid }) {
  const [, drop] = useDrop({
    accept: 'table',
    drop: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (!delta) return;
      
      const newX = Math.round((item.x + delta.x / zoom) / GRID_SIZE) * GRID_SIZE;
      const newY = Math.round((item.y + delta.y / zoom) / GRID_SIZE) * GRID_SIZE;
      
      onUpdateTable(item.id, { x: newX, y: newY });
    }
  });
  
  const handleBackgroundClick = () => {
    onSelectTable(null);
  };
  
  return (
    <div 
      ref={drop}
      className={styles.floorPlan}
      onClick={handleBackgroundClick}
      style={{
        backgroundSize: showGrid ? `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px` : 'none',
        backgroundImage: showGrid ? 
          `linear-gradient(to right, #e5e5e5 1px, transparent 1px),
           linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)` : 'none'
      }}
    >
      {tables.map(table => (
        <DraggableTable
          key={table.id}
          table={table}
          isSelected={selectedTable?.id === table.id}
          onSelect={onSelectTable}
          onUpdate={onUpdateTable}
          zoom={zoom}
        />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TableManagement() {
  const { currentTenant } = useTenant();
  const { isOnline } = useOffline();
  const tableManagement = useTableManagement();
  
  // State
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedArea, setSelectedArea] = useState('all');
  const [showReservations, setShowReservations] = useState(true);
  const [showOccupied, setShowOccupied] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    reserved: 0,
    occupancyRate: 0
  });
  
  // Refs
  const floorPlanRef = useRef(null);
  
  // ==========================================================================
  // EFFECTS
  // ==========================================================================
  useEffect(() => {
    if (!currentTenant?.id) return;
    
    loadTables();
    
    // Subscribe to real-time updates
    const unsubscribe = tableManagement.subscribeToTables(currentTenant.id, (updatedTables) => {
      setTables(updatedTables);
      updateStats(updatedTables);
    });
    
    return () => unsubscribe();
  }, [currentTenant]);
  
  // ==========================================================================
  // DATA LOADING
  // ==========================================================================
  const loadTables = async () => {
    try {
      setLoading(true);
      const loadedTables = await tableManagement.getTables();
      setTables(loadedTables);
      updateStats(loadedTables);
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateStats = (tableList) => {
    const stats = {
      total: tableList.length,
      available: 0,
      occupied: 0,
      reserved: 0,
      occupancyRate: 0
    };
    
    tableList.forEach(table => {
      switch (table.status) {
        case 'available':
          stats.available++;
          break;
        case 'occupied':
          stats.occupied++;
          break;
        case 'reserved':
          stats.reserved++;
          break;
      }
    });
    
    if (stats.total > 0) {
      stats.occupancyRate = Math.round((stats.occupied / stats.total) * 100);
    }
    
    setStats(stats);
  };
  
  // ==========================================================================
  // TABLE MANAGEMENT
  // ==========================================================================
  const handleAddTable = useCallback(async () => {
    const newTable = {
      number: tables.length + 1,
      type: 'square_4',
      status: 'available',
      area: selectedArea === 'all' ? 'main' : selectedArea,
      x: 100,
      y: 100
    };
    
    const created = await tableManagement.createTable(newTable);
    setTables([...tables, created]);
    setSelectedTable(created);
  }, [tables, selectedArea, tableManagement]);
  
  const handleUpdateTable = useCallback(async (tableId, updates) => {
    await tableManagement.updateTable(tableId, updates);
    
    setTables(prev => prev.map(table => 
      table.id === tableId ? { ...table, ...updates } : table
    ));
    
    if (selectedTable?.id === tableId) {
      setSelectedTable(prev => ({ ...prev, ...updates }));
    }
  }, [selectedTable, tableManagement]);
  
  const handleDeleteTable = useCallback(async (tableId) => {
    if (!window.confirm('Möchten Sie diesen Tisch wirklich löschen?')) {
      return;
    }
    
    await tableManagement.deleteTable(tableId);
    setTables(prev => prev.filter(table => table.id !== tableId));
    
    if (selectedTable?.id === tableId) {
      setSelectedTable(null);
    }
  }, [selectedTable, tableManagement]);
  
  const handleDuplicateTable = useCallback(async (table) => {
    const newTable = {
      ...table,
      id: undefined,
      number: Math.max(...tables.map(t => t.number)) + 1,
      x: table.x + 20,
      y: table.y + 20,
      status: 'available',
      currentOrder: null,
      reservation: null
    };
    
    const created = await tableManagement.createTable(newTable);
    setTables([...tables, created]);
    setSelectedTable(created);
  }, [tables, tableManagement]);
  
  // ==========================================================================
  // QR CODE GENERATION
  // ==========================================================================
  const generateQRCode = useCallback(async (table) => {
    const url = `${window.location.origin}/scan?table=${table.number}&tenant=${currentTenant.id}`;
    
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return {
        table,
        url,
        qrCode: qrCodeDataUrl
      };
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      return null;
    }
  }, [currentTenant]);
  
  const handleGenerateAllQRCodes = useCallback(async () => {
    const qrCodes = await Promise.all(
      tables.map(table => generateQRCode(table))
    );
    
    setShowQRModal({
      qrCodes: qrCodes.filter(Boolean),
      mode: 'all'
    });
  }, [tables, generateQRCode]);
  
  const handleGenerateTableQRCode = useCallback(async (table) => {
    const qrCode = await generateQRCode(table);
    
    if (qrCode) {
      setShowQRModal({
        qrCodes: [qrCode],
        mode: 'single'
      });
    }
  }, [generateQRCode]);
  
  // ==========================================================================
  // RESERVATION HANDLING
  // ==========================================================================
  const handleCreateReservation = useCallback(async (tableId, reservation) => {
    await tableManagement.createReservation(tableId, reservation);
    
    // Update table status if reservation is for today
    const now = new Date();
    const reservationStart = new Date(reservation.date + ' ' + reservation.time);
    const reservationEnd = addMinutes(reservationStart, reservation.duration || 120);
    
    if (isWithinInterval(now, { start: reservationStart, end: reservationEnd })) {
      await handleUpdateTable(tableId, { status: 'reserved', reservation });
    }
  }, [tableManagement, handleUpdateTable]);
  
  const handleCancelReservation = useCallback(async (tableId, reservationId) => {
    await tableManagement.cancelReservation(tableId, reservationId);
    
    // Update table status if it was reserved
    const table = tables.find(t => t.id === tableId);
    if (table?.status === 'reserved') {
      await handleUpdateTable(tableId, { status: 'available', reservation: null });
    }
  }, [tables, tableManagement, handleUpdateTable]);
  
  // ==========================================================================
  // FILTERS
  // ==========================================================================
  const filteredTables = tables.filter(table => {
    if (selectedArea !== 'all' && table.area !== selectedArea) {
      return false;
    }
    
    if (!showOccupied && table.status === 'occupied') {
      return false;
    }
    
    if (!showReservations && table.status === 'reserved') {
      return false;
    }
    
    return true;
  });
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <p>Lade Tischplan...</p>
      </div>
    );
  }
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.tableManagement}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>Tischverwaltung</h1>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <Grid3x3 size={16} />
                <span>{stats.total} Tische</span>
              </div>
              <div className={styles.stat}>
                <CheckCircle size={16} color="#10b981" />
                <span>{stats.available} Frei</span>
              </div>
              <div className={styles.stat}>
                <Users size={16} color="#3b82f6" />
                <span>{stats.occupied} Besetzt</span>
              </div>
              <div className={styles.stat}>
                <Calendar size={16} color="#f59e0b" />
                <span>{stats.reserved} Reserviert</span>
              </div>
              <div className={styles.stat}>
                <div className={styles.occupancyRate}>
                  <span>{stats.occupancyRate}%</span>
                  <span className={styles.occupancyLabel}>Auslastung</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.headerRight}>
            {editMode && (
              <button
                className={`${styles.button} ${styles.primary}`}
                onClick={handleAddTable}
              >
                <Plus size={20} />
                Tisch hinzufügen
              </button>
            )}
            
            <button
              className={`${styles.button} ${styles.secondary}`}
              onClick={handleGenerateAllQRCodes}
            >
              <QrCode size={20} />
              QR-Codes generieren
            </button>
            
            <button
              className={`${styles.button} ${editMode ? styles.danger : styles.secondary}`}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? <Save size={20} /> : <Edit2 size={20} />}
              {editMode ? 'Fertig' : 'Bearbeiten'}
            </button>
          </div>
        </div>
        
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            {/* Area Filter */}
            <select
              className={styles.select}
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="all">Alle Bereiche</option>
              {AREAS.map(area => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            
            {/* View Toggles */}
            <button
              className={`${styles.toggleButton} ${showOccupied ? styles.active : ''}`}
              onClick={() => setShowOccupied(!showOccupied)}
            >
              {showOccupied ? <Eye size={16} /> : <EyeOff size={16} />}
              Besetzte
            </button>
            
            <button
              className={`${styles.toggleButton} ${showReservations ? styles.active : ''}`}
              onClick={() => setShowReservations(!showReservations)}
            >
              {showReservations ? <Eye size={16} /> : <EyeOff size={16} />}
              Reservierte
            </button>
            
            <button
              className={`${styles.toggleButton} ${showGrid ? styles.active : ''}`}
              onClick={() => setShowGrid(!showGrid)}
              disabled={!editMode}
            >
              <Grid3x3 size={16} />
              Raster
            </button>
          </div>
          
          <div className={styles.toolbarRight}>
            {/* Zoom Controls */}
            <div className={styles.zoomControls}>
              <button
                className={styles.zoomButton}
                onClick={() => setZoom(Math.max(MIN_ZOOM, zoom - 0.1))}
                disabled={zoom <= MIN_ZOOM}
              >
                -
              </button>
              <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
              <button
                className={styles.zoomButton}
                onClick={() => setZoom(Math.min(MAX_ZOOM, zoom + 0.1))}
                disabled={zoom >= MAX_ZOOM}
              >
                +
              </button>
              <button
                className={styles.zoomButton}
                onClick={() => setZoom(1)}
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className={styles.content}>
          {/* Floor Plan */}
          <div className={styles.floorPlanContainer} ref={floorPlanRef}>
            <FloorPlan
              tables={filteredTables}
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
              onUpdateTable={handleUpdateTable}
              zoom={zoom}
              showGrid={showGrid && editMode}
            />
          </div>
          
          {/* Sidebar */}
          {selectedTable && (
            <div className={styles.sidebar}>
              <div className={styles.sidebarHeader}>
                <h2>Tisch {selectedTable.number}</h2>
                <button
                  className={styles.closeButton}
                  onClick={() => setSelectedTable(null)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className={styles.sidebarContent}>
                {/* Table Info */}
                <div className={styles.section}>
                  <h3>Informationen</h3>
                  
                  <div className={styles.field}>
                    <label>Nummer</label>
                    <input
                      type="number"
                      value={selectedTable.number}
                      onChange={(e) => handleUpdateTable(selectedTable.id, { 
                        number: parseInt(e.target.value) 
                      })}
                      disabled={!editMode}
                    />
                  </div>
                  
                  <div className={styles.field}>
                    <label>Typ</label>
                    <select
                      value={selectedTable.type}
                      onChange={(e) => handleUpdateTable(selectedTable.id, { 
                        type: e.target.value 
                      })}
                      disabled={!editMode}
                    >
                      {Object.entries(TABLE_TYPES).map(([key, type]) => (
                        <option key={key} value={key}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.field}>
                    <label>Bereich</label>
                    <select
                      value={selectedTable.area}
                      onChange={(e) => handleUpdateTable(selectedTable.id, { 
                        area: e.target.value 
                      })}
                      disabled={!editMode}
                    >
                      {AREAS.map(area => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.field}>
                    <label>Status</label>
                    <select
                      value={selectedTable.status}
                      onChange={(e) => handleUpdateTable(selectedTable.id, { 
                        status: e.target.value 
                      })}
                    >
                      {Object.entries(TABLE_STATUSES).map(([key, status]) => (
                        <option key={key} value={key}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Current Order */}
                {selectedTable.currentOrder && (
                  <div className={styles.section}>
                    <h3>Aktuelle Bestellung</h3>
                    <div className={styles.orderInfo}>
                      <p>Bestellung #{selectedTable.currentOrder.orderNumber}</p>
                      <p>Gäste: {selectedTable.currentOrder.guests}</p>
                      <p>Seit: {format(new Date(selectedTable.currentOrder.startTime), 'HH:mm', { locale: de })}</p>
                      <p>Dauer: {differenceInMinutes(new Date(), new Date(selectedTable.currentOrder.startTime))} Min</p>
                    </div>
                  </div>
                )}
                
                {/* Reservation */}
                {selectedTable.reservation && (
                  <div className={styles.section}>
                    <h3>Reservierung</h3>
                    <div className={styles.reservationInfo}>
                      <p>{selectedTable.reservation.customerName}</p>
                      <p>{selectedTable.reservation.guests} Personen</p>
                      <p>{format(new Date(selectedTable.reservation.date), 'dd.MM.yyyy', { locale: de })}</p>
                      <p>{selectedTable.reservation.time}</p>
                    </div>
                    <button
                      className={`${styles.button} ${styles.danger} ${styles.small}`}
                      onClick={() => handleCancelReservation(selectedTable.id, selectedTable.reservation.id)}
                    >
                      Stornieren
                    </button>
                  </div>
                )}
                
                {/* Actions */}
                <div className={styles.section}>
                  <h3>Aktionen</h3>
                  <div className={styles.actions}>
                    <button
                      className={`${styles.button} ${styles.secondary} ${styles.small}`}
                      onClick={() => handleGenerateTableQRCode(selectedTable)}
                    >
                      <QrCode size={16} />
                      QR-Code
                    </button>
                    
                    <button
                      className={`${styles.button} ${styles.secondary} ${styles.small}`}
                      onClick={() => {
                        setSelectedReservation(selectedTable);
                        setShowReservationModal(true);
                      }}
                    >
                      <Calendar size={16} />
                      Reservieren
                    </button>
                    
                    {editMode && (
                      <>
                        <button
                          className={`${styles.button} ${styles.secondary} ${styles.small}`}
                          onClick={() => handleDuplicateTable(selectedTable)}
                        >
                          <Copy size={16} />
                          Duplizieren
                        </button>
                        
                        <button
                          className={`${styles.button} ${styles.danger} ${styles.small}`}
                          onClick={() => handleDeleteTable(selectedTable.id)}
                        >
                          <Trash2 size={16} />
                          Löschen
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* QR Code Modal */}
        {showQRModal && (
          <QRCodeModal
            qrCodes={showQRModal.qrCodes}
            onClose={() => setShowQRModal(false)}
          />
        )}
        
        {/* Reservation Modal */}
        {showReservationModal && (
          <ReservationModal
            table={selectedReservation}
            onConfirm={(reservation) => {
              handleCreateReservation(selectedReservation.id, reservation);
              setShowReservationModal(false);
              setSelectedReservation(null);
            }}
            onClose={() => {
              setShowReservationModal(false);
              setSelectedReservation(null);
            }}
          />
        )}
        
        {/* Offline Indicator */}
        {!isOnline && (
          <div className={styles.offlineIndicator}>
            <AlertCircle size={16} />
            <span>Offline - Änderungen werden synchronisiert</span>
          </div>
        )}
      </div>
    </DndProvider>
  );
}