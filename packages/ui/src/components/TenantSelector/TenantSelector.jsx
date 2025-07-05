/**
 * EATECH - Tenant Selector Component
 * UI component for switching between tenants
 * File Path: /packages/ui/src/components/TenantSelector/TenantSelector.jsx
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, Store, Plus, Check } from 'lucide-react';
import { useTenant } from '@eatech/core/contexts/TenantContext';

// Styled Components
const SelectorContainer = styled.div`
  position: relative;
  min-width: 200px;
`;

const CurrentTenant = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  
  &:hover {
    border-color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
    box-shadow: 0 0 0 3px ${props => props.theme?.colors?.primaryLight || 'rgba(255, 107, 107, 0.1)'};
  }
`;

const TenantInfo = styled.div`
  flex: 1;
  text-align: left;
`;

const TenantName = styled.div`
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  font-size: 14px;
`;

const TenantRole = styled.div`
  font-size: 12px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  text-transform: capitalize;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${props => props.theme?.colors?.primaryLight || '#fef2f2'};
  border-radius: 8px;
  color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
`;

const ChevronIcon = styled(ChevronDown)`
  transition: transform 0.2s ease;
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0)'};
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.2s ease;
`;

const DropdownHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  text-transform: uppercase;
`;

const TenantList = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

const TenantItem = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  width: 100%;
  border: none;
  background: ${props => props.isActive ? props.theme?.colors?.primaryLight || '#fef2f2' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme?.colors?.backgroundHover || '#f9fafb'};
  }
`;

const TenantItemInfo = styled.div`
  flex: 1;
  text-align: left;
`;

const TenantItemName = styled.div`
  font-weight: ${props => props.isActive ? 600 : 500};
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  font-size: 14px;
`;

const TenantItemDetails = styled.div`
  font-size: 12px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 2px;
`;

const Badge = styled.span`
  padding: 2px 6px;
  background: ${props => {
    const colors = {
      owner: '#10b981',
      admin: '#3b82f6',
      manager: '#f59e0b',
      staff: '#6b7280'
    };
    return colors[props.role] || '#6b7280';
  }};
  color: white;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
`;

const CheckIcon = styled(Check)`
  color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
`;

const Divider = styled.div`
  height: 1px;
  background: ${props => props.theme?.colors?.border || '#e5e7eb'};
  margin: 8px 0;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  width: 100%;
  border: none;
  background: transparent;
  color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 14px;
  
  &:hover {
    background: ${props => props.theme?.colors?.primaryLight || '#fef2f2'};
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  border-top-color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Component
const TenantSelector = ({ onCreateNew }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  
  const {
    currentTenant,
    userTenants,
    switchTenant,
    loading
  } = useTenant();

  const handleSwitchTenant = async (tenantId) => {
    if (tenantId === currentTenant?.id) {
      setIsOpen(false);
      return;
    }

    setSwitching(true);
    try {
      await switchTenant(tenantId);
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching tenant:', error);
    } finally {
      setSwitching(false);
    }
  };

  // Click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('[data-tenant-selector]')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (loading) {
    return (
      <SelectorContainer>
        <CurrentTenant disabled>
          <LoadingSpinner />
          <TenantInfo>
            <TenantName>Lädt...</TenantName>
          </TenantInfo>
        </CurrentTenant>
      </SelectorContainer>
    );
  }

  if (!currentTenant) {
    return (
      <SelectorContainer>
        <CreateButton onClick={onCreateNew}>
          <Plus size={16} />
          Restaurant hinzufügen
        </CreateButton>
      </SelectorContainer>
    );
  }

  return (
    <SelectorContainer data-tenant-selector>
      <CurrentTenant onClick={() => setIsOpen(!isOpen)}>
        <IconWrapper>
          <Store size={20} />
        </IconWrapper>
        <TenantInfo>
          <TenantName>{currentTenant.name}</TenantName>
          <TenantRole>{currentTenant.role}</TenantRole>
        </TenantInfo>
        <ChevronIcon size={20} isOpen={isOpen} />
      </CurrentTenant>

      <Dropdown isOpen={isOpen}>
        <DropdownHeader>Meine Restaurants</DropdownHeader>
        
        <TenantList>
          {userTenants.map(tenant => (
            <TenantItem
              key={tenant.id}
              isActive={tenant.id === currentTenant?.id}
              onClick={() => handleSwitchTenant(tenant.id)}
              disabled={switching}
            >
              <IconWrapper>
                <Store size={20} />
              </IconWrapper>
              <TenantItemInfo>
                <TenantItemName isActive={tenant.id === currentTenant?.id}>
                  {tenant.name || 'Unbenannt'}
                </TenantItemName>
                <TenantItemDetails>
                  <Badge role={tenant.role}>{tenant.role}</Badge>
                  <span>{tenant.plan || 'Trial'}</span>
                </TenantItemDetails>
              </TenantItemInfo>
              {tenant.id === currentTenant?.id && <CheckIcon size={16} />}
            </TenantItem>
          ))}
        </TenantList>

        {onCreateNew && (
          <>
            <Divider />
            <CreateButton onClick={() => {
              setIsOpen(false);
              onCreateNew();
            }}>
              <Plus size={16} />
              Neues Restaurant hinzufügen
            </CreateButton>
          </>
        )}
      </Dropdown>
    </SelectorContainer>
  );
};

export default TenantSelector;