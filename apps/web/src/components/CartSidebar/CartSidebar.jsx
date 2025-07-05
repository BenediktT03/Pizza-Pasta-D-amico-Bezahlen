/**
 * EATECH Cart Sidebar
 * Quick cart preview and management
 * File Path: /apps/web/src/components/CartSidebar/CartSidebar.jsx
 */

import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { 
  X, ShoppingCart, Plus, Minus, 
  Trash2, ArrowRight
} from 'lucide-react';
import { Button, Badge, Empty } from '@eatech/ui';
import { useCart } from '../../contexts/CartContext';

// Styled Components
const SidebarOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
`;

const SidebarContainer = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 400px;
  background: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transform: translateX(${props => props.isOpen ? '0' : '100%'});
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderTitle = styled.h2`
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

const SidebarBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const CartItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const CartItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  border-radius: 8px;
`;

const ItemImage = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 6px;
  background: ${props => props.src ? `url(${props.src})` : '#e5e7eb'};
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
`;

const ItemDetails = styled.div`
  flex: 1;
`;

const ItemName = styled.h4`
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 4px 0;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
`;

const ItemOptions = styled.p`
  font-size: 12px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  margin: 0 0 8px 0;
`;

const ItemFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ItemPrice = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
`;

const QuantityControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const QuantityButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  
  &:hover:not(:disabled) {
    border-color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
    color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Quantity = styled.span`
  font-size: 14px;
  font-weight: 500;
  min-width: 20px;
  text-align: center;
`;

const RemoveButton = styled.button`
  padding: 4px;
  border: none;
  background: none;
  color: ${props => props.theme?.colors?.danger || '#ef4444'};
  cursor: pointer;
  
  &:hover {
    color: ${props => props.theme?.colors?.dangerDark || '#dc2626'};
  }
`;

const SidebarFooter = styled.div`
  padding: 20px;
  border-top: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  background: white;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SummaryLabel = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
`;

const SummaryValue = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 0;
`;

// Component
const CartSidebar = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    isOpen,
    setIsOpen,
    updateQuantity,
    removeItem,
    formatPrice,
    getCartSummary
  } = useCart();

  const cartSummary = getCartSummary();

  const handleViewCart = () => {
    setIsOpen(false);
    navigate('/cart');
  };

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };

  const handleContinueShopping = () => {
    setIsOpen(false);
  };

  return (
    <>
      <SidebarOverlay 
        isOpen={isOpen} 
        onClick={() => setIsOpen(false)} 
      />
      
      <SidebarContainer isOpen={isOpen}>
        <SidebarHeader>
          <HeaderTitle>
            <ShoppingCart size={20} />
            Warenkorb
            {cartItems.length > 0 && (
              <Badge variant="primary">{cartSummary.itemCount}</Badge>
            )}
          </HeaderTitle>
          <CloseButton onClick={() => setIsOpen(false)}>
            <X size={20} />
          </CloseButton>
        </SidebarHeader>

        <SidebarBody>
          {cartItems.length === 0 ? (
            <EmptyState>
              <Empty
                icon={<ShoppingCart size={40} />}
                title="Warenkorb ist leer"
                description="Fügen Sie Artikel hinzu"
              />
              <Button
                variant="primary"
                onClick={handleContinueShopping}
                style={{ marginTop: 20 }}
              >
                Weiter einkaufen
              </Button>
            </EmptyState>
          ) : (
            <CartItemsList>
              {cartItems.map(item => (
                <CartItem key={item.cartId}>
                  <ItemImage src={item.imageUrl} />
                  
                  <ItemDetails>
                    <ItemName>{item.name}</ItemName>
                    {item.options && Object.keys(item.options).length > 0 && (
                      <ItemOptions>Mit Extras</ItemOptions>
                    )}
                    
                    <ItemFooter>
                      <ItemPrice>{formatPrice(item.price)}</ItemPrice>
                      
                      <QuantityControls>
                        <QuantityButton
                          onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={12} />
                        </QuantityButton>
                        <Quantity>{item.quantity}</Quantity>
                        <QuantityButton
                          onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                        >
                          <Plus size={12} />
                        </QuantityButton>
                        <RemoveButton onClick={() => removeItem(item.cartId)}>
                          <Trash2 size={16} />
                        </RemoveButton>
                      </QuantityControls>
                    </ItemFooter>
                  </ItemDetails>
                </CartItem>
              ))}
            </CartItemsList>
          )}
        </SidebarBody>

        {cartItems.length > 0 && (
          <SidebarFooter>
            <SummaryRow>
              <SummaryLabel>Gesamt</SummaryLabel>
              <SummaryValue>{formatPrice(cartSummary.total)}</SummaryValue>
            </SummaryRow>
            
            <ActionButtons>
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={handleCheckout}
                rightIcon={<ArrowRight size={18} />}
              >
                Zur Kasse
              </Button>
              
              <Button
                variant="outline"
                fullWidth
                onClick={handleViewCart}
              >
                Warenkorb anzeigen
              </Button>
              
              <Button
                variant="ghost"
                fullWidth
                size="sm"
                onClick={handleContinueShopping}
              >
                Weiter einkaufen
              </Button>
            </ActionButtons>
          </SidebarFooter>
        )}
      </SidebarContainer>
    </>
  );
};

export default CartSidebar;