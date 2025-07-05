/**
 * EATECH Order Detail Modal
 * Detailed view of individual orders
 * File Path: /apps/admin/src/components/Modals/OrderDetailModal.jsx
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  X, User, Phone, Mail, MapPin, 
  Clock, Calendar, Hash, MessageSquare,
  CreditCard, DollarSign, Printer, 
  CheckCircle, XCircle, ChefHat, Truck
} from 'lucide-react';
import { Modal, Button, Badge, Timeline, Alert } from '@eatech/ui';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Styled Components
const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
`;

const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme?.colors?.backgroundTertiary || '#f3f4f6'};
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.div`
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InfoCard = styled.div`
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  border-radius: 8px;
  padding: 16px;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  min-width: 100px;
`;

const InfoValue = styled.span`
  font-size: 14px;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  font-weight: 500;
  flex: 1;
`;

const ItemsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const ItemRow = styled.tr`
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  
  &:last-child {
    border-bottom: none;
  }
`;

const ItemCell = styled.td`
  padding: 12px 0;
  font-size: 14px;
`;

const ItemName = styled.div`
  font-weight: 500;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  margin-bottom: 4px;
`;

const ItemOptions = styled.div`
  font-size: 12px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const ItemQuantity = styled.div`
  font-weight: 500;
  color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
`;

const ItemPrice = styled.div`
  text-align: right;
  font-weight: 500;
`;

const TotalSection = styled.div`
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  
  &:last-child {
    margin-bottom: 0;
    padding-top: 8px;
    border-top: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
    font-size: 16px;
    font-weight: 600;
    color: ${props => props.theme?.colors?.text || '#1f2937'};
  }
`;

const NotesSection = styled.div`
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  border-radius: 8px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
`;

const StatusHistory = styled.div`
  margin-top: 16px;
`;

const ModalFooter = styled.div`
  padding: 20px 24px;
  border-top: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

// Component
const OrderDetailModal = ({ order, isOpen, onClose, onStatusUpdate }) => {
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!order) return null;

  // Get status color
  const getStatusVariant = (status) => {
    const variants = {
      pending: 'primary',
      preparing: 'warning',
      ready: 'success',
      delivered: 'secondary',
      cancelled: 'danger'
    };
    return variants[status] || 'secondary';
  };

  // Get status icon
  const getStatusIcon = (status) => {
    const icons = {
      pending: <Clock size={16} />,
      preparing: <ChefHat size={16} />,
      ready: <CheckCircle size={16} />,
      delivered: <Truck size={16} />,
      cancelled: <XCircle size={16} />
    };
    return icons[status] || null;
  };

  // Get payment method label
  const getPaymentMethodLabel = (method) => {
    const labels = {
      card: 'Kredit-/Debitkarte',
      twint: 'TWINT',
      cash: 'Barzahlung'
    };
    return labels[method] || method;
  };

  // Calculate item subtotal
  const calculateItemSubtotal = (item) => {
    return item.price * item.quantity;
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true);
    await onStatusUpdate(newStatus);
    setUpdatingStatus(false);
  };

  // Get next status options
  const getNextStatusOptions = () => {
    switch (order.status) {
      case 'pending':
        return ['preparing', 'cancelled'];
      case 'preparing':
        return ['ready', 'cancelled'];
      case 'ready':
        return ['delivered'];
      default:
        return [];
    }
  };

  const nextStatusOptions = getNextStatusOptions();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>
          <Hash size={20} />
          Bestellung {order.orderNumber}
        </ModalTitle>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>
      </ModalHeader>

      <ModalBody>
        <Grid>
          {/* Left Column */}
          <div>
            {/* Customer Information */}
            <Section>
              <SectionTitle>
                <User size={18} />
                Kundeninformationen
              </SectionTitle>
              <InfoCard>
                <InfoRow>
                  <InfoLabel>Name:</InfoLabel>
                  <InfoValue>{order.customer?.name || 'Gast'}</InfoValue>
                </InfoRow>
                {order.customer?.phone && (
                  <InfoRow>
                    <InfoLabel>
                      <Phone size={14} />
                    </InfoLabel>
                    <InfoValue>{order.customer.phone}</InfoValue>
                  </InfoRow>
                )}
                {order.customer?.email && (
                  <InfoRow>
                    <InfoLabel>
                      <Mail size={14} />
                    </InfoLabel>
                    <InfoValue>{order.customer.email}</InfoValue>
                  </InfoRow>
                )}
                {order.tableName && (
                  <InfoRow>
                    <InfoLabel>
                      <MapPin size={14} />
                    </InfoLabel>
                    <InfoValue>{order.tableName}</InfoValue>
                  </InfoRow>
                )}
              </InfoCard>
            </Section>

            {/* Order Details */}
            <Section>
              <SectionTitle>
                <Calendar size={18} />
                Bestelldetails
              </SectionTitle>
              <InfoCard>
                <InfoRow>
                  <InfoLabel>Erstellt:</InfoLabel>
                  <InfoValue>
                    {format(order.createdAt, 'dd.MM.yyyy HH:mm', { locale: de })}
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Status:</InfoLabel>
                  <InfoValue>
                    <Badge variant={getStatusVariant(order.status)}>
                      {getStatusIcon(order.status)}
                      <span style={{ marginLeft: 4 }}>{order.status}</span>
                    </Badge>
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Zahlung:</InfoLabel>
                  <InfoValue>
                    <CreditCard size={14} style={{ marginRight: 4 }} />
                    {getPaymentMethodLabel(order.paymentMethod)}
                  </InfoValue>
                </InfoRow>
                {order.payment?.transactionId && (
                  <InfoRow>
                    <InfoLabel>Transaktion:</InfoLabel>
                    <InfoValue>{order.payment.transactionId}</InfoValue>
                  </InfoRow>
                )}
              </InfoCard>
            </Section>
          </div>

          {/* Right Column */}
          <div>
            {/* Order Items */}
            <Section>
              <SectionTitle>Bestellte Artikel</SectionTitle>
              <ItemsTable>
                <tbody>
                  {order.items.map((item, index) => (
                    <ItemRow key={index}>
                      <ItemCell>
                        <ItemName>{item.name}</ItemName>
                        {item.options && Object.keys(item.options).length > 0 && (
                          <ItemOptions>Mit Extras</ItemOptions>
                        )}
                      </ItemCell>
                      <ItemCell style={{ width: 60, textAlign: 'center' }}>
                        <ItemQuantity>x{item.quantity}</ItemQuantity>
                      </ItemCell>
                      <ItemCell style={{ width: 80, textAlign: 'right' }}>
                        <ItemPrice>
                          CHF {calculateItemSubtotal(item).toFixed(2)}
                        </ItemPrice>
                      </ItemCell>
                    </ItemRow>
                  ))}
                </tbody>
              </ItemsTable>

              <TotalSection>
                <TotalRow>
                  <span>Zwischensumme</span>
                  <span>CHF {order.totals.subtotal.toFixed(2)}</span>
                </TotalRow>
                {order.totals.discount > 0 && (
                  <TotalRow>
                    <span>Rabatt</span>
                    <span style={{ color: '#10b981' }}>
                      -CHF {order.totals.discount.toFixed(2)}
                    </span>
                  </TotalRow>
                )}
                <TotalRow>
                  <span>Gesamt</span>
                  <span>CHF {order.totals.total.toFixed(2)}</span>
                </TotalRow>
              </TotalSection>
            </Section>
          </div>
        </Grid>

        {/* Notes */}
        {order.notes && (
          <Section>
            <SectionTitle>
              <MessageSquare size={18} />
              Anmerkungen
            </SectionTitle>
            <NotesSection>{order.notes}</NotesSection>
          </Section>
        )}

        {/* Status History */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <Section>
            <SectionTitle>
              <Clock size={18} />
              Status-Verlauf
            </SectionTitle>
            <StatusHistory>
              <Timeline>
                {order.statusHistory.map((entry, index) => (
                  <Timeline.Item
                    key={index}
                    icon={getStatusIcon(entry.status)}
                    color={getStatusVariant(entry.status)}
                  >
                    <div>
                      <strong>{entry.status}</strong>
                      {entry.note && <span> - {entry.note}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      {format(entry.timestamp, 'dd.MM.yyyy HH:mm', { locale: de })}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </StatusHistory>
          </Section>
        )}
      </ModalBody>

      <ModalFooter>
        <Button
          variant="outline"
          leftIcon={<Printer size={16} />}
          onClick={() => window.print()}
        >
          Drucken
        </Button>
        
        <ActionButtons>
          {nextStatusOptions.map(status => (
            <Button
              key={status}
              variant={status === 'cancelled' ? 'danger' : 'primary'}
              onClick={() => handleStatusUpdate(status)}
              loading={updatingStatus}
              disabled={updatingStatus}
            >
              {status === 'preparing' && 'In Zubereitung'}
              {status === 'ready' && 'Fertig'}
              {status === 'delivered' && 'Geliefert'}
              {status === 'cancelled' && 'Stornieren'}
            </Button>
          ))}
        </ActionButtons>
      </ModalFooter>
    </Modal>
  );
};

export default OrderDetailModal;