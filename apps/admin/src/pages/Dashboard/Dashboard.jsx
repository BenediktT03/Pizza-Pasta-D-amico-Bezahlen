/**
 * EATECH Admin Dashboard
 * Main dashboard with real-time statistics and quick actions
 * File Path: /apps/admin/src/pages/Dashboard/Dashboard.jsx
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Users, Clock, AlertCircle, Package,
  ArrowUpRight, ArrowDownRight, Activity,
  Calendar, Filter, Download, RefreshCw
} from 'lucide-react';
import { 
  Card, Button, Select, Badge, Spinner,
  Empty, Alert
} from '@eatech/ui';
import { useTenant } from '@eatech/core/contexts/TenantContext';
import { useTenantData } from '@eatech/core/hooks/useTenantData';
import DashboardService from '../../services/DashboardService';
import RevenueChart from '../../components/Charts/RevenueChart';
import OrdersChart from '../../components/Charts/OrdersChart';
import PopularItemsList from '../../components/Lists/PopularItemsList';
import RecentOrdersList from '../../components/Lists/RecentOrdersList';
import LiveOrdersWidget from '../../components/Widgets/LiveOrdersWidget';

// Styled Components
const DashboardContainer = styled.div`
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  min-height: 100vh;
`;

const DashboardHeader = styled.div`
  margin-bottom: 32px;
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 16px;
`;

const WelcomeSection = styled.div``;

const PageTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const TimeFilter = styled.div`
  display: flex;
  gap: 8px;
  background: white;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
`;

const TimeButton = styled.button`
  padding: 8px 16px;
  border: none;
  background: ${props => props.active ? props.theme?.colors?.primary || '#ff6b6b' : 'transparent'};
  color: ${props => props.active ? 'white' : props.theme?.colors?.text || '#1f2937'};
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(.active) {
    background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const StatCard = styled(Card)`
  background: white;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const StatInfo = styled.div``;

const StatLabel = styled.p`
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  margin: 0 0 8px 0;
`;

const StatValue = styled.h3`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  margin: 0;
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.bg || '#fef2f2'};
  color: ${props => props.color || '#ff6b6b'};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${props => props.positive ? '#10b981' : '#ef4444'};
`;

const TrendIcon = styled.div`
  display: flex;
  align-items: center;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 32px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const WidgetsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
`;

const RefreshButton = styled(Button)`
  min-width: auto;
`;

const LiveIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: ${props => props.theme?.colors?.success || '#10b981'};
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

// Component
const Dashboard = () => {
  const { currentTenant } = useTenant();
  const [timeRange, setTimeRange] = useState('today');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Real-time data subscriptions
  const { data: liveOrders } = useTenantData('orders', {
    realtime: true,
    filters: { status: ['pending', 'preparing', 'ready'] }
  });

  const { data: todayRevenue } = useTenantData('analytics/revenue/today', {
    realtime: true
  });

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [currentTenant, timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dashboardData = await DashboardService.getDashboardStats(
        currentTenant.id,
        timeRange
      );
      setStats(dashboardData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Calculate live stats
  const liveOrdersCount = liveOrders ? Object.keys(liveOrders).length : 0;

  // Format currency
  const formatCurrency = (value) => `CHF ${value.toFixed(2)}`;

  // Format percentage
  const formatPercentage = (value) => {
    const formatted = Math.abs(value).toFixed(1);
    return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  if (loading) {
    return (
      <DashboardContainer>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
          <Spinner size={40} />
        </div>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardHeader>
        <HeaderTop>
          <WelcomeSection>
            <PageTitle>{getGreeting()}, {currentTenant.name}!</PageTitle>
            <Subtitle>
              Hier ist Ihre Übersicht für {timeRange === 'today' ? 'heute' : 
                timeRange === 'week' ? 'diese Woche' : 'diesen Monat'}
            </Subtitle>
          </WelcomeSection>
          
          <HeaderActions>
            <TimeFilter>
              <TimeButton
                active={timeRange === 'today'}
                onClick={() => setTimeRange('today')}
              >
                Heute
              </TimeButton>
              <TimeButton
                active={timeRange === 'week'}
                onClick={() => setTimeRange('week')}
              >
                Woche
              </TimeButton>
              <TimeButton
                active={timeRange === 'month'}
                onClick={() => setTimeRange('month')}
              >
                Monat
              </TimeButton>
            </TimeFilter>
            
            <RefreshButton
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              loading={refreshing}
            >
              <RefreshCw size={16} />
            </RefreshButton>
            
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={16} />}
            >
              Export
            </Button>
          </HeaderActions>
        </HeaderTop>
        
        <LiveIndicator>
          Live-Daten • Letzte Aktualisierung vor {refreshing ? '...' : 'wenigen Sekunden'}
        </LiveIndicator>
      </DashboardHeader>

      {/* Key Stats */}
      <StatsGrid>
        <StatCard>
          <Card.Body>
            <StatHeader>
              <StatInfo>
                <StatLabel>Heutiger Umsatz</StatLabel>
                <StatValue>{formatCurrency(stats?.revenue?.today || 0)}</StatValue>
              </StatInfo>
              <StatIcon bg="#fef2f2" color="#ff6b6b">
                <DollarSign size={24} />
              </StatIcon>
            </StatHeader>
            <StatFooter positive={stats?.revenue?.change >= 0}>
              <TrendIcon>
                {stats?.revenue?.change >= 0 ? 
                  <ArrowUpRight size={16} /> : 
                  <ArrowDownRight size={16} />
                }
              </TrendIcon>
              {formatPercentage(stats?.revenue?.change || 0)} vs. gestern
            </StatFooter>
          </Card.Body>
        </StatCard>

        <StatCard>
          <Card.Body>
            <StatHeader>
              <StatInfo>
                <StatLabel>Bestellungen</StatLabel>
                <StatValue>{stats?.orders?.total || 0}</StatValue>
              </StatInfo>
              <StatIcon bg="#dbeafe" color="#3b82f6">
                <ShoppingCart size={24} />
              </StatIcon>
            </StatHeader>
            <StatFooter positive={stats?.orders?.change >= 0}>
              <TrendIcon>
                {stats?.orders?.change >= 0 ? 
                  <ArrowUpRight size={16} /> : 
                  <ArrowDownRight size={16} />
                }
              </TrendIcon>
              {formatPercentage(stats?.orders?.change || 0)} vs. gestern
            </StatFooter>
          </Card.Body>
        </StatCard>

        <StatCard>
          <Card.Body>
            <StatHeader>
              <StatInfo>
                <StatLabel>Aktive Bestellungen</StatLabel>
                <StatValue>{liveOrdersCount}</StatValue>
              </StatInfo>
              <StatIcon bg="#fef3c7" color="#f59e0b">
                <Activity size={24} />
              </StatIcon>
            </StatHeader>
            <StatFooter>
              <Clock size={16} />
              Ø {stats?.avgPrepTime || 15} Min. Zubereitungszeit
            </StatFooter>
          </Card.Body>
        </StatCard>

        <StatCard>
          <Card.Body>
            <StatHeader>
              <StatInfo>
                <StatLabel>Neue Kunden</StatLabel>
                <StatValue>{stats?.customers?.new || 0}</StatValue>
              </StatInfo>
              <StatIcon bg="#d1fae5" color="#10b981">
                <Users size={24} />
              </StatIcon>
            </StatHeader>
            <StatFooter positive={true}>
              <TrendIcon>
                <ArrowUpRight size={16} />
              </TrendIcon>
              {stats?.customers?.total || 0} Gesamt
            </StatFooter>
          </Card.Body>
        </StatCard>
      </StatsGrid>

      {/* Charts */}
      <ChartsGrid>
        <Card>
          <Card.Body>
            <h3 style={{ marginBottom: 20 }}>Umsatzentwicklung</h3>
            <RevenueChart timeRange={timeRange} data={stats?.revenueChart} />
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body>
            <h3 style={{ marginBottom: 20 }}>Bestellungen nach Status</h3>
            <OrdersChart data={stats?.ordersByStatus} />
          </Card.Body>
        </Card>
      </ChartsGrid>

      {/* Widgets */}
      <WidgetsGrid>
        <Card>
          <Card.Body>
            <h3 style={{ marginBottom: 20 }}>Live Bestellungen</h3>
            <LiveOrdersWidget orders={liveOrders} />
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body>
            <h3 style={{ marginBottom: 20 }}>Beliebte Artikel</h3>
            <PopularItemsList items={stats?.popularItems} />
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body>
            <h3 style={{ marginBottom: 20 }}>Letzte Bestellungen</h3>
            <RecentOrdersList orders={stats?.recentOrders} />
          </Card.Body>
        </Card>
      </WidgetsGrid>

      {/* Alerts */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <div style={{ marginTop: 32 }}>
          {stats.alerts.map((alert, index) => (
            <Alert
              key={index}
              variant={alert.type}
              style={{ marginBottom: 12 }}
            >
              <AlertCircle size={16} style={{ marginRight: 8 }} />
              {alert.message}
            </Alert>
          ))}
        </div>
      )}
    </DashboardContainer>
  );
};

export default Dashboard;