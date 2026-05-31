"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Shield, 
  ShieldAlert, 
  UserX, 
  UserCheck, 
  Edit2, 
  Check, 
  X, 
  Lock, 
  Unlock,
  AlertTriangle,
  Search,
  UserPlus
} from 'lucide-react';
import type { User, UserRole } from '@/types';

// Definition of all modules and their granular permissions
const PERMISSIONS_LIST = [
  {
    module: 'إدارة الرحلات ✈️',
    perms: [
      { key: 'trips:read', label: 'عرض الرحلات' },
      { key: 'trips:write', label: 'إضافة وتعديل الرحلات' },
      { key: 'trips:delete', label: 'حذف الرحلات' }
    ]
  },
  {
    module: 'إدارة السيارات 🚗',
    perms: [
      { key: 'cars:read', label: 'عرض السيارات' },
      { key: 'cars:write', label: 'إضافة وتعديل السيارات' },
      { key: 'cars:delete', label: 'حذف السيارات' }
    ]
  },
  {
    module: 'إدارة الحاويات 📦',
    perms: [
      { key: 'containers:read', label: 'عرض الحاويات' },
      { key: 'containers:write', label: 'إضافة وتعديل الحاويات' },
      { key: 'containers:delete', label: 'حذف الحاويات' }
    ]
  },
  {
    module: 'إدارة النفقات والالتزامات 💸',
    perms: [
      { key: 'expenses:read', label: 'عرض النفقات والديون' },
      { key: 'expenses:write', label: 'إضافة وتعديل النفقات والديون' },
      { key: 'expenses:delete', label: 'حذف النفقات والديون' }
    ]
  },
  {
    module: 'إدارة المبيعات 💰',
    perms: [
      { key: 'sales:read', label: 'عرض المبيعات' },
      { key: 'sales:write', label: 'إضافة وتعديل المبيعات' },
      { key: 'sales:delete', label: 'حذف المبيعات' }
    ]
  },
  {
    module: 'إدارة الأقساط 📋',
    perms: [
      { key: 'installments:read', label: 'عرض الأقساط' },
      { key: 'installments:write', label: 'إضافة وتعديل الأقساط' },
      { key: 'installments:delete', label: 'حذف الأقساط' }
    ]
  },
  {
    module: 'الصرف والعملات 🔄',
    perms: [
      { key: 'exchange:read', label: 'عرض الصرف وتغذية رأس المال' },
      { key: 'exchange:write', label: 'إجراء عمليات الصرف ورأس المال' },
      { key: 'exchange:delete', label: 'حذف عمليات الصرف' }
    ]
  },
  {
    module: 'الميزانية والتقارير 🏛️',
    perms: [
      { key: 'reports:read', label: 'عرض الميزانية العمومية والتقارير المالية' }
    ]
  },
  {
    module: 'إدارة النظام 👥',
    perms: [
      { key: 'users:manage', label: 'إدارة المستخدمين وتوزيع الصلاحيات (أدمن فقط)' }
    ]
  }
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
}

export default function UsersManagementPage() {
  const { profile: currentAdmin, loading: authLoading } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'viewer' as UserRole,
  });
  const [creating, setCreating] = useState(false);
  
  // Modal Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<{
    role: UserRole;
    permissions: string[];
    is_active: boolean;
  }>({
    role: 'viewer',
    permissions: [],
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/users');
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل جلب المستخدمين');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentAdmin?.role === 'admin') {
      setTimeout(() => {
        fetchUsers();
      }, 0);
    }
  }, [authLoading, currentAdmin]);

  // Handle Instant Suspension Toggle
  const handleToggleStatus = async (user: User) => {
    if (user.id === currentAdmin?.id) {
      setError('لا يمكنك تجميد حسابك الشخصي!');
      return;
    }

    try {
      const updatedStatus = !user.is_active;
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          role: user.role,
          permissions: user.permissions || [],
          is_active: updatedStatus
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل تعديل حالة الحساب');
      }

      setSuccess(`تم ${updatedStatus ? 'تفعيل' : 'تجميد'} حساب ${user.name} بنجاح!`);
      // Update local state
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: updatedStatus } : u));
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setTimeout(() => setError(''), 5000);
    }
  };

  // Open Edit Modal
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role,
      permissions: user.permissions || [],
      is_active: user.is_active ?? true
    });
    setEditModalOpen(true);
    setError('');
  };

  // Pre-fill recommended permissions when role changes
  const handleRoleChange = (newRole: UserRole) => {
    let recommendedPerms: string[] = [];
    
    if (newRole === 'admin') {
      // Admins get everything
      recommendedPerms = PERMISSIONS_LIST.flatMap(m => m.perms.map(p => p.key));
    } else if (newRole === 'user') {
      // Managers get everything except users:manage
      recommendedPerms = PERMISSIONS_LIST.flatMap(m => 
        m.perms.map(p => p.key).filter(k => k !== 'users:manage')
      );
    } else {
      // Viewers only get read-only permissions
      recommendedPerms = PERMISSIONS_LIST.flatMap(m => 
        m.perms.map(p => p.key).filter(k => k.endsWith(':read'))
      );
    }

    setEditForm(prev => ({
      ...prev,
      role: newRole,
      permissions: recommendedPerms
    }));
  };

  const getRecommendedPermissions = (role: UserRole) => {
    if (role === 'admin') {
      return PERMISSIONS_LIST.flatMap(m => m.perms.map(p => p.key));
    }

    if (role === 'user') {
      return PERMISSIONS_LIST.flatMap(m =>
        m.perms.map(p => p.key).filter(k => k !== 'users:manage')
      );
    }

    return PERMISSIONS_LIST.flatMap(m =>
      m.perms.map(p => p.key).filter(k => k.endsWith(':read'))
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          permissions: getRecommendedPermissions(createForm.role),
          is_active: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل إنشاء المستخدم');
      }

      const createdUser = await response.json();
      setUsers(prev => [createdUser, ...prev]);
      setCreateForm({ name: '', username: '', password: '', role: 'viewer' });
      setSuccess(`تم إنشاء المستخدم ${createdUser.username || createdUser.name} بنجاح`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setTimeout(() => setError(''), 5000);
    } finally {
      setCreating(false);
    }
  };

  // Handle individual permission checkbox toggle
  const handlePermissionToggle = (permKey: string) => {
    setEditForm(prev => {
      const isChecked = prev.permissions.includes(permKey);
      const updatedPerms = isChecked
        ? prev.permissions.filter(k => k !== permKey)
        : [...prev.permissions, permKey];
      
      return {
        ...prev,
        permissions: updatedPerms
      };
    });
  };

  // Submit User Edits
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          role: editForm.role,
          permissions: editForm.permissions,
          is_active: editForm.is_active
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل حفظ الصلاحيات');
      }

      setSuccess(`تم تحديث صلاحيات ${selectedUser.name} بنجاح!`);
      setEditModalOpen(false);
      fetchUsers();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const totalUsers = users.length;
  const activeUsersCount = users.filter(u => u.is_active).length;
  const suspendedUsersCount = users.filter(u => !u.is_active).length;

  if (authLoading) {
    return (
      <RtlLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A7C6E]"></div>
        </div>
      </RtlLayout>
    );
  }

  // Security barrier: non-admins cannot access this page DYNAMICS
  if (currentAdmin?.role !== 'admin') {
    return (
      <RtlLayout>
        <div className="p-6 max-w-lg mx-auto mt-12">
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="text-center pb-2">
              <ShieldAlert className="w-16 h-16 text-red-600 mx-auto mb-2 animate-bounce" />
              <h2 className="text-2xl font-bold text-red-700">غير مصرح بالدخول</h2>
            </CardHeader>
            <CardContent className="text-center text-red-600 text-sm">
              <p>عذراً، هذه الصفحة مخصصة لمدير النظام فقط. لا يمكنك استعراض أو تعديل صلاحيات المستخدمين.</p>
            </CardContent>
          </Card>
        </div>
      </RtlLayout>
    );
  }

  return (
    <RtlLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0a2540] tracking-tight">👤 إدارة المستخدمين والصلاحيات</h1>
            <p className="text-slate-500 text-sm mt-1">تفعيل وتجميد الحسابات، وترقية الأدوار وتخصيص صلاحيات العمليات التفصيلية للموظفين.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="border-slate-100 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 opacity-60"></div>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">إجمالي المستخدمين</p>
                <h3 className="text-3xl font-black text-slate-800 mt-2">{totalUsers}</h3>
              </div>
              <div className="bg-blue-100 text-blue-600 p-3.5 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -z-10 opacity-60"></div>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">الحسابات النشطة</p>
                <h3 className="text-3xl font-black text-green-700 mt-2">{activeUsersCount}</h3>
              </div>
              <div className="bg-green-100 text-green-600 p-3.5 rounded-2xl">
                <UserCheck className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10 opacity-60"></div>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">المجمدة / المعطلة</p>
                <h3 className="text-3xl font-black text-amber-700 mt-2">{suspendedUsersCount}</h3>
              </div>
              <div className="bg-amber-100 text-amber-600 p-3.5 rounded-2xl">
                <UserX className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Alerts */}
        {error && (
          <div className="bg-red-50 border-r-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center gap-3 text-sm font-semibold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-r-4 border-green-500 text-green-700 p-4 rounded-lg flex items-center gap-3 text-sm font-semibold">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
              <UserPlus className="w-5 h-5 text-[#0A7C6E]" />
              إضافة مستخدم جديد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="new-name">اسم الموظف</Label>
                <Input
                  id="new-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: أحمد محمد"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-username">اسم المستخدم</Label>
                <Input
                  id="new-username"
                  dir="ltr"
                  value={createForm.username}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="ahmed"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">كلمة المرور</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-role">الدور</Label>
                <select
                  id="new-role"
                  value={createForm.role}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  className="w-full h-10 bg-white border border-slate-200 rounded-md px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0A7C6E]/40 focus:border-[#0A7C6E]"
                >
                  <option value="viewer">مشاهد</option>
                  <option value="user">موظف عمليات</option>
                  <option value="admin">مدير عام</option>
                </select>
              </div>

              <Button
                type="submit"
                className="bg-[#0A7C6E] hover:bg-[#0A7C6E]/90 text-white font-bold"
                disabled={creating}
              >
                <UserPlus className="w-4 h-4 ml-2" />
                {creating ? 'جاري الإضافة...' : 'إضافة مستخدم'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Table & Filtering */}
        <Card className="border-slate-100 shadow-sm">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800">قائمة المستخدمين المسجلين</h2>
            
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute right-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <Input
                placeholder="البحث بالاسم أو اسم المستخدم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 text-sm focus:ring-[#0A7C6E]"
              />
            </div>
          </div>

          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A7C6E] mx-auto"></div>
                <p className="text-slate-400 text-sm mt-3">جاري تحميل المستخدمين...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">لم يتم العثور على مستخدمين يطابقون البحث.</p>
              </div>
            ) : (
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <th className="px-6 py-4">الموظف</th>
                    <th className="px-6 py-4">اسم المستخدم</th>
                    <th className="px-6 py-4">الدور الوظيفي</th>
                    <th className="px-6 py-4">حالة الحساب</th>
                    <th className="px-6 py-4">تاريخ التسجيل</th>
                    <th className="px-6 py-4 text-center">العمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isAdmin = user.role === 'admin';
                    const isSelf = user.id === currentAdmin?.id;

                    return (
                      <tr 
                        key={user.id} 
                        className={`transition-colors hover:bg-slate-50/50 ${!user.is_active ? 'bg-amber-50/10' : ''}`}
                      >
                        <td className="px-6 py-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{user.name || 'مستخدم جديد'}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-normal">أنت</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono font-medium" dir="ltr">
                          {user.username || user.email.split('@')[0]}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            isAdmin 
                              ? 'bg-red-50 text-red-700' 
                              : user.role === 'user' 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Shield className="w-3.5 h-3.5" />
                            {isAdmin ? 'مدير عام' : user.role === 'user' ? 'موظف عمليات' : 'مشاهد'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            disabled={isSelf}
                            onClick={() => handleToggleStatus(user)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              user.is_active 
                                ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={isSelf ? 'لا يمكنك تجميد حسابك' : user.is_active ? 'تجميد الحساب' : 'تفعيل الحساب'}
                          >
                            {user.is_active ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>نشط</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>مجمد</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {new Date(user.created_at).toLocaleDateString('ar-LY', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-[#0A7C6E] hover:bg-[#0A7C6E]/5 hover:text-[#0A7C6E] border-slate-200"
                              onClick={() => openEditModal(user)}
                            >
                              <Edit2 className="w-3.5 h-3.5 ml-1.5" />
                              الصلاحيات
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Permissions custom dialog modal */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white shadow-2xl rounded-2xl overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800">صلاحيات المستخدم: {selectedUser.name || 'مستخدم جديد'}</h3>
                <p className="text-xs text-slate-500 mt-1">تحديد دور الموظف وحقوق قراءة وتعديل وحذف كل مورد في النظام.</p>
              </div>
              <button 
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-200/50 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-auto p-6 space-y-6">
              {/* Role Select & Active State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-2">
                  <Label htmlFor="role-select" className="font-bold text-slate-700">الدور الوظيفي العام</Label>
                  <select
                    id="role-select"
                    value={editForm.role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    disabled={selectedUser.id === currentAdmin?.id}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0A7C6E]/40 focus:border-[#0A7C6E]"
                  >
                    <option value="viewer">مشاهد (viewer) - قراءة فقط بشكل افتراضي</option>
                    <option value="user">موظف عمليات (user) - إضافة وتعديل بشكل افتراضي</option>
                    <option value="admin">مدير عام (admin) - صلاحيات كاملة للنظام والمستخدمين</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">حالة نشاط الحساب</Label>
                  <div className="flex items-center h-10 mt-1">
                    <button
                      type="button"
                      disabled={selectedUser.id === currentAdmin?.id}
                      onClick={() => setEditForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        editForm.is_active 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      } disabled:opacity-50`}
                    >
                      {editForm.is_active ? (
                        <>
                          <Unlock className="w-4 h-4" />
                          <span>الحساب مفعل ونشط</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>الحساب مجمد ومعطل</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="space-y-4">
                <h4 className="font-black text-slate-700 pb-1.5 border-b border-slate-100">تفاصيل صلاحيات الموديولات والصفحات</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {PERMISSIONS_LIST.map((moduleData) => (
                    <div 
                      key={moduleData.module} 
                      className="border border-slate-100 rounded-xl p-4 bg-white shadow-xs space-y-3"
                    >
                      <h5 className="font-bold text-slate-800 text-sm bg-slate-50 -mx-4 -mt-4 p-3 rounded-t-xl border-b border-slate-100">
                        {moduleData.module}
                      </h5>
                      <div className="space-y-2.5 pt-1.5">
                        {moduleData.perms.map((perm) => {
                          const isChecked = editForm.permissions.includes(perm.key);
                          const isDisabled = editForm.role === 'admin'; // Admins always have everything checked

                          return (
                            <label 
                              key={perm.key} 
                              className={`flex items-start gap-3 cursor-pointer select-none text-slate-600 ${
                                isDisabled ? 'opacity-70 cursor-not-allowed' : 'hover:text-slate-900'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isDisabled ? true : isChecked}
                                disabled={isDisabled}
                                onChange={() => handlePermissionToggle(perm.key)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0A7C6E] focus:ring-[#0A7C6E]"
                              />
                              <div className="text-xs font-semibold">
                                <p className={isChecked || isDisabled ? 'text-slate-800 font-bold' : ''}>
                                  {perm.label}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{perm.key}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="border-slate-200"
                onClick={() => setEditModalOpen(false)}
              >
                إلغاء
              </Button>
              <Button 
                type="button"
                className="bg-[#0A7C6E] hover:bg-[#0A7C6E]/90 text-white font-bold"
                onClick={handleSaveUser}
                disabled={submitting}
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </RtlLayout>
  );
}
