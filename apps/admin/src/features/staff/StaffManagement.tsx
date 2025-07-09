import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Clock,
  Shield,
  Award,
  ChevronDown,
  MoreVertical,
  Star,
  AlertCircle,
  Check,
  X,
  Key,
  Download,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { useTenantStore } from '../../stores/tenant.store';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  permissions: string[];
  department?: string;
  position?: string;
  employeeId?: string;
  hireDate: Date;
  birthDate?: Date;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  isActive: boolean;
  lastLogin?: Date;
  avatar?: string;
  schedule?: WeekSchedule;
  hourlyRate?: number;
  performance?: {
    rating: number;
    ordersHandled: number;
    averageServiceTime: number;
    customerRating: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

type StaffRole = 'admin' | 'manager' | 'chef' | 'waiter' | 'cashier' | 'delivery' | 'support';

interface WeekSchedule {
  [key: string]: DaySchedule; // monday, tuesday, etc.
}

interface DaySchedule {
  isWorking: boolean;
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
}

interface StaffFormData {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  department: string;
  position: string;
  employeeId: string;
  hireDate: string;
  birthDate: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  hourlyRate: number;
  password?: string;
}

export function StaffManagement() {
  const { user, hasPermission } = useAuth();
  const { tenant } = useTenantStore();
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<StaffRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showSchedule, setShowSchedule] = useState<string | null>(null);
  const [formData, setFormData] = useState<StaffFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'waiter',
    department: '',
    position: '',
    employeeId: '',
    hireDate: '',
    birthDate: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    hourlyRate: 0,
    password: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tenant?.id) {
      loadStaff();
    }
  }, [tenant?.id]);

  const loadStaff = async () => {
    if (!tenant?.id) return;
    
    try {
      setLoading(true);
      
      const staffQuery = query(
        collection(db, 'staff'),
        where('tenantId', '==', tenant.id)
      );
      const snapshot = await getDocs(staffQuery);
      
      const staffData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        hireDate: doc.data().hireDate?.toDate() || new Date(),
        birthDate: doc.data().birthDate?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as StaffMember));
      
      setStaff(staffData);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email';
    
    if (!editingStaff && !formData.password) {
      errors.password = 'Password is required for new staff';
    } else if (!editingStaff && formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.role) errors.role = 'Role is required';
    if (!formData.hireDate) errors.hireDate = 'Hire date is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !tenant?.id) return;
    
    try {
      setLoading(true);
      
      const staffData: any = {
        tenantId: tenant.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        position: formData.position,
        employeeId: formData.employeeId,
        hireDate: new Date(formData.hireDate),
        address: formData.address,
        hourlyRate: formData.hourlyRate,
        isActive: true,
        permissions: getDefaultPermissions(formData.role),
        updatedAt: serverTimestamp()
      };
      
      if (formData.birthDate) {
        staffData.birthDate = new Date(formData.birthDate);
      }
      
      if (formData.emergencyContactName) {
        staffData.emergencyContact = {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: formData.emergencyContactRelationship
        };
      }
      
      if (editingStaff) {
        // Update existing staff
        await updateDoc(doc(db, 'staff', editingStaff.id), staffData);
      } else {
        // Create new staff
        staffData.createdAt = serverTimestamp();
        
        // Create Firebase Auth user
        if (formData.password) {
          try {
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              formData.email,
              formData.password
            );
            
            // Also create admin user record
            await addDoc(collection(db, 'admins'), {
              uid: userCredential.user.uid,
              ...staffData
            });
          } catch (authError: any) {
            console.error('Error creating auth user:', authError);
            setFormErrors({ email: authError.message });
            return;
          }
        }
        
        await addDoc(collection(db, 'staff'), staffData);
      }
      
      await loadStaff();
      resetForm();
    } catch (error) {
      console.error('Error saving staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      await deleteDoc(doc(db, 'staff', staffId));
      setStaff(staff.filter(s => s.id !== staffId));
    } catch (error) {
      console.error('Error deleting staff:', error);
    }
  };

  const handleToggleActive = async (staffId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'staff', staffId), {
        isActive,
        updatedAt: serverTimestamp()
      });
      
      setStaff(staff.map(s => 
        s.id === staffId ? { ...s, isActive } : s
      ));
    } catch (error) {
      console.error('Error updating staff status:', error);
    }
  };

  const getDefaultPermissions = (role: StaffRole): string[] => {
    switch (role) {
      case 'admin':
        return ['orders:*', 'products:*', 'staff:*', 'reports:*', 'settings:*'];
      case 'manager':
        return ['orders:*', 'products:*', 'staff:read', 'reports:*'];
      case 'chef':
        return ['orders:read', 'orders:update', 'products:read', 'inventory:*'];
      case 'waiter':
        return ['orders:*', 'products:read'];
      case 'cashier':
        return ['orders:*', 'payments:*', 'reports:read'];
      case 'delivery':
        return ['orders:read', 'orders:update', 'delivery:*'];
      default:
        return ['orders:read'];
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'waiter',
      department: '',
      position: '',
      employeeId: '',
      hireDate: '',
      birthDate: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      hourlyRate: 0,
      password: ''
    });
    setFormErrors({});
    setShowForm(false);
    setEditingStaff(null);
  };

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
      department: member.department || '',
      position: member.position || '',
      employeeId: member.employeeId || '',
      hireDate: format(member.hireDate, 'yyyy-MM-dd'),
      birthDate: member.birthDate ? format(member.birthDate, 'yyyy-MM-dd') : '',
      address: member.address || '',
      emergencyContactName: member.emergencyContact?.name || '',
      emergencyContactPhone: member.emergencyContact?.phone || '',
      emergencyContactRelationship: member.emergencyContact?.relationship || '',
      hourlyRate: member.hourlyRate || 0
    });
    setShowForm(true);
  };

  const exportStaff = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Role', 'Department', 'Position', 'Status', 'Hire Date'].join(','),
      ...staff.map(s => [
        s.name,
        s.email,
        s.phone || '',
        s.role,
        s.department || '',
        s.position || '',
        s.isActive ? 'Active' : 'Inactive',
        format(s.hireDate, 'yyyy-MM-dd')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && member.isActive) ||
                         (filterStatus === 'inactive' && !member.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: StaffRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'chef': return 'bg-orange-100 text-orange-700';
      case 'waiter': return 'bg-green-100 text-green-700';
      case 'cashier': return 'bg-yellow-100 text-yellow-700';
      case 'delivery': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const canEdit = hasPermission('staff:write');
  const canDelete = hasPermission('staff:delete');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage your team members and their schedules</p>
        </div>
        
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={exportStaff}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Staff
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{staff.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {staff.filter(s => s.isActive).length}
              </p>
            </div>
            <Check className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">On Shift</p>
              <p className="text-2xl font-bold text-gray-900">
                {/* This would calculate based on current time and schedules */}
                0
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">4.5</p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="chef">Chef</option>
            <option value="waiter">Waiter</option>
            <option value="cashier">Cashier</option>
            <option value="delivery">Delivery</option>
            <option value="support">Support</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No staff members found</p>
          {canEdit && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Staff Member
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.map(member => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {member.avatar ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={member.avatar}
                            alt={member.name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        {member.employeeId && (
                          <div className="text-sm text-gray-500">ID: {member.employeeId}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.email}</div>
                    {member.phone && (
                      <div className="text-sm text-gray-500">{member.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(member.id, !member.isActive)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                      disabled={!canEdit}
                    >
                      {member.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowSchedule(showSchedule === member.id ? null : member.id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteStaff(member.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.name ? 'border-red-500' : ''
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.email ? 'border-red-500' : ''
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.role ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="waiter">Waiter</option>
                    <option value="chef">Chef</option>
                    <option value="cashier">Cashier</option>
                    <option value="delivery">Delivery</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="support">Support</option>
                  </select>
                  {formErrors.role && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.role}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hire Date *
                  </label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.hireDate ? 'border-red-500' : ''
                    }`}
                  />
                  {formErrors.hireDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.hireDate}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate (CHF)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {!editingStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.password ? 'border-red-500' : ''
                      }`}
                    />
                    {formErrors.password && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Name"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Relationship"
                      value={formData.emergencyContactRelationship}
                      onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : (editingStaff ? 'Update' : 'Add')} Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
