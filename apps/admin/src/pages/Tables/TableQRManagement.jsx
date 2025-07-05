/**
 * EATECH Table QR Management
 * Admin interface for managing table QR codes
 * File Path: /apps/admin/src/pages/Tables/TableQRManagement.jsx
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Plus, Download, Printer, RefreshCw, 
  Eye, Trash2, Edit, QrCode, Users,
  TrendingUp, Clock, MapPin
} from 'lucide-react';
import { 
  Button, Card, Table, Modal, Input, 
  Select, Badge, Empty, Spinner, Alert 
} from '@eatech/ui';
import { useTenant } from '@eatech/core/contexts/TenantContext';
import { useTenantData, useTenantList } from '@eatech/core/hooks/useTenantData';
import QRCodeService from '@eatech/core/services/QRCodeService';

// Styled Components
const PageContainer = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 32px;
`;

const PageTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  margin: 0 0 8px 0;
`;

const PageDescription = styled.p`
  font-size: 16px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  margin: 0;
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const TableGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`;

const TableCard = styled(Card)`
  position: relative;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const QRPreview = styled.div`
  width: 150px;
  height: 150px;
  margin: 16px auto;
  background: #f9fafb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const TableInfo = styled.div`
  text-align: center;
  padding: 16px;
`;

const TableName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const TableStats = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const ModalContent = styled.div`
  padding: 24px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  margin-bottom: 8px;
`;

const QRFullPreview = styled.div`
  text-align: center;
  padding: 24px;
  
  img {
    max-width: 300px;
    width: 100%;
    height: auto;
  }
`;

// Component
const TableQRManagement = () => {
  const { currentTenant } = useTenant();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [stats, setStats] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    tableNumber: '',
    tableName: '',
    capacity: 4,
    area: 'main'
  });

  // Load tables
  const { 
    items: tables, 
    loading, 
    error, 
    addItem, 
    updateItem, 
    removeItem 
  } = useTenantList('tables');

  // Load QR statistics
  useEffect(() => {
    loadStats();
  }, [currentTenant]);

  const loadStats = async () => {
    try {
      const qrStats = await QRCodeService.getQRStats(currentTenant.id, 'week');
      setStats(qrStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Handle add table
  const handleAddTable = async () => {
    try {
      const tableData = {
        ...formData,
        tenantName: currentTenant.name
      };

      const result = await QRCodeService.generateTableQR(
        currentTenant.id, 
        tableData
      );

      await addItem({
        ...result.tableData,
        qrImageUrl: result.qrImageUrl
      });

      setShowAddModal(false);
      setFormData({
        tableNumber: '',
        tableName: '',
        capacity: 4,
        area: 'main'
      });

      // Reload stats
      loadStats();
    } catch (error) {
      console.error('Error adding table:', error);
    }
  };

  // Handle regenerate QR
  const handleRegenerateQR = async (table) => {
    try {
      const result = await QRCodeService.regenerateQR(
        currentTenant.id,
        table.id
      );

      await updateItem(table.id, {
        qrImageUrl: result.qrImageUrl,
        qrUrl: result.qrUrl,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error regenerating QR:', error);
    }
  };

  // Handle bulk generate
  const handleBulkGenerate = async () => {
    setBulkGenerating(true);
    try {
      // Generate for all tables without QR
      const tablesToGenerate = tables.filter(t => !t.qrImageUrl);
      
      const result = await QRCodeService.generateBulkQR(
        currentTenant.id,
        tablesToGenerate
      );

      // Update tables with QR codes
      for (const res of result.results) {
        if (res.success) {
          await updateItem(res.table.id, {
            qrImageUrl: res.qrData.qrImageUrl,
            qrUrl: res.qrData.qrUrl
          });
        }
      }

      // Download PDF
      if (result.pdfUrl) {
        window.open(result.pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Error bulk generating:', error);
    } finally {
      setBulkGenerating(false);
    }
  };

  // Handle print QR
  const handlePrintQR = (table) => {
    if (table.qrImageUrl) {
      // Open print preview
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${table.tableName}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif;
                text-align: center;
              }
              .qr-container {
                max-width: 400px;
                margin: 0 auto;
                padding: 40px;
                border: 2px solid #f3f4f6;
                border-radius: 20px;
              }
              h1 { 
                color: #ff6b6b; 
                margin-bottom: 20px;
              }
              img { 
                width: 300px; 
                height: 300px; 
                margin: 20px 0;
              }
              .info {
                font-size: 24px;
                color: #1f2937;
                margin: 10px 0;
              }
              .instructions {
                font-size: 16px;
                color: #6b7280;
                margin-top: 20px;
              }
            </style>
          </head>
          <body onload="window.print()">
            <div class="qr-container">
              <h1>${currentTenant.name}</h1>
              <img src="${table.qrImageUrl}" alt="QR Code" />
              <div class="info"><strong>${table.tableName}</strong></div>
              <div class="info">Tisch ${table.tableNumber}</div>
              <div class="instructions">QR-Code scannen und bestellen</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spinner size={40} />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>QR-Code Verwaltung</PageTitle>
        <PageDescription>
          Erstellen und verwalten Sie QR-Codes für Ihre Tische
        </PageDescription>
      </PageHeader>

      {/* Statistics */}
      <StatsGrid>
        <Card>
          <Card.Body>
            <Stat
              icon={<QrCode />}
              label="Aktive Tische"
              value={tables.length}
              color="#ff6b6b"
            />
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body>
            <Stat
              icon={<TrendingUp />}
              label="Scans diese Woche"
              value={stats?.totalScans || 0}
              color="#10b981"
            />
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body>
            <Stat
              icon={<Users />}
              label="Durchschn. pro Tag"
              value={Math.round((stats?.totalScans || 0) / 7)}
              color="#3b82f6"
            />
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body>
            <Stat
              icon={<Clock />}
              label="Letzte Aktivität"
              value="Vor 5 Min."
              color="#f59e0b"
            />
          </Card.Body>
        </Card>
      </StatsGrid>

      {/* Actions */}
      <ActionBar>
        <ActionGroup>
          <Button
            variant="primary"
            leftIcon={<Plus />}
            onClick={() => setShowAddModal(true)}
          >
            Tisch hinzufügen
          </Button>
          
          <Button
            variant="outline"
            leftIcon={<Download />}
            onClick={handleBulkGenerate}
            loading={bulkGenerating}
          >
            Alle QR-Codes drucken
          </Button>
        </ActionGroup>
        
        <ActionGroup>
          <Select
            value="week"
            onChange={(e) => loadStats(e.target.value)}
          >
            <option value="day">Heute</option>
            <option value="week">Diese Woche</option>
            <option value="month">Dieser Monat</option>
          </Select>
        </ActionGroup>
      </ActionBar>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <Card>
          <Card.Body>
            <Empty
              icon={<QrCode size={48} />}
              title="Keine Tische vorhanden"
              description="Fügen Sie Ihren ersten Tisch hinzu, um QR-Codes zu generieren"
              action={
                <Button
                  variant="primary"
                  leftIcon={<Plus />}
                  onClick={() => setShowAddModal(true)}
                >
                  Ersten Tisch hinzufügen
                </Button>
              }
            />
          </Card.Body>
        </Card>
      ) : (
        <TableGrid>
          {tables.map(table => (
            <TableCard
              key={table.id}
              hoverable
              onClick={() => {
                setSelectedTable(table);
                setShowQRModal(true);
              }}
            >
              <Card.Body>
                {table.qrImageUrl ? (
                  <QRPreview>
                    <img src={table.qrImageUrl} alt="QR Code" />
                  </QRPreview>
                ) : (
                  <QRPreview>
                    <QrCode size={60} color="#e5e7eb" />
                  </QRPreview>
                )}
                
                <TableInfo>
                  <TableName>{table.tableName}</TableName>
                  <Badge variant="secondary">Tisch {table.tableNumber}</Badge>
                  
                  <TableStats>
                    <span>
                      <Users size={14} style={{ marginRight: 4 }} />
                      {table.capacity} Plätze
                    </span>
                    <span>
                      <MapPin size={14} style={{ marginRight: 4 }} />
                      {table.area}
                    </span>
                  </TableStats>
                  
                  <div style={{ marginTop: 16 }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<Printer />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintQR(table);
                      }}
                    >
                      Drucken
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<RefreshCw />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerateQR(table);
                      }}
                    >
                      Neu generieren
                    </Button>
                  </div>
                </TableInfo>
              </Card.Body>
            </TableCard>
          ))}
        </TableGrid>
      )}

      {/* Add Table Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Neuen Tisch hinzufügen"
      >
        <ModalContent>
          <FormGroup>
            <Label>Tischnummer *</Label>
            <Input
              type="text"
              value={formData.tableNumber}
              onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
              placeholder="z.B. 12"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Tischname</Label>
            <Input
              type="text"
              value={formData.tableName}
              onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
              placeholder="z.B. Fensterplatz"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Anzahl Plätze</Label>
            <Select
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
            >
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'Platz' : 'Plätze'}</option>
              ))}
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label>Bereich</Label>
            <Select
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            >
              <option value="main">Hauptbereich</option>
              <option value="terrace">Terrasse</option>
              <option value="garden">Garten</option>
              <option value="vip">VIP</option>
              <option value="bar">Bar</option>
            </Select>
          </FormGroup>
          
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              onClick={() => setShowAddModal(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleAddTable}
              disabled={!formData.tableNumber}
            >
              Tisch erstellen
            </Button>
          </div>
        </ModalContent>
      </Modal>

      {/* QR Detail Modal */}
      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title={selectedTable?.tableName}
        size="lg"
      >
        {selectedTable && (
          <ModalContent>
            <QRFullPreview>
              {selectedTable.qrImageUrl && (
                <img src={selectedTable.qrImageUrl} alt="QR Code" />
              )}
              
              <h3>{selectedTable.tableName}</h3>
              <p>Tisch {selectedTable.tableNumber}</p>
              
              <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Button
                  variant="primary"
                  leftIcon={<Printer />}
                  onClick={() => handlePrintQR(selectedTable)}
                >
                  Drucken
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<Download />}
                  onClick={() => {
                    // Download QR code
                    const link = document.createElement('a');
                    link.href = selectedTable.qrImageUrl;
                    link.download = `qr-${selectedTable.tableNumber}.png`;
                    link.click();
                  }}
                >
                  Herunterladen
                </Button>
              </div>
            </QRFullPreview>
            
            <Alert variant="info" style={{ marginTop: 24 }}>
              <strong>QR-Code URL:</strong><br />
              <code style={{ fontSize: 12 }}>{selectedTable.qrUrl}</code>
            </Alert>
          </ModalContent>
        )}
      </Modal>
    </PageContainer>
  );
};

// Stat Component
const Stat = ({ icon, label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{
      width: 48,
      height: 48,
      borderRadius: 12,
      background: `${color}20`,
      color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 14, color: '#6b7280' }}>{label}</div>
    </div>
  </div>
);

export default TableQRManagement;