import { useEffect, useState } from 'react';
import { Search, Plus, Filter, X, CreditCard as Edit2, Trash2, Eye, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import type { Employee, Department, Position } from '../lib/database.types';

type EmployeeWithRelations = Employee & {
  departments?: Department | null;
  positions?: Position | null;
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  terminated: 'bg-red-100 text-red-700',
  'on-leave': 'bg-amber-100 text-amber-700',
};

const statusLabels: Record<string, string> = {
  active: 'Aktif', inactive: 'Tidak Aktif', terminated: 'Diberhentikan', 'on-leave': 'Cuti',
};

const typeLabels: Record<string, string> = {
  'full-time': 'Penuh Waktu', 'part-time': 'Paruh Waktu', contract: 'Kontrak', intern: 'Magang',
};

interface EmployeeFormData {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position_id: string;
  department_id: string;
  employment_type: string;
  status: string;
  hire_date: string;
  birth_date: string;
  gender: string;
  city: string;
  address: string;
  salary: string;
}

const emptyForm: EmployeeFormData = {
  employee_id: '', first_name: '', last_name: '', email: '', phone: '',
  position_id: '', department_id: '', employment_type: 'full-time', status: 'active',
  hire_date: '', birth_date: '', gender: '', city: '', address: '', salary: '',
};

export default function Employees() {
  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState<EmployeeWithRelations | null>(null);
  const [editEmployee, setEditEmployee] = useState<EmployeeWithRelations | null>(null);
  const [form, setForm] = useState<EmployeeFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [employees, departments, positions] = await Promise.all([
      api.select('employees', { order: 'created_at.desc' }),
      api.select('departments', { order: 'name.asc' }),
      api.select('positions', { order: 'title.asc' }),
    ]);
    const employeesWithRelations = (employees as any[]).map(e => ({
      ...e,
      departments: (departments as Department[]).find(d => d.id === e.department_id) || null,
      positions: (positions as Position[]).find(p => p.id === e.position_id) || null,
    }));
    setEmployees(employeesWithRelations);
    setDepartments(departments as Department[]);
    setPositions(positions as Position[]);
    setLoading(false);
  }

  const filtered = employees.filter(e => {
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
    const matchSearch = !search || fullName.includes(search.toLowerCase()) || e.employee_id.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = !filterDept || e.department_id === filterDept;
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  function openAdd() {
    setEditEmployee(null);
    setForm({ ...emptyForm, employee_id: `EMP${String(employees.length + 1).padStart(3, '0')}` });
    setError('');
    setShowModal(true);
  }

  function openEdit(emp: EmployeeWithRelations) {
    setEditEmployee(emp);
    setForm({
      employee_id: emp.employee_id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone,
      position_id: emp.position_id || '',
      department_id: emp.department_id || '',
      employment_type: emp.employment_type,
      status: emp.status,
      hire_date: emp.hire_date,
      birth_date: emp.birth_date || '',
      gender: emp.gender,
      city: emp.city,
      address: emp.address,
      salary: String(emp.salary),
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.first_name || !form.last_name || !form.email || !form.hire_date) {
      setError('Nama, email, dan tanggal bergabung wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      employee_id: form.employee_id,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone,
      position_id: form.position_id || null,
      department_id: form.department_id || null,
      employment_type: form.employment_type as Employee['employment_type'],
      status: form.status as Employee['status'],
      hire_date: form.hire_date,
      birth_date: form.birth_date || null,
      gender: form.gender as Employee['gender'],
      city: form.city,
      address: form.address,
      salary: Number(form.salary) || 0,
    };

    if (editEmployee) {
      try {
        await api.update('employees', editEmployee.id, payload);
      } catch (err: any) {
        setError(err.message || 'Gagal memperbarui karyawan');
        setSaving(false);
        return;
      }
    } else {
      try {
        await api.insert('employees', payload);
      } catch (err: any) {
        setError(err.message || 'Gagal menambah karyawan');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowModal(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus karyawan ini?')) return;
    await api.delete('employees', id);
    fetchData();
  }

  const filteredPositions = form.department_id ? positions.filter(p => p.department_id === form.department_id) : positions;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Karyawan</h1>
          <p className="text-sm text-gray-500 mt-1">{employees.length} total karyawan terdaftar</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Tambah Karyawan
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, ID, email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer">
              <option value="">Semua Departemen</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="pl-4 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer">
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
              <option value="terminated">Diberhentikan</option>
              <option value="on-leave">Cuti</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">Tidak ada karyawan ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Karyawan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Departemen</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Jabatan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Tipe</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Bergabung</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-gray-400">{emp.employee_id} · {emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{emp.departments?.name || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{emp.positions?.title || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{typeLabels[emp.employment_type]}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[emp.status]}`}>
                        {statusLabels[emp.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(emp.hire_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setShowView(emp)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(emp)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-500 hover:text-blue-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(emp.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Detail Karyawan</h2>
              <button onClick={() => setShowView(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {showView.first_name[0]}{showView.last_name[0]}
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{showView.first_name} {showView.last_name}</p>
                  <p className="text-gray-500">{showView.positions?.title || '-'} · {showView.departments?.name || '-'}</p>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full mt-1 inline-block ${statusColors[showView.status]}`}>{statusLabels[showView.status]}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['ID Karyawan', showView.employee_id],
                  ['Email', showView.email],
                  ['Telepon', showView.phone || '-'],
                  ['Kota', showView.city || '-'],
                  ['Tanggal Bergabung', new Date(showView.hire_date).toLocaleDateString('id-ID')],
                  ['Tipe Kerja', typeLabels[showView.employment_type]],
                  ['Gaji', `Rp ${showView.salary.toLocaleString('id-ID')}`],
                  ['Gender', showView.gender === 'male' ? 'Laki-laki' : showView.gender === 'female' ? 'Perempuan' : '-'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-800 truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{editEmployee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'ID Karyawan', key: 'employee_id', type: 'text', required: true },
                  { label: 'Email', key: 'email', type: 'email', required: true, colSpan: 2 },
                  { label: 'Nama Depan', key: 'first_name', type: 'text', required: true },
                  { label: 'Nama Belakang', key: 'last_name', type: 'text', required: true },
                  { label: 'Telepon', key: 'phone', type: 'text' },
                  { label: 'Kota', key: 'city', type: 'text' },
                  { label: 'Tanggal Bergabung', key: 'hire_date', type: 'date', required: true },
                  { label: 'Tanggal Lahir', key: 'birth_date', type: 'date' },
                  { label: 'Gaji (Rp)', key: 'salary', type: 'number' },
                ].map(field => (
                  <div key={field.key} className={field.colSpan === 2 ? 'col-span-2' : ''}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}</label>
                    <input
                      type={field.type}
                      value={form[field.key as keyof EmployeeFormData]}
                      onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Departemen</label>
                  <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value, position_id: '' }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih Departemen</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Jabatan</label>
                  <select value={form.position_id} onChange={e => setForm(f => ({ ...f, position_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih Jabatan</option>
                    {filteredPositions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipe Kerja</label>
                  <select value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="full-time">Penuh Waktu</option>
                    <option value="part-time">Paruh Waktu</option>
                    <option value="contract">Kontrak</option>
                    <option value="intern">Magang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                    <option value="terminated">Diberhentikan</option>
                    <option value="on-leave">Cuti</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Tidak Ditentukan</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Alamat</label>
                  <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                {saving ? 'Menyimpan...' : editEmployee ? 'Simpan Perubahan' : 'Tambah Karyawan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
