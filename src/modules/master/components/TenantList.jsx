/**
 * EATECH - Tenant List Component
 * Version: 5.0.0
 * Description: Complete tenant management list with actions and quick stats
 * File Path: /src/modules/master/components/TenantList.jsx
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  Building2,
  Users,
  DollarSign,
  Calendar,
  MoreVertical,
  Eye,
  Settings,
  Clock,
  Ban,
  LogIn,
  Gift,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import styles from './TenantList.module.css';

// ============================================================================
// COMPONENT
// ============================================================================
const TenantList = ({ 
  tenants, 
  onTenantSelect, 
  onTenantAction,
  provisions 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('revenue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showActions, setShowActions] = useState(null);
  
  // Filter and sort tenants
  const processedTenants = useMemo(() => {
    let filtered = tenants;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tenant => 
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.subdomain?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(tenant => {
        if (filterStatus === 'active') return tenant.status === 'active';
        if (filterStatus === 'trial') return tenant.trial && !tenant.trial.exempt;
        if (filterStatus === 'suspended') return tenant.status === 'suspended';
        return true;
      });
    }
    
    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'revenue':
          aVal = provisions?.[a.id]?.total || 0;
          bVal = provisions?.[b.id]?.total || 0;
          break;
        case 'trucks':
          aVal = Object.keys(a.foodtrucks || {}).length;
          bVal = Object.keys(b.foodtrucks || {}).length;
          break;
        case 'health':
          aVal = a.healthScore?.totalScore || 0;
          bVal = b.healthScore?.totalScore || 0;
          break;
        default:
          aVal = a[sortBy];
          bVal = b[sortBy];
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    
    return sorted;
  }, [tenants, searchTerm, sortBy, sortOrder, filterStatus, provisions]);
  
  // Get trial status
  const getTrialStatus = (tenant) => {
    if (!tenant.trial) return null;
    
    const now = new Date();
    const endDate = new Date(tenant.trial.endDate);
    const daysRemaining = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));
    
    if (tenant.trial.exempt) {
      return { status: 'exempt', text: 'Befreit', color: styles.trialExempt };
    }
    
    if (daysRemaining <= 0) {
      return { status: 'expired', text: 'Abgelaufen', color: styles.trialExpired };
    }
    
    if (daysRemaining <= 7) {
      return { status: 'ending', text: `${daysRemaining} Tage`, color: styles.trialEnding };
    }
    
    return { status: 'active', text: `${daysRemaining} Tage`, color: styles.trialActive };
  };
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className={styles.statusActive} />;
      case 'suspended':
        return <XCircle className={styles.statusSuspended} />;
      default:
        return <AlertCircle className={styles.statusWarning} />;
    }
  };
  
  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };
  
  // Handle action menu
  const handleActionClick = (e, tenantId) => {
    e.stopPropagation();
    setShowActions(showActions === tenantId ? null : tenantId);
  };
  
  // Handle action
  const handleAction = (action, tenant) => {
    setShowActions(null);
    if (onTenantAction) {
      onTenantAction(action, tenant);
    }
  };
  
  // Render sort icon
  const renderSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Tenant Verwaltung</h3>
        <button 
          className={styles.addButton}
          onClick={() => onTenantAction && onTenantAction('create', null)}
        >
          + Neuer Tenant
        </button>
      </div>
      
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Suche nach Name oder Subdomain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className={styles.filters}>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="trial">Trial</option>
            <option value="suspended">Gesperrt</option>
          </select>
        </div>
      </div>
      
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>
                <span>Tenant</span>
                {renderSortIcon('name')}
              </th>
              <th onClick={() => handleSort('trucks')}>
                <span>Foodtrucks</span>
                {renderSortIcon('trucks')}
              </th>
              <th onClick={() => handleSort('revenue')}>
                <span>Provision (Monat)</span>
                {renderSortIcon('revenue')}
              </th>
              <th onClick={() => handleSort('health')}>
                <span>Health Score</span>
                {renderSortIcon('health')}
              </th>
              <th>Trial Status</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {processedTenants.map(tenant => {
              const trialStatus = getTrialStatus(tenant);
              const provisionData = provisions?.[tenant.id];
              const truckCount = Object.keys(tenant.foodtrucks || {}).length;
              
              return (
                <tr 
                  key={tenant.id}
                  className={styles.tenantRow}
                  onClick={() => onTenantSelect && onTenantSelect(tenant)}
                >
                  <td>
                    <div className={styles.tenantInfo}>
                      <div className={styles.tenantIcon}>
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h4>{tenant.name}</h4>
                        <span className={styles.subdomain}>
                          {tenant.subdomain}.eatech.ch
                        </span>
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.statCell}>
                      <Users size={16} />
                      <span>{truckCount}</span>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.statCell}>
                      <DollarSign size={16} />
                      <span>CHF {provisionData?.month?.toFixed(2) || '0.00'}</span>
                    </div>
                  </td>
                  
                  <td>
                    {tenant.healthScore ? (
                      <div className={styles.healthScore}>
                        <div 
                          className={styles.healthBar}
                          style={{
                            backgroundColor: tenant.healthScore.category.color,
                            width: `${tenant.healthScore.totalScore}%`
                          }}
                        />
                        <span>{tenant.healthScore.totalScore}</span>
                      </div>
                    ) : (
                      <span className={styles.noData}>-</span>
                    )}
                  </td>
                  
                  <td>
                    {trialStatus && (
                      <span className={[styles.trialBadge, trialStatus.color].join(' ')}>
                        <Clock size={14} />
                        {trialStatus.text}
                      </span>
                    )}
                  </td>
                  
                  <td>
                    {getStatusIcon(tenant.status)}
                  </td>
                  
                  <td className={styles.actionsCell}>
                    <button
                      className={styles.menuButton}
                      onClick={(e) => handleActionClick(e, tenant.id)}
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {showActions === tenant.id && (
                      <div className={styles.actionMenu}>
                        <button
                          onClick={() => handleAction('view', tenant)}
                          className={styles.actionItem}
                        >
                          <Eye size={16} />
                          <span>Details anzeigen</span>
                        </button>
                        
                        <button
                          onClick={() => handleAction('settings', tenant)}
                          className={styles.actionItem}
                        >
                          <Settings size={16} />
                          <span>Einstellungen</span>
                        </button>
                        
                        <button
                          onClick={() => handleAction('loginAs', tenant)}
                          className={styles.actionItem}
                        >
                          <LogIn size={16} />
                          <span>Als Tenant einloggen</span>
                        </button>
                        
                        {tenant.trial && !tenant.trial.exempt && (
                          <button
                            onClick={() => handleAction('extendTrial', tenant)}
                            className={styles.actionItem}
                          >
                            <Gift size={16} />
                            <span>Trial verlängern</span>
                          </button>
                        )}
                        
                        <div className={styles.actionDivider} />
                        
                        <button
                          onClick={() => handleAction(
                            tenant.status === 'active' ? 'suspend' : 'activate', 
                            tenant
                          )}
                          className={[styles.actionItem, styles.danger].join(' ')}
                        >
                          <Ban size={16} />
                          <span>
                            {tenant.status === 'active' ? 'Sperren' : 'Aktivieren'}
                          </span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {processedTenants.length === 0 && (
          <div className={styles.emptyState}>
            <Building2 size={48} />
            <p>Keine Tenants gefunden</p>
            <span>Erstellen Sie Ihren ersten Tenant</span>
          </div>
        )}
      </div>
      
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <strong>Total Tenants:</strong>
          <span>{tenants.length}</span>
        </div>
        <div className={styles.summaryItem}>
          <strong>Aktiv:</strong>
          <span>{tenants.filter(t => t.status === 'active').length}</span>
        </div>
        <div className={styles.summaryItem}>
          <strong>In Trial:</strong>
          <span>{tenants.filter(t => t.trial && !t.trial.exempt).length}</span>
        </div>
        <div className={styles.summaryItem}>
          <strong>Gesamt Foodtrucks:</strong>
          <span>
            {tenants.reduce((sum, t) => sum + Object.keys(t.foodtrucks || {}).length, 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PROP TYPES
// ============================================================================
TenantList.propTypes = {
  tenants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    subdomain: PropTypes.string,
    status: PropTypes.string,
    trial: PropTypes.object,
    foodtrucks: PropTypes.object,
    healthScore: PropTypes.object
  })).isRequired,
  provisions: PropTypes.object,
  onTenantSelect: PropTypes.func,
  onTenantAction: PropTypes.func
};

TenantList.defaultProps = {
  tenants: [],
  provisions: {}
};

// ============================================================================
// EXPORT
// ============================================================================
export default React.memo(TenantList);
