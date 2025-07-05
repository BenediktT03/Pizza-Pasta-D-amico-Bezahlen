/**
 * EATECH Shopping Cart
 * Cart review and management page
 * File Path: /apps/web/src/pages/Cart/Cart.jsx
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, Plus, Minus, 
  ShoppingBag, Tag, MessageSquare,
  Clock, Euro
} from 'lucide-react';
import { 
  Button, Card, Empty, Input, Alert,
  Modal, Badge
} from '@eatech/ui';
import { useCart } from '../../contexts/CartContext';
import { useSessionStorage } from '../../hooks/useSessionStorage';

// Styled Components
const CartContainer = styled.div`
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

const ItemCount = styled.span`
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const Content = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const CartItems = styled.div`
  margin-bottom: 24px;
`;

const CartItem = styled(Card)`
  margin-bottom: 12px;
`;

const ItemHeader = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
`;

const ItemImage = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 8px;
  background: ${props => props.src ? `url(${props.src})` : '#f3f4f6'};
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
`;

const ItemInfo = styled.div`
  flex: 1;
`;

const ItemName = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
`;

const ItemOptions = styled.div`
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  margin-bottom: 8px;
`;

const ItemPrice = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
`;

const ItemActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
`;

const QuantitySelector = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const QuantityButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    border-color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
    color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const QuantityDisplay = styled.div`
  font-size: 16px;
  font-weight: 600;
  min-width: 30px;
  text-align: center;
`;

const RemoveButton = styled.button`
  padding: 8px 16px;
  border: none;
  background: none;
  color: ${props => props.theme?.colors?.danger || '#ef4444'};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.theme?.colors?.dangerDark || '#dc2626'};
  }
`;

const PromoSection = styled(Card)`
  margin-bottom: 24px;
`;

const PromoInput = styled.div`
  display: flex;
  gap: 12px;
`;

const NotesSection = styled(Card)`
  margin-bottom: 24px;
`;

const NotesTextarea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
  }
`;

const OrderSummary = styled(Card)`
  position: sticky;
  bottom: 20px;
  margin-top: 24px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SummaryLabel = styled.span`
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const SummaryValue = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
`;

const TotalRow = styled(SummaryRow)`
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  margin-top: 12px;
  
  ${SummaryLabel} {
    font-size: 16px;
    font-weight: 600;
    color: ${props => props.theme?.colors?.text || '#1f2937'};
  }
  
  ${SummaryValue} {
    font-size: 20px;
    font-weight: 700;
    color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
  }
`;

const EstimatedTime = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const EmptyCartContainer = styled.div`
  padding: 80px 20px;
  text-align: center;
`;

// Component
const Cart = () => {
  const navigate = useNavigate();
  const [sessionData] = useSessionStorage('eatech_session', null);
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  
  const {
    cartItems,
    notes,
    setNotes,
    updateQuantity,
    removeItem,
    clearCart,
    applyPromoCode,
    removePromoCode,
    getCartSummary,
    formatPrice
  } = useCart();

  const cartSummary = getCartSummary();

  // Calculate estimated time
  const estimatedTime = Math.max(
    20,
    cartItems.reduce((max, item) => Math.max(max, item.prepTime || 20), 0)
  );

  // Handle promo code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    
    setApplyingPromo(true);
    try {
      const success = await applyPromoCode(promoCode);
      if (success) {
        setPromoCode('');
      }
    } finally {
      setApplyingPromo(false);
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    navigate('/checkout');
  };

  // Empty cart
  if (cartItems.length === 0) {
    return (
      <CartContainer>
        <Header>
          <BackButton onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </BackButton>
          <PageTitle>Warenkorb</PageTitle>
        </Header>
        
        <EmptyCartContainer>
          <Empty
            icon={<ShoppingBag size={48} />}
            title="Ihr Warenkorb ist leer"
            description="Fügen Sie Artikel aus der Speisekarte hinzu"
            action={
              <Button
                variant="primary"
                onClick={() => navigate('/menu')}
              >
                Zur Speisekarte
              </Button>
            }
          />
        </EmptyCartContainer>
      </CartContainer>
    );
  }

  // Format options display
  const formatOptions = (item) => {
    if (!item.options || Object.keys(item.options).length === 0) return null;
    
    const optionsList = [];
    Object.entries(item.options).forEach(([groupId, optionIds]) => {
      const group = item.options?.find?.(g => g.id === groupId);
      if (group) {
        const optionIdArray = Array.isArray(optionIds) ? optionIds : [optionIds];
        optionIdArray.forEach(optionId => {
          const option = group.items?.find(opt => opt.id === optionId);
          if (option) {
            optionsList.push(option.name);
          }
        });
      }
    });
    
    return optionsList.join(', ');
  };

  return (
    <CartContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </BackButton>
        <PageTitle>Warenkorb</PageTitle>
        <ItemCount>{cartSummary.itemCount} Artikel</ItemCount>
      </Header>

      <Content>
        {/* Cart Items */}
        <CartItems>
          {cartItems.map(item => (
            <CartItem key={item.cartId}>
              <Card.Body>
                <ItemHeader>
                  <ItemImage src={item.imageUrl} />
                  <ItemInfo>
                    <ItemName>{item.name}</ItemName>
                    {item.options && (
                      <ItemOptions>{formatOptions(item)}</ItemOptions>
                    )}
                    <ItemPrice>{formatPrice(item.price)}</ItemPrice>
                  </ItemInfo>
                </ItemHeader>
                
                <ItemActions>
                  <QuantitySelector>
                    <QuantityButton
                      onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus size={16} />
                    </QuantityButton>
                    <QuantityDisplay>{item.quantity}</QuantityDisplay>
                    <QuantityButton
                      onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                    >
                      <Plus size={16} />
                    </QuantityButton>
                  </QuantitySelector>
                  
                  <RemoveButton onClick={() => removeItem(item.cartId)}>
                    <Trash2 size={16} />
                    Entfernen
                  </RemoveButton>
                </ItemActions>
              </Card.Body>
            </CartItem>
          ))}
        </CartItems>

        {/* Promo Code */}
        <PromoSection>
          <Card.Body>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>
              <Tag size={18} style={{ marginRight: 8 }} />
              Gutscheincode
            </h3>
            
            {cartSummary.promoCode ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Badge variant="success">{cartSummary.promoCode.code}</Badge>
                  <span style={{ marginLeft: 8, color: '#10b981' }}>
                    {cartSummary.promoCode.type === 'percentage' 
                      ? `-${cartSummary.promoCode.value}%`
                      : formatPrice(-cartSummary.promoCode.value)
                    }
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removePromoCode}
                >
                  Entfernen
                </Button>
              </div>
            ) : (
              <PromoInput>
                <Input
                  placeholder="Code eingeben"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleApplyPromo()}
                />
                <Button
                  variant="outline"
                  onClick={handleApplyPromo}
                  loading={applyingPromo}
                >
                  Anwenden
                </Button>
              </PromoInput>
            )}
          </Card.Body>
        </PromoSection>

        {/* Notes */}
        <NotesSection>
          <Card.Body>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>
              <MessageSquare size={18} style={{ marginRight: 8 }} />
              Anmerkungen zur Bestellung
            </h3>
            <NotesTextarea
              placeholder="Besondere Wünsche oder Hinweise..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Card.Body>
        </NotesSection>

        {/* Order Summary */}
        <OrderSummary>
          <Card.Body>
            <EstimatedTime>
              <Clock size={16} />
              Geschätzte Zubereitungszeit: {estimatedTime} Min.
            </EstimatedTime>
            
            <SummaryRow>
              <SummaryLabel>Zwischensumme</SummaryLabel>
              <SummaryValue>{formatPrice(cartSummary.subtotal)}</SummaryValue>
            </SummaryRow>
            
            {cartSummary.discount > 0 && (
              <SummaryRow>
                <SummaryLabel>Rabatt</SummaryLabel>
                <SummaryValue style={{ color: '#10b981' }}>
                  -{formatPrice(cartSummary.discount)}
                </SummaryValue>
              </SummaryRow>
            )}
            
            <TotalRow>
              <SummaryLabel>Gesamt</SummaryLabel>
              <SummaryValue>{formatPrice(cartSummary.total)}</SummaryValue>
            </TotalRow>
            
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleCheckout}
              style={{ marginTop: 16 }}
            >
              Zur Kasse
            </Button>
            
            <Button
              variant="ghost"
              fullWidth
              size="sm"
              onClick={clearCart}
              style={{ marginTop: 8 }}
            >
              Warenkorb leeren
            </Button>
          </Card.Body>
        </OrderSummary>
      </Content>
    </CartContainer>
  );
};

export default Cart;