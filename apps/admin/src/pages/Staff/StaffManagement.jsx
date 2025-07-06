/**
 * EATECH - Staff Management
 * Version: 3.2.0
 * Description: Personal-Verwaltung mit Schichtplanung und Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/Staff/StaffManagement.jsx
 * 
 * Features: Employee management, schedule planning, performance tracking
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, remove } from 'firebase/database';
import { 
  Users, UserPlus, Calendar, Clock,
  Edit2, Trash2, Eye, Search,
  Filter, Download, Star, Award,
  Phone, Mail, MapPin, Shield,
  TrendingUp, Activity, AlertCircle,
  CheckCircle, UserCheck, UserX
} from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import styles from './StaffManagement.module.css';

// Lazy loaded components
const StaffForm = lazy(() => import('./components/StaffForm'));
const ScheduleCalendar = lazy(() => import('./components/ScheduleCalendar'));
const PerformanceTracker = lazy(() => import('./components/PerformanceTracker'));
const StaffAnalytics = lazy(() => import('./components/StaffAnalytics'));
const TimeTracking = lazy(() => import('./components/TimeTracking'));

// Lazy loaded services
const StaffService = lazy(() => import('../../services/StaffService'));
const ScheduleService = lazy(() => import('../../services/ScheduleService'));
const PerformanceService = lazy(() => import('../../services/PerformanceService'));

const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
  </div>
);

const STAFF_ROLES = {
  owner: { name: 'Inhaber', color: '#DC2626', permissions: ['all'] },
  manager: { name: 'Manager', color: '#EA580C', permissions: ['staff', 'orders', 'products'] },
  chef: { name: 'Koch', color: '#CA8A04', permissions: ['kitchen', 'orders'] },
  cashier: { name: 'Kassier', color: '#059669', permissions: ['pos', 'orders'] },
  helper: { name: 'Helfer', color: '#7C3AED', permissions: ['basic'] }
};

const STAFF_STATUS = {
  active: { name: 'Aktiv', color: '#10B981' },
  inactive: { name: 'Inaktiv', color: '#6B7280' },
  vacation: { name: 'Urlaub', color: '#F59E0B' },
  sick: { name: 'Krank', color: '#EF4444' }
};

const WORK_SHIFTS = {
  morning: { name: 'Früh', time: '06:00-14:00', color: '#F59E0B' },
  afternoon: { name: 'Mittag', time: '10:00-18:00', color: '#10B981' },
  evening: { name: 'Abend', time: '14:00-22:00', color: '#3B82F6' },
  night: { name: 'Nacht', time: '22:00-06:00', color: '#8B5CF6' }
};

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTimeTracking, setShowTimeTracking] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 7), 'yyyy-MM-dd')
  });

  const tenantId = 'demo-restaurant';

  // ============================================================================
  // FIREBASE DATA LOADING
  // ============================================================================
  useEffect(() => {
    const loadStaffData = async () => {
      setLoading(true);
      try {
        // Load staff
        const staffRef = ref(database, `tenants/${tenantId}/staff`);
        onValue(staffRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const staffArray = Object.entries(data).map(([id, member]) => ({
              id,
              ...member
            }));
            setStaff(staffArray);
          } else {
            setStaff([]);
          }
        });

        // Load schedules
        const schedulesRef = ref(database, `tenants/${tenantId}/schedules`);
        onValue(schedulesRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const schedulesArray = Object.entries(data).map(([id, schedule]) => ({
              id,
              ...schedule
            }));
            setSchedules(schedulesArray);
          } else {
            setSchedules([]);
          }
        });

        // Load performance data
        const performanceRef = ref(database, `tenants/${tenantId}/performance`);
        onValue(performanceRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const performanceArray = Object.entries(data).map(([id, perf]) => ({
              id,
              ...perf
            }));
            setPerformance(performanceArray);
          } else {
            setPerformance([]);
          }
        });
      } catch (error) {
        console.error('Error loading staff data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStaffData();
  }, [tenantId]);

  // ============================================================================
  // FILTERED DATA
  // ============================================================================
  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      const matchesSearch = member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || member.role === filterRole;
      const matchesStatus = filterStatus === 'all' || member.status === filterStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staff, searchTerm, filterRole, filterStatus]);

  // ============================================================================
  // CALCULATED STATS
  // ============================================================================
  const staffStats = useMemo(() => {
    const totalStaff = staff.length;
    const activeStaff = staff.filter(s => s.status === 'active').length;
    const onShiftToday = schedules.filter(s => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return s.date === today && s.status === 'confirmed';
    }).length;
    const avgPerformance = performance.length > 0 
      ? performance.reduce((sum, p) => sum + (p.rating || 0), 0) / performance.length
      : 0;

    return {
      totalStaff,
      activeStaff,
      onShiftToday,
      avgPerformance: avgPerformance.toFixed(1)
    };
  }, [staff, schedules, performance]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleCreateStaff = useCallback(async (staffData) => {
    try {
      const staffRef = ref(database, `tenants/${tenantId}/staff`);
      await push(staffRef, {
        ...staffData,
        createdAt: new Date().toISOString(),
        status: 'active'
      });
      setShowStaffForm(false);
    } catch (error) {
      console.error('Error creating staff:', error);
    }
  }, [tenantId]);

  const handleUpdateStaff = useCallback(async (staffId, staffData) => {
    try {
      const staffRef = ref(database, `tenants/${tenantId}/staff/${staffId}`);
      await update(staffRef, {
        ...staffData,
        updatedAt: new Date().toISOString()
      });
      setSelectedStaff(null);
      setShowStaffForm(false);
    } catch (error) {
      console.error('Error updating staff:', error);
    }
  }, [tenantId]);

  const handleDeleteStaff = useCallback(async (staffId) => {
    if (window.confirm('Mitarbeiter wirklich löschen?')) {
      try {
        const staffRef = ref(database, `tenants/${tenantId}/staff/${staffId}`);
        await remove(staffRef);
      } catch (error) {
        console.error('Error deleting staff:', error);
      }
    }
  }, [tenantId]);

  const handleExportStaff = useCallback(() => {
    const csvData = filteredStaff.map(member => ({
      Name: member.name,
      Rolle: STAFF_ROLES[member.role]?.name || member.role,
      Email: member.email,
      Telefon: member.phone,
      Status: STAFF_STATUS[member.status]?.name || member.status,
      'Gehalt/Std': `${member.hourlyWage || 0} CHF`,
      'Eingestellt': member.hireDate ? format(parseISO(member.hireDate), 'dd.MM.yyyy') : '-'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredStaff]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderStaffCard = (member) => {
    const role = STAFF_ROLES[member.role] || { name: member.role, color: '#6B7280' };
    const status = STAFF_STATUS[member.status] || { name: member.status, color: '#6B7280' };
    const todaySchedule = schedules.find(s => 
      s.staffId === member.id && 
      s.date === format(new Date(), 'yyyy-MM-dd')
    );
    const memberPerformance = performance.find(p => p.staffId === member.id);

    return (
      <div key={member.id} className={styles.staffCard}>
        <div className={styles.staffHeader}>
          <div className={styles.staffAvatar}>
            {member.avatar ? (
              <img src={member.avatar} alt={member.name} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {member.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className={styles.staffInfo}>
            <h3>{member.name}</h3>
            <div className={styles.staffRole} style={{ color: role.color }}>
              {role.name}
            </div>
          </div>
          <div className={styles.staffActions}>
            <button
              onClick={() => {
                setSelectedStaff(member);
                setShowStaffForm(true);
              }}
              className={styles.actionButton}
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => handleDeleteStaff(member.id)}
              className={styles.actionButton}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className={styles.staffDetails}>
          <div className={styles.contactInfo}>
            <div className={styles.contactItem}>
              <Mail size={14} />
              <span>{member.email}</span>
            </div>
            <div className={styles.contactItem}>
              <Phone size={14} />
              <span>{member.phone}</span>
            </div>
          </div>

          <div className={styles.workInfo}>
            <div className={styles.workItem}>
              <Clock size={14} />
              <span>
                {todaySchedule ? 
                  `${todaySchedule.startTime} - ${todaySchedule.endTime}` : 
                  'Heute frei'
                }
              </span>
            </div>
            <div className={styles.workItem}>
              <Star size={14} />
              <span>
                {memberPerformance ? 
                  `${memberPerformance.rating}/5` : 
                  'Keine Bewertung'
                }
              </span>
            </div>
          </div>
        </div>

        <div className={styles.staffFooter}>
          <div 
            className={styles.staffStatus}
            style={{ backgroundColor: status.color + '20', color: status.color }}
          >
            {status.name}
          </div>
          <div className={styles.staffWage}>
            {member.hourlyWage ? `${member.hourlyWage} CHF/h` : 'Gehalt nicht angegeben'}
          </div>
        </div>
      </div>
    );
  };

  const renderStatsCards = () => {
    return (
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{staffStats.totalStaff}</h3>
            <p>Gesamt Personal</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <UserCheck size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{staffStats.activeStaff}</h3>
            <p>Aktiv</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Clock size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{staffStats.onShiftToday}</h3>
            <p>Heute im Dienst</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Star size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{staffStats.avgPerformance}</h3>
            <p>Ø Bewertung</p>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.staffManagement}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Personal Management</h1>
          <p>Verwalten Sie Ihr Team und planen Sie Schichten</p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowTimeTracking(true)}
            className={styles.secondaryButton}
          >
            <Clock size={20} />
            Zeiterfassung
          </button>
          <button
            onClick={() => setShowSchedule(true)}
            className={styles.secondaryButton}
          >
            <Calendar size={20} />
            Dienstplan
          </button>
          <button
            onClick={() => setShowAnalytics(true)}
            className={styles.secondaryButton}
          >
            <TrendingUp size={20} />
            Analytics
          </button>
          <button
            onClick={handleExportStaff}
            className={styles.secondaryButton}
          >
            <Download size={20} />
            Export
          </button>
          <button
            onClick={() => setShowStaffForm(true)}
            className={styles.primaryButton}
          >
            <UserPlus size={20} />
            Neuer Mitarbeiter
          </button>
        </div>
      </div>

      {/* Stats */}
      {renderStatsCards()}

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.searchAndFilter}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Personal suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className={styles.filters}>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">Alle Rollen</option>
              {Object.entries(STAFF_ROLES).map(([key, role]) => (
                <option key={key} value={key}>{role.name}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Alle Status</option>
              {Object.entries(STAFF_STATUS).map(([key, status]) => (
                <option key={key} value={key}>{status.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.viewToggle}>
          <button
            className={viewMode === 'list' ? styles.active : ''}
            onClick={() => setViewMode('list')}
          >
            Liste
          </button>
          <button
            className={viewMode === 'schedule' ? styles.active : ''}
            onClick={() => {
              setViewMode('schedule');
              setShowSchedule(true);
            }}
          >
            Dienstplan
          </button>
          <button
            className={viewMode === 'performance' ? styles.active : ''}
            onClick={() => {
              setViewMode('performance');
              setShowPerformance(true);
            }}
          >
            Leistung
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {viewMode === 'list' && (
          <div className={styles.staffList}>
            {filteredStaff.length > 0 ? (
              filteredStaff.map(renderStaffCard)
            ) : (
              <div className={styles.emptyState}>
                <Users size={48} />
                <h3>Kein Personal gefunden</h3>
                <p>Fügen Sie Ihren ersten Mitarbeiter hinzu oder passen Sie die Filter an</p>
                <button
                  onClick={() => setShowStaffForm(true)}
                  className={styles.primaryButton}
                >
                  <UserPlus size={20} />
                  Ersten Mitarbeiter hinzufügen
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lazy Loaded Modals */}
      {showStaffForm && (
        <Suspense fallback={<LoadingSpinner />}>
          <StaffForm
            staff={selectedStaff}
            roles={STAFF_ROLES}
            onSave={selectedStaff ? handleUpdateStaff : handleCreateStaff}
            onClose={() => {
              setShowStaffForm(false);
              setSelectedStaff(null);
            }}
          />
        </Suspense>
      )}

      {showSchedule && (
        <Suspense fallback={<LoadingSpinner />}>
          <ScheduleCalendar
            staff={staff}
            schedules={schedules}
            shifts={WORK_SHIFTS}
            onScheduleUpdate={(schedule) => console.log('Schedule updated:', schedule)}
            onClose={() => setShowSchedule(false)}
          />
        </Suspense>
      )}

      {showPerformance && (
        <Suspense fallback={<LoadingSpinner />}>
          <PerformanceTracker
            staff={staff}
            performance={performance}
            onPerformanceUpdate={(perf) => console.log('Performance updated:', perf)}
            onClose={() => setShowPerformance(false)}
          />
        </Suspense>
      )}

      {showAnalytics && (
        <Suspense fallback={<LoadingSpinner />}>
          <StaffAnalytics
            staff={staff}
            schedules={schedules}
            performance={performance}
            onClose={() => setShowAnalytics(false)}
          />
        </Suspense>
      )}

      {showTimeTracking && (
        <Suspense fallback={<LoadingSpinner />}>
          <TimeTracking
            staff={staff}
            onTimeUpdate={(timeData) => console.log('Time updated:', timeData)}
            onClose={() => setShowTimeTracking(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default StaffManagement;