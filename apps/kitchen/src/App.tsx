import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore } from '@/stores/settings.store';
import { OrderDisplay } from '@/features/orders/OrderDisplay';
import { OrderQueue } from '@/features/orders/OrderQueue';
import { QuickUpdate } from '@/features/inventory/QuickUpdate';
import { KitchenLayout } from '@/components/layout/KitchenLayout';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { SplashScreen } from '@/components/common/SplashScreen';
import { ConnectionStatus } from '@/components/common/ConnectionStatus';
import { useRealtimeConnection } from '@/hooks/useRealtimeConnection';
import { useKeepAwake } from '@/hooks/useKeepAwake';

function App() {
  const { user, loading, initialize } = useAuthStore();
  const { theme, soundEnabled, autoAcceptOrders } = useSettingsStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const { isConnected } = useRealtimeConnection();
  
  // Keep screen awake
  useKeepAwake();

  useEffect(() => {
    // Initialize auth and settings
    const init = async () => {
      await initialize();
      setIsInitializing(false);
    };
    
    init();
  }, [initialize]);

  // Apply theme
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // Show splash screen during initialization
  if (isInitializing || loading) {
    return <SplashScreen />;
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <KitchenLayout>
        <Routes>
          {/* Main order display */}
          <Route path="/" element={<OrderDisplay />} />
          
          {/* Order queue view */}
          <Route path="/queue" element={<OrderQueue />} />
          
          {/* Quick inventory update */}
          <Route path="/inventory" element={<QuickUpdate />} />
          
          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </KitchenLayout>
      
      {/* Connection status indicator */}
      <ConnectionStatus isConnected={isConnected} />
    </div>
  );
}

export default App;
