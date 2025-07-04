/**
 * EATECH - Main Routes Update
 * Version: 21.0.0
 * Description: Integration des Billing Systems in die Haupt-Routes
 * File Path: /apps/admin/src/routes/index.jsx (UPDATE)
 */

// Füge diesen Import hinzu:
import BillingRoutes from './billing.routes';

// In deiner Haupt-Route-Komponente, füge diese Route hinzu:
<Route element={<ProtectedRoute role="admin" />}>
  {/* ... andere admin routes */}
  
  {/* Billing Routes */}
  <Route path="/admin/billing/*" element={<BillingRoutes />} />
  
  {/* ... andere admin routes */}
</Route>