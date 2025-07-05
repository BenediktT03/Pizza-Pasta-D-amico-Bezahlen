/**
 * EATECH Product Detail Modal
 * Detailed product view with options and modifiers
 * File Path: /apps/web/src/components/ProductDetailModal/ProductDetailModal.jsx
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  X, Plus, Minus, Info, Leaf, 
  Flame, AlertCircle, Clock
} from 'lucide-react';
import { Button, Badge, Alert } from '@eatech/ui';

// Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  
  @media (min-width: 768px) {
    align-items: center;
  }
`;

const ModalContent = styled.div`
  background: white;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  @media (min-width: 768px) {
    border-radius: 20px;
    max-height: 80vh;
  }
`;

const ModalHeader = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const ProductImage = styled.div`
  width: 100%;
  height: 300px;
  background: ${props => props.src ? `url(${props.src})` : '#f3f4f6'};
  background-size: cover;
  background-position: center;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  &:hover {
    background: white;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const ProductHeader = styled.div`
  margin-bottom: 16px;
`;

const ProductName = styled.h2`
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
`;

const ProductPrice = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
  margin-bottom: 8px;
`;

const ProductBadges = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const ProductDescription = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  margin: 0 0 24px 0;
`;

const Section = styled.div`
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
`;

const OptionGroup = styled.div`
  margin-bottom: 16px;
`;

const OptionLabel = styled.label`
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid ${props => props.checked ? props.theme?.colors?.primary || '#ff6b6b' : props.theme?.colors?.border || '#e5e7eb'};
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

const OptionInfo = styled.div`
  flex: 1;
`;

const OptionName = styled.div`
  font-weight: 500;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
`;

const OptionPrice = styled.div`
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const InfoBox = styled.div`
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const QuantitySelector = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const QuantityButton = styled.button`
  width: 36px;
  height: 36px;
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
  font-size: 18px;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
`;

const ModalFooter = styled.div`
  padding: 20px 24px;
  border-top: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  background: white;
  flex-shrink: 0;
`;

const TotalPrice = styled.div`
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  margin-bottom: 8px;
  
  span {
    font-size: 20px;
    font-weight: 700;
    color: ${props => props.theme?.colors?.text || '#1f2937'};
  }
`;

// Component
const ProductDetailModal = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [notes, setNotes] = useState('');

  // Calculate total price including options
  const calculateTotalPrice = () => {
    let total = product.price * quantity;
    
    // Add option prices
    Object.entries(selectedOptions).forEach(([groupId, optionId]) => {
      const group = product.options?.find(g => g.id === groupId);
      const option = group?.items?.find(item => item.id === optionId);
      if (option?.price) {
        total += option.price * quantity;
      }
    });
    
    return total;
  };

  // Handle option selection
  const handleOptionSelect = (groupId, optionId, isMultiple) => {
    if (isMultiple) {
      setSelectedOptions(prev => ({
        ...prev,
        [groupId]: prev[groupId]?.includes(optionId)
          ? prev[groupId].filter(id => id !== optionId)
          : [...(prev[groupId] || []), optionId]
      }));
    } else {
      setSelectedOptions(prev => ({
        ...prev,
        [groupId]: optionId
      }));
    }
  };

  // Handle add to cart
  const handleAdd = () => {
    onAddToCart(product, quantity, {
      options: selectedOptions,
      notes
    });
    onClose();
  };

  // Check if all required options are selected
  const isValid = () => {
    if (!product.options) return true;
    
    const requiredGroups = product.options.filter(g => g.required);
    return requiredGroups.every(group => selectedOptions[group.id]);
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ProductImage src={product.imageUrl} />
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <ProductHeader>
            <ProductName>{product.name}</ProductName>
            <ProductPrice>CHF {product.price.toFixed(2)}</ProductPrice>
            
            <ProductBadges>
              {product.featured && (
                <Badge variant="primary">Beliebt</Badge>
              )}
              {product.dietary?.vegetarian && (
                <Badge variant="success">
                  <Leaf size={14} style={{ marginRight: 4 }} />
                  Vegetarisch
                </Badge>
              )}
              {product.dietary?.vegan && (
                <Badge variant="success">
                  <Leaf size={14} style={{ marginRight: 4 }} />
                  Vegan
                </Badge>
              )}
              {product.dietary?.glutenFree && (
                <Badge>Glutenfrei</Badge>
              )}
              {product.dietary?.spicy && (
                <Badge variant="danger">
                  <Flame size={14} style={{ marginRight: 4 }} />
                  Scharf
                </Badge>
              )}
            </ProductBadges>
          </ProductHeader>

          <ProductDescription>{product.description}</ProductDescription>

          {/* Product Info */}
          {(product.prepTime || product.calories || product.allergens) && (
            <InfoBox>
              {product.prepTime && (
                <InfoRow>
                  <Clock size={16} />
                  <span>Zubereitungszeit: {product.prepTime} Min.</span>
                </InfoRow>
              )}
              {product.calories && (
                <InfoRow>
                  <Info size={16} />
                  <span>{product.calories} kcal</span>
                </InfoRow>
              )}
              {product.allergens && product.allergens.length > 0 && (
                <InfoRow>
                  <AlertCircle size={16} />
                  <span>Allergene: {product.allergens.join(', ')}</span>
                </InfoRow>
              )}
            </InfoBox>
          )}

          {/* Options */}
          {product.options && product.options.length > 0 && (
            <Section>
              {product.options.map(group => (
                <OptionGroup key={group.id}>
                  <SectionTitle>
                    {group.name}
                    {group.required && <span style={{ color: '#ef4444' }}> *</span>}
                  </SectionTitle>
                  
                  {group.items.map(item => (
                    <OptionLabel
                      key={item.id}
                      checked={
                        group.multiple
                          ? selectedOptions[group.id]?.includes(item.id)
                          : selectedOptions[group.id] === item.id
                      }
                    >
                      <input
                        type={group.multiple ? 'checkbox' : 'radio'}
                        name={group.id}
                        checked={
                          group.multiple
                            ? selectedOptions[group.id]?.includes(item.id)
                            : selectedOptions[group.id] === item.id
                        }
                        onChange={() => handleOptionSelect(group.id, item.id, group.multiple)}
                      />
                      <OptionInfo>
                        <OptionName>{item.name}</OptionName>
                        {item.price > 0 && (
                          <OptionPrice>+ CHF {item.price.toFixed(2)}</OptionPrice>
                        )}
                      </OptionInfo>
                    </OptionLabel>
                  ))}
                </OptionGroup>
              ))}
            </Section>
          )}

          {/* Special Instructions */}
          <Section>
            <SectionTitle>Besondere Wünsche</SectionTitle>
            <textarea
              placeholder="z.B. ohne Zwiebeln, extra scharf..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14,
                resize: 'vertical',
                minHeight: 80
              }}
            />
          </Section>

          {/* Quantity Selector */}
          <QuantitySelector>
            <span style={{ flex: 1 }}>Menge:</span>
            <QuantityButton
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus size={16} />
            </QuantityButton>
            <QuantityDisplay>{quantity}</QuantityDisplay>
            <QuantityButton
              onClick={() => setQuantity(quantity + 1)}
              disabled={quantity >= 99}
            >
              <Plus size={16} />
            </QuantityButton>
          </QuantitySelector>
        </ModalBody>

        <ModalFooter>
          <TotalPrice>
            Gesamt: <span>CHF {calculateTotalPrice().toFixed(2)}</span>
          </TotalPrice>
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleAdd}
            disabled={!isValid()}
          >
            In den Warenkorb ({quantity})
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ProductDetailModal;