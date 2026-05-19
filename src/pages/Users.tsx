import { useEffect, useState } from 'react';
import { Plus, X, Shield, Smartphone, Monitor, ChevronDown, Search, Filter, Eye, Check, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import type { Employee, Branch, UserAccount, UserAccountWithDetails, Permission, RolePermission, UserPermission } from '../lib/database.types';

const roleColors: Record<string, string> = {
  superadmin: 'bg-red-100 text-red-700',
  admin: 'bg-orange-100 text-orange-700',
  manager: 'bg-amber-100 text-amber-700',
  hr_staff: 'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-600',
};

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manajer',
  hr_staff: 'Staf HR',
  employee: 'Karyawan',
};

const deviceIcons: Record<string, typeof Monitor> = {
  web: Monitor,
  android: Smartphone,
  ios: Smartphone,
};

const moduleLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Karyawan',
  attendance: 'Kehadiran',
  leaves: 'Cuti',
  payroll: 'Penggajian',
  training: 'Training',
  departments: 'Departemen',
  'salary-formula': 'Formula Gaji',
  branches: 'Cabang',
  users: 'Pengguna',
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserAccountWithDetails[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<RolePermission[]>([]);
  const [userPerms, setUserPerms] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState<UserAccountWithDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Add user form
  const [addForm, setAddForm] = useState({
    employee_id: '',
    branch_id: '',
    role: 'employee' as UserAccount['role'],
    device_type: 'web' as UserAccount['device_type'],
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [userAccounts, empData, branchData, permData, rpData, upData] = await Promise.all([
      api.select('user_accounts', { order: 'created_at.desc' }),
      api.select('employees', { status_eq: 'active', order: 'first_name.asc' }),
      api.select('branches', { order: 'name.asc' }),
      api.select('permissions', { order: 'module.asc' }),
      api.select('role_permissions'),
      api.select('user_permissions'),
    ]);
    const employees = (empData || []) as Employee[];
    const branches = (branchData || []) as Branch[];
    const userAccountsData = (userAccounts || []) as UserAccount[];
    const usersWithDetails = userAccountsData.map(ua => ({
      ...ua,
      employees: employees.find(e => e.id === ua.employee_id) || null,
      branches: branches.find(b => b.id === ua.branch_id) || null,
    })) as UserAccountWithDetails[];
    setUsers(usersWithDetails);
    setEmployees(employees);
    setBranches(branches);
    setPermissions((permData || []) as Permission[]);
    setRolePerms((rpData || []) as RolePermission[]);
    setUserPerms((upData || []) as UserPermission[]);
    setLoading(false);
  }

  const filtered = users.filter(u => {
    const emp = u.employees as Employee | undefined;
    const matchSearch = !search || `${emp?.first_name} ${emp?.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    const matchBranch = !filterBranch || u.branch_id === filterBranch;
    return matchSearch && matchRole && matchBranch;
  });

  function getEffectivePermissions(userId: string): { allowed: string[]; denied: string[] } {
    const ua = users.find(u => u.id === userId);
    if (!ua) return { allowed: [], denied: [] };

    // Start with role permissions
    const rolePermIds = rolePerms
      .filter(rp => rp.role === ua.role)
      .map(rp => rp.permission_id);

    // Apply user overrides
    const overrides = userPerms.filter(up => up.user_account_id === userId);
    const allowOverrides = overrides.filter(o => o.access === 'allow').map(o => o.permission_id);
    const denyOverrides = overrides.filter(o => o.access === 'deny').map(o => o.permission_id);

    const allowed = [...new Set([...rolePermIds, ...allowOverrides])].filter(id => !denyOverrides.includes(id));
    return { allowed, denied: denyOverrides };
  }

  async function handleAddUser() {
    if (!addForm.employee_id) { setError('Pilih karyawan.'); return; }
    setSaving(true);
    setError('');

    // Check if user account already exists for this employee
    const existing = users.find(u => u.employee_id === addForm.employee_id);
    if (existing) {
      setError('Karyawan ini sudah memiliki akun pengguna.');
      setSaving(false);
      return;
    }

    // Create auth user via signup (password will be set by user)
    const emp = employees.find(e => e.id === addForm.employee_id);
    if (!emp) { setError('Karyawan tidak ditemukan.'); setSaving(false); return; }

    const tempPassword = `HRIS${Date.now()}!`;
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: emp.email,
      password: tempPassword,
    });

    if (authErr || !authData.user) {
      setError(authErr?.message || 'Gagal membuat akun.');
      setSaving(false);
      return;
    }

    // Create user_account record
    try {
      await api.insert('user_accounts', {
        user_id: authData.user.id,
        employee_id: addForm.employee_id,
        branch_id: addForm.branch_id || null,
        role: addForm.role,
        device_type: addForm.device_type,
        is_active: true,
      });
    } catch (uaErr: any) {
      setError(uaErr.message || 'Gagal membuat akun pengguna.');
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowAddModal(false);
    fetchData();
  }

  async function toggleActive(ua: UserAccount) {
    await api.update('user_accounts', ua.id, { is_active: !ua.is_active });
    fetchData();
  }

  async function updateRole(ua: UserAccount, role: string) {
    await api.update('user_accounts', ua.id, { role });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus akun pengguna ini?')) return;
    await api.delete('user_accounts', id);
    fetchData();
  }

  async function togglePermission(userId: string, permId: string, currentAccess: 'allow' | 'deny' | null) {
    if (currentAccess === 'deny') {
      // Remove deny override -> revert to role default
      const records = await api.select('user_permissions', { filter: `user_account_id.eq.${userId},permission_id.eq.${permId}` });
      if (records.length > 0) {
        await api.delete('user_permissions', records[0].id);
      }
    } else if (currentAccess === 'allow') {
      // Remove explicit allow
      const records = await api.select('user_permissions', { filter: `user_account_id.eq.${userId},permission_id.eq.${permId}` });
      if (records.length > 0) {
        await api.delete('user_permissions', records[0].id);
      }
    } else {
      // No override -> add deny
      await api.insert('user_permissions', { user_account_id: userId, permission_id: permId, access: 'deny' });
    }
    fetchData();
  }

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengguna & Permisi</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola akun pengguna dan batasan akses per modul</p>
        </div>
        <button onClick={() => { setAddForm({ employee_id: '', branch_id: '', role: 'employee', device_type: 'web' }); setError(''); setShowAddModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Tambah Pengguna
        </button>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-5 gap-3">
        {(['superadmin', 'admin', 'manager', 'hr_staff', 'employee'] as const).map(role => {
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[role]}`}>{roleLabels[role]}</span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
              <p className="text-xs text-gray-400">pengguna</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama karyawan..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer">
              <option value="">Semua Role</option>
              {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
            <option value="">Semua Cabang</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Belum ada akun pengguna</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Pengguna</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Cabang</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Perangkat</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(ua => {
                  const emp = ua.employees as Employee | undefined;
                  const branch = ua.branches as Branch | undefined;
                  const DeviceIcon = deviceIcons[ua.device_type] || Monitor;
                  const { allowed, denied } = getEffectivePermissions(ua.id);
                  return (
                    <tr key={ua.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {emp?.first_name?.[0]}{emp?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp?.first_name} {emp?.last_name}</p>
                            <p className="text-xs text-gray-400">{emp?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{branch?.name || '-'}</td>
                      <td className="py-3 px-4">
                        <select
                          value={ua.role}
                          onChange={e => updateRole(ua, e.target.value)}
                          className="text-xs font-medium px-2 py-1 rounded-full appearance-none cursor-pointer border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                          style={{ color: 'inherit' }}
                        >
                          {Object.entries(roleLabels).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <DeviceIcon className="w-4 h-4" />
                          <span className="capitalize text-xs">{ua.device_type}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => toggleActive(ua)} className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${ua.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                          {ua.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setShowPermModal(ua)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-500 hover:text-blue-600" title="Atur Permisi">
                            <Shield className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(ua.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-500 hover:text-red-600" title="Hapus">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Tambah Pengguna</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Karyawan <span className="text-red-500">*</span></label>
                <select value={addForm.employee_id} onChange={e => setAddForm(f => ({ ...f, employee_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Pilih Karyawan</option>
                  {employees.filter(e => !users.find(u => u.employee_id === e.id)).map(e => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cabang</label>
                <select value={addForm.branch_id} onChange={e => setAddForm(f => ({ ...f, branch_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Semua Cabang</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                  <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value as UserAccount['role'] }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Perangkat</label>
                  <select value={addForm.device_type} onChange={e => setAddForm(f => ({ ...f, device_type: e.target.value as UserAccount['device_type'] }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="web">Web</option>
                    <option value="android">Android</option>
                    <option value="ios">iOS</option>
                  </select>
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-amber-700">Akun akan dibuat dengan email karyawan sebagai login. Password sementara akan di-generate otomatis dan perlu diubah saat login pertama.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
              <button onClick={handleAddUser} disabled={saving || !addForm.employee_id} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                {saving ? 'Membuat...' : 'Buat Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {showPermModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Atur Permisi</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(showPermModal.employees as Employee | undefined)?.first_name} {(showPermModal.employees as Employee | undefined)?.last_name} · <span className={`px-1.5 py-0.5 rounded-full text-xs ${roleColors[showPermModal.role]}`}>{roleLabels[showPermModal.role]}</span>
                </p>
              </div>
              <button onClick={() => setShowPermModal(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <p className="text-xs text-gray-500">Klik ikon untuk mengubah akses. <span className="text-emerald-600">Hijau = diizinkan</span>, <span className="text-red-600">Merah = ditolak</span>, <span className="text-gray-400">Abu = default role</span></p>

              {Object.entries(permissionsByModule).map(([module, perms]) => {
                const { allowed, denied } = getEffectivePermissions(showPermModal.id);
                return (
                  <div key={module}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{moduleLabels[module] || module}</h3>
                    <div className="space-y-1.5">
                      {perms.map(perm => {
                        const isAllowed = allowed.includes(perm.id);
                        const isDenied = denied.includes(perm.id);
                        const userOverride = userPerms.find(up => up.user_account_id === showPermModal.id && up.permission_id === perm.id);
                        const hasOverride = !!userOverride;

                        return (
                          <div key={perm.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                            <div>
                              <p className="text-sm text-gray-800">{perm.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{perm.code}</p>
                            </div>
                            <button
                              onClick={() => togglePermission(showPermModal.id, perm.id, hasOverride ? userOverride!.access : null)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isDenied
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                  : isAllowed
                                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                    : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                              }`}
                              title={isDenied ? 'Ditolak (klik untuk kembali ke default role)' : isAllowed && hasOverride ? 'Diizinkan eksplisit (klik untuk hapus)' : isAllowed ? 'Diizinkan oleh role (klik untuk tolak)' : 'Tidak diizinkan oleh role'}
                            >
                              {isDenied ? <Ban className="w-4 h-4" /> : isAllowed ? <Check className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-6 border-t border-gray-100 shrink-0">
              <button onClick={() => setShowPermModal(null)} className="w-full px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
