import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentTenant } from '@config/firebase';

const TenantContext = createContext();

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
};

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tenantId = getCurrentTenant();
    setTenant({ id: tenantId, name: tenantId });
    setLoading(false);
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
};
