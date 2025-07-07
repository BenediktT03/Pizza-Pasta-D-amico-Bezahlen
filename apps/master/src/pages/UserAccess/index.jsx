import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Lock,
  Unlock,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  Clock,
  Activity,
  UserCheck,
  UserX,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';
import styles from './UserAccess.module.css';

const UserAccess = () => {
  // State Management
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Mock user data
  const mockUsers = [
    {
      id: 1,
      name: 'Thomas Müller',
      email: 'thomas.mueller@eatech.ch',
      role: 'super_admin',
      status: 'active',
      lastLogin: '2025-01-07 14:23',
      created: '2024-01-15',
      phone: '+41 79 123 45 67',
      twoFactor: true,
      permissions: ['all'],
      loginHistory: [
        { date: '2025-01-07 14:23', ip: '85.195.123.45', location: 'Zürich, CH', success: true },
        { date: '2025-01-07 09:15', ip: '85.195.123.45', location: 'Zürich, CH', success: true },
        { date: '2025-01-06 16:42', ip: '85.195.123.45', location: 'Zürich, CH', success: true }
      ]
    },
    {
      id: 2,
      name: 'Sarah Weber',
      email: 'sarah.weber@eatech.ch',
      role: 'admin',
      status: 'active',
      lastLogin: '2025-01-07 11:45',
      created: '2024-03-22',
      phone: '+41 78 234 56 78',
      twoFactor: true,
      permissions: ['analytics', 'tenants', 'billing'],
      loginHistory: [
        { date: '2025-01-07 11:45', ip: '85.195.67.89', location: 'Bern, CH', success: true },
        { date: '2025-01-06 14:20', ip: '85.195.67.89', location: 'Bern, CH', success: true }
      ]
    },
    {
      id: 3,
      name: 'Michael Schmidt',
      email: 'michael.schmidt@eatech.ch',
      role: 'support',
      status: 'active',
      lastLogin: '2025-01-07 15:10',
      created: '2024-06-10',
      phone: '+41 76 345 67 89',
      twoFactor: false,
      permissions: ['support', 'analytics_view'],
      loginHistory: [
        { date: '2025-01-07 15:10', ip: '85.195.45.123', location: 'Basel, CH', success: true },
        { date: '2025-01-07 08:30', ip: '85.195.45.123', location: 'Basel, CH', success: true }
      ]
    },
    {
      id: 4,
      name: 'Julia Schneider',
      email: 'julia.schneider@eatech.ch',
      role: 'viewer',
      status: 'inactive',
      lastLogin: '2024-12-20 09:30',
      created: '2024-09-05',
      phone: '+41 79 456 78 90',
      twoFactor: false,
      permissions: ['analytics_view', 'reports_view'],
      loginHistory: [
        { date: '2024-12-20 09:30', ip: '85.195.89.45', location: 'Luzern, CH', success: true }
      ]
    },
    {
      id: 5,
      name: 'Peter Wagner',
      email: 'peter.wagner@eatech.ch',
      role: 'admin',
      status: 'locked',
      lastLogin: '2025-01-05 13:20',
      created: '2024-02-28',
      phone: '+41 78 567 89 01',
      twoFactor: true,
      permissions: ['analytics', 'tenants'],
      loginHistory: [
        { date: '2025-01-07 10:15', ip: '85.195.12.34', location: 'Genève, CH', success: false },
        { date: '2025-01-07 10:14', ip: '85.195.12.34', location: 'Genève, CH', success: false },
        { date: '2025-01-07 10:13', ip: '85.195.12.34', location: 'Genève, CH', success: false },
        { date: '2025-01-05 13:20', ip: '85.195.12.34', location: 'Genève, CH', success: true }
      ]
    }
  ];

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Role configuration
  const roles = {
    super_admin: { label: 'Super Admin', color: '#667eea', icon: Shield },
    admin: { label: 'Administrator', color: '#10b981', icon: UserCheck },
    support: { label: 'Support', color: '#f59e0b', icon: Users },
    viewer: { label: 'Viewer', color: '#6b7280', icon: Activity }
  };

  // Status configuration
  const statuses = {
    active: { label: 'Aktiv', color: '#10b981' },
    inactive: { label: 'Inaktiv', color: '#6b7280' },
    locked: { label: 'Gesperrt', color: '#ef4444' }
  };

  // Permission labels
  const permissionLabels = {
    all: 'Vollzugriff',
    analytics: 'Analytics',
    analytics_view: 'Analytics (Nur Ansicht)',
    tenants: 'Tenant Verwaltung',
    billing: 'Abrechnungen',
    support: 'Support Tools',
    reports_view: 'Reports (Nur Ansicht)'
  };

  // Handle user actions
  const handleUserAction = (action, userId) => {
    switch (action) {
      case 'edit':
        const user = users.find(u => u.id === userId);
        setSelectedUser(user);
        setShowUserDetails(true);
        break;
      case 'lock':
        // Lock user logic
        break;
      case 'unlock':
        // Unlock user logic
        break;
      case 'delete':
        // Delete user logic
        break;
      default:
        break;
    }
  };

  // Render user row
  const renderUserRow = (user) => {
    const RoleIcon = roles[user.role].icon;
    
    return (
      <tr key={user.id}>
        <td>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h4>{user.name}</h4>
              <p>{user.email}</p>
            </div>
          </div>
        </td>
        <td>
          <div className={styles.roleTag} style={{ backgroundColor: `${roles[user.role].color}20` }}>
            <RoleIcon size={16} style={{ color: roles[user.role].color }} />
            <span style={{ color: roles[user.role].color }}>{roles[user.role].label}</span>
          </div>
        </td>
        <td>
          <span className={`${styles.status} ${styles[user.status]}`}>
            {user.status === 'active' && <CheckCircle size={16} />}
            {user.status === 'inactive' && <XCircle size={16} />}
            {user.status === 'locked' && <Lock size={16} />}
            {statuses[user.status].label}
          </span>
        </td>
        <td>
          <div className={styles.twoFactor}>
            {user.twoFactor ? (
              <>
                <Shield size={16} className={styles.enabled} />
                <span className={styles.enabled}>Aktiviert</span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} className={styles.disabled} />
                <span className={styles.disabled}>Deaktiviert</span>
              </>
            )}
          </div>
        </td>
        <td>
          <div className={styles.lastLogin}>
            <Clock size={16} />
            <span>{user.lastLogin}</span>
          </div>
        </td>
        <td>
          <div className={styles.actions}>
            <button
              className={styles.actionButton}
              onClick={() => handleUserAction('edit', user.id)}
            >
              <Edit size={16} />
            </button>
            {user.status === 'locked' ? (
              <button
                className={styles.actionButton}
                onClick={() => handleUserAction('unlock', user.id)}
              >
                <Unlock size={16} />
              </button>
            ) : (
              <button
                className={styles.actionButton}
                onClick={() => handleUserAction('lock', user.id)}
              >
                <Lock size={16} />
              </button>
            )}
            <button
              className={`${styles.actionButton} ${styles.danger}`}
              onClick={() => handleUserAction('delete', user.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>Benutzerverwaltung</h1>
          <p className={styles.subtitle}>Verwalten Sie Master-Admin Zugänge und Berechtigungen</p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setShowAddUser(true)}
        >
          <UserPlus size={20} />
          <span>Benutzer hinzufügen</span>
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <Users size={24} className={styles.statIcon} />
          <div>
            <h3>{users.length}</h3>
            <p>Gesamt Benutzer</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <UserCheck size={24} className={styles.statIcon} style={{ color: '#10b981' }} />
          <div>
            <h3>{users.filter(u => u.status === 'active').length}</h3>
            <p>Aktive Benutzer</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <Shield size={24} className={styles.statIcon} style={{ color: '#667eea' }} />
          <div>
            <h3>{users.filter(u => u.twoFactor).length}</h3>
            <p>Mit 2FA</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <Lock size={24} className={styles.statIcon} style={{ color: '#ef4444' }} />
          <div>
            <h3>{users.filter(u => u.status === 'locked').length}</h3>
            <p>Gesperrt</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Suche nach Name oder E-Mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Rollen</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Administrator</option>
            <option value="support">Support</option>
            <option value="viewer">Viewer</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="locked">Gesperrt</option>
          </select>
          
          <button className={styles.refreshButton} onClick={loadUsers}>
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <p>Lade Benutzer...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className={styles.emptyState}>
            <UserX size={48} />
            <h3>Keine Benutzer gefunden</h3>
            <p>Versuchen Sie andere Suchkriterien oder fügen Sie einen neuen Benutzer hinzu.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Benutzer</th>
                <th>Rolle</th>
                <th>Status</th>
                <th>2FA</th>
                <th>Letzte Anmeldung</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(renderUserRow)}
            </tbody>
          </table>
        )}
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setShowUserDetails(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Benutzerdetails</h2>
              <button onClick={() => setShowUserDetails(false)}>×</button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.userDetailHeader}>
                <div className={styles.userDetailAvatar}>
                  {selectedUser.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.email}</p>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <label>Rolle</label>
                  <p>{roles[selectedUser.role].label}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Status</label>
                  <p>{statuses[selectedUser.status].label}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Telefon</label>
                  <p>{selectedUser.phone}</p>
                </div>
                <div className={styles.detailItem}>
                  <label>Erstellt am</label>
                  <p>{selectedUser.created}</p>
                </div>
              </div>

              <div className={styles.permissionsSection}>
                <h4>Berechtigungen</h4>
                <div className={styles.permissionsList}>
                  {selectedUser.permissions.map(perm => (
                    <span key={perm} className={styles.permissionTag}>
                      {permissionLabels[perm] || perm}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.loginHistorySection}>
                <h4>Login-Verlauf</h4>
                <div className={styles.loginHistory}>
                  {selectedUser.loginHistory.map((login, index) => (
                    <div key={index} className={styles.loginItem}>
                      <div className={styles.loginStatus}>
                        {login.success ? (
                          <CheckCircle size={16} className={styles.success} />
                        ) : (
                          <XCircle size={16} className={styles.failed} />
                        )}
                      </div>
                      <div className={styles.loginDetails}>
                        <span className={styles.loginDate}>{login.date}</span>
                        <span className={styles.loginLocation}>{login.location}</span>
                        <span className={styles.loginIp}>{login.ip}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.modalButton} onClick={() => setShowUserDetails(false)}>
                Schließen
              </button>
              <button className={`${styles.modalButton} ${styles.primary}`}>
                Bearbeiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAccess;