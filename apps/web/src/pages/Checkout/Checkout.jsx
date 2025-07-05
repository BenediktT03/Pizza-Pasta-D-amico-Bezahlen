/**
 * EATECH Checkout Process
 * Customer information and payment page
 * File Path: /apps/web/src/pages/Checkout/Checkout.jsx
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CreditCard, Smartphone, Banknote,
  User, Phone, Mail, MessageSquare, Clock,
  Check, AlertCircle, Loader2
} from 'lucide-react';
import { 
  Button, Card, Input, Radio, Alert,
  Badge, Modal
} from '@eatech/ui';
import { useCart } from '../../contexts/CartContext';
import { useSessionStorage } from '../../hooks/useSessionStorage';
import { useTenantData } from '@eatech/core/hooks/useTenantData';
import PaymentService from '../../services/PaymentService';
import OrderService from '../../services/OrderService';

// Styled Components
const CheckoutContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  padding-bottom: 100px;
`;

const Header = styled.div`
  background: white;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  padding: 16px 20px;
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const BackButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
    color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
  }
`;

const PageTitle = styled.h1`
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  flex: 1;
`;

const Content = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  
  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const MainColumn = styled.div``;

const SideColumn = styled.div`
  @media (min-width: 768px) {
    position: sticky;
    top: 100px;
    height: fit-content;
  }
`;

const Section = styled(Card)`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  margin-bottom: 8px;
  
  span {
    color: ${props => props.theme?.colors?.danger || '#ef4444'};
  }
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid ${props => props.checked ? props.theme?.colors?.primary || '#ff6b6b' : props.theme?.colors?.border || '#e5e7eb'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.checked ? props.theme?.colors?.primaryLight || '#fef2f2' : 'white'};
  
  &:hover {
    border-color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
  }
  
  input {
    margin-right: 12px;
  }
`;

const RadioLabel = styled.div`
  flex: 1;
`;

const RadioTitle = styled.div`
  font-weight: 500;
  margin-bottom: 4px;
`;

const RadioDescription = styled.div`
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const RadioIcon = styled.div`
  margin-left: auto;
  color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
`;

const OrderSummary = styled(Card)`
  position: sticky;
  top: 100px;
`;

const SummaryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
  font-size: 14px;
`;

const SummaryItemName = styled.div`
  flex: 1;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
`;

const SummaryItemQuantity = styled.span`
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  margin-left: 8px;
`;

const SummaryItemPrice = styled.div`
  font-weight: 500;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  margin: 16px 0;
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
`;

const TotalPrice = styled.div`
  color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme?.colors?.danger || '#ef4444'};
  font-size: 14px;
  margin-top: 4px;
`;

const SuccessModal = styled(Modal)`
  text-align: center;
`;

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: 50%;
  background: ${props => props.theme?.colors?.successLight || '#d1fae5'};
  color: ${props => props.theme?.colors?.success || '#10b981'};
  display: flex;
  align-items: center;
  justify-content: center;
`;

// Component
const Checkout = () => {
  const navigate = useNavigate();
  const [sessionData] = useSessionStorage('eatech_session', null);
  const { 
    cartItems, 
    getCartSummary, 
    formatPrice, 
    clearCart,
    notes 
  } = useCart();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    paymentMethod: 'card',
    additionalNotes: notes || ''
  });
  
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);

  // Load tenant info
  const tenantId = sessionData?.tenantId;
  const { data: tenantInfo } = useTenantData(
    tenantId ? `public/${tenantId}/info` : null,
    { realtime: false }
  );

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0 && !orderSuccess) {
      navigate('/cart');
    }
  }, [cartItems, navigate, orderSuccess]);

  // Get cart summary
  const cartSummary = getCartSummary();

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefonnummer ist erforderlich';
    } else if (!/^(\+41|0)[0-9]{9,10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Ungültige Telefonnummer';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }
    
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Zahlungsmethode ist erforderlich';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle order submission
  const handleSubmitOrder = async () => {
    if (!validateForm()) return;
    
    setProcessing(true);
    
    try {
      // Create order data
      const orderData = {
        tenantId,
        sessionId: sessionData?.sessionId,
        tableId: sessionData?.tableId,
        tableName: sessionData?.tableName,
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        },
        items: cartItems.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          options: item.options
        })),
        totals: {
          subtotal: cartSummary.subtotal,
          discount: cartSummary.discount,
          total: cartSummary.total
        },
        paymentMethod: formData.paymentMethod,
        notes: formData.additionalNotes,
        status: 'pending',
        createdAt: Date.now()
      };
      
      // Process payment based on method
      let paymentResult;
      
      if (formData.paymentMethod === 'card') {
        // Process card payment
        paymentResult = await PaymentService.processCardPayment({
          amount: cartSummary.total,
          currency: 'CHF',
          description: `Bestellung bei ${tenantInfo?.name}`,
          customer: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone
          }
        });
      } else if (formData.paymentMethod === 'twint') {
        // Process TWINT payment
        paymentResult = await PaymentService.processTwintPayment({
          amount: cartSummary.total,
          phone: formData.phone
        });
      } else {
        // Cash payment - no processing needed
        paymentResult = { success: true, method: 'cash' };
      }
      
      if (paymentResult.success) {
        // Create order in database
        const order = await OrderService.createOrder({
          ...orderData,
          payment: {
            method: formData.paymentMethod,
            status: formData.paymentMethod === 'cash' ? 'pending' : 'paid',
            transactionId: paymentResult.transactionId
          }
        });
        
        // Clear cart
        clearCart();
        
        // Show success
        setOrderId(order.id);
        setOrderSuccess(true);
      } else {
        throw new Error(paymentResult.error || 'Zahlung fehlgeschlagen');
      }
      
    } catch (error) {
      console.error('Order submission error:', error);
      setErrors({ submit: error.message || 'Bestellung konnte nicht abgeschlossen werden' });
    } finally {
      setProcessing(false);
    }
  };

  // Handle success modal close
  const handleSuccessClose = () => {
    navigate('/order-status/' + orderId);
  };

  return (
    <CheckoutContainer>
      <Header>
        <BackButton onClick={() => navigate('/cart')}>
          <ArrowLeft size={20} />
        </BackButton>
        <PageTitle>Kasse</PageTitle>
      </Header>

      <Content>
        <Grid>
          <MainColumn>
            {/* Customer Information */}
            <Section>
              <Card.Body>
                <SectionTitle>
                  <User size={20} />
                  Ihre Informationen
                </SectionTitle>
                
                <FormGroup>
                  <Label>Name <span>*</span></Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Max Mustermann"
                    error={errors.name}
                  />
                  {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
                </FormGroup>
                
                <FormGroup>
                  <Label>Telefonnummer <span>*</span></Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+41 79 123 45 67"
                    leftIcon={<Phone size={18} />}
                    error={errors.phone}
                  />
                  {errors.phone && <ErrorMessage>{errors.phone}</ErrorMessage>}
                </FormGroup>
                
                <FormGroup>
                  <Label>E-Mail (optional)</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="max@beispiel.ch"
                    leftIcon={<Mail size={18} />}
                    error={errors.email}
                  />
                  {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
                </FormGroup>
              </Card.Body>
            </Section>

            {/* Payment Method */}
            <Section>
              <Card.Body>
                <SectionTitle>
                  <CreditCard size={20} />
                  Zahlungsmethode
                </SectionTitle>
                
                <RadioGroup>
                  <RadioOption checked={formData.paymentMethod === 'card'}>
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={formData.paymentMethod === 'card'}
                      onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    />
                    <RadioLabel>
                      <RadioTitle>Kredit-/Debitkarte</RadioTitle>
                      <RadioDescription>Visa, Mastercard, etc.</RadioDescription>
                    </RadioLabel>
                    <RadioIcon>
                      <CreditCard size={24} />
                    </RadioIcon>
                  </RadioOption>
                  
                  <RadioOption checked={formData.paymentMethod === 'twint'}>
                    <input
                      type="radio"
                      name="payment"
                      value="twint"
                      checked={formData.paymentMethod === 'twint'}
                      onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    />
                    <RadioLabel>
                      <RadioTitle>TWINT</RadioTitle>
                      <RadioDescription>Bezahlen mit Ihrem Smartphone</RadioDescription>
                    </RadioLabel>
                    <RadioIcon>
                      <Smartphone size={24} />
                    </RadioIcon>
                  </RadioOption>
                  
                  <RadioOption checked={formData.paymentMethod === 'cash'}>
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={formData.paymentMethod === 'cash'}
                      onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    />
                    <RadioLabel>
                      <RadioTitle>Barzahlung</RadioTitle>
                      <RadioDescription>Bezahlen Sie beim Service</RadioDescription>
                    </RadioLabel>
                    <RadioIcon>
                      <Banknote size={24} />
                    </RadioIcon>
                  </RadioOption>
                </RadioGroup>
                
                {errors.paymentMethod && <ErrorMessage>{errors.paymentMethod}</ErrorMessage>}
              </Card.Body>
            </Section>

            {/* Additional Notes */}
            <Section>
              <Card.Body>
                <SectionTitle>
                  <MessageSquare size={20} />
                  Zusätzliche Hinweise
                </SectionTitle>
                
                <textarea
                  value={formData.additionalNotes}
                  onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                  placeholder="Spezielle Anweisungen für Ihre Bestellung..."
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 14,
                    resize: 'vertical',
                    minHeight: 80,
                    fontFamily: 'inherit'
                  }}
                />
              </Card.Body>
            </Section>

            {errors.submit && (
              <Alert variant="error" style={{ marginBottom: 20 }}>
                {errors.submit}
              </Alert>
            )}
          </MainColumn>

          <SideColumn>
            {/* Order Summary */}
            <OrderSummary>
              <Card.Body>
                <SectionTitle>Bestellübersicht</SectionTitle>
                
                {cartItems.map(item => (
                  <SummaryItem key={item.cartId}>
                    <SummaryItemName>
                      {item.name}
                      <SummaryItemQuantity>x{item.quantity}</SummaryItemQuantity>
                    </SummaryItemName>
                    <SummaryItemPrice>
                      {formatPrice(item.price * item.quantity)}
                    </SummaryItemPrice>
                  </SummaryItem>
                ))}
                
                <Divider />
                
                <SummaryItem>
                  <SummaryItemName>Zwischensumme</SummaryItemName>
                  <SummaryItemPrice>{formatPrice(cartSummary.subtotal)}</SummaryItemPrice>
                </SummaryItem>
                
                {cartSummary.discount > 0 && (
                  <SummaryItem>
                    <SummaryItemName style={{ color: '#10b981' }}>Rabatt</SummaryItemName>
                    <SummaryItemPrice style={{ color: '#10b981' }}>
                      -{formatPrice(cartSummary.discount)}
                    </SummaryItemPrice>
                  </SummaryItem>
                )}
                
                <Divider />
                
                <TotalRow>
                  <div>Gesamt</div>
                  <TotalPrice>{formatPrice(cartSummary.total)}</TotalPrice>
                </TotalRow>
                
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280', fontSize: 14 }}>
                  <Clock size={16} />
                  <span>Geschätzte Zeit: 20-30 Min.</span>
                </div>
                
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={handleSubmitOrder}
                  disabled={processing}
                  loading={processing}
                  style={{ marginTop: 24 }}
                >
                  {processing ? 'Wird verarbeitet...' : 'Bestellung abschließen'}
                </Button>
              </Card.Body>
            </OrderSummary>
          </SideColumn>
        </Grid>
      </Content>

      {/* Success Modal */}
      <Modal
        isOpen={orderSuccess}
        onClose={handleSuccessClose}
        title=""
        size="sm"
      >
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <SuccessIcon>
            <Check size={40} />
          </SuccessIcon>
          
          <h2 style={{ marginBottom: 8 }}>Bestellung erfolgreich!</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            Ihre Bestellung wurde erfolgreich aufgegeben.
            {sessionData?.tableName && ` Wir liefern an ${sessionData.tableName}.`}
          </p>
          
          <Badge variant="primary" style={{ marginBottom: 24 }}>
            Bestellnummer: {orderId}
          </Badge>
          
          <Button
            variant="primary"
            fullWidth
            onClick={handleSuccessClose}
          >
            Bestellstatus anzeigen
          </Button>
        </div>
      </Modal>
    </CheckoutContainer>
  );
};

export default Checkout;