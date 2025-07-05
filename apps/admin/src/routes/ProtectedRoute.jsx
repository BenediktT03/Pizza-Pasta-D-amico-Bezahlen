import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import Layout from '@components/layout/Layout';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default ProtectedRoute;
