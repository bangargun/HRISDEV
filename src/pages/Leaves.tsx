import { useEffect, useState } from 'react';
import { Plus, X, Check, AlertCircle, Filter, ChevronDown, Search } from 'lucide-react';
import { api } from '../lib/api';
import type { Employee, LeaveType, LeaveRequest, LeaveRequestWithRelations } from '../lib/database.types';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak', cancelled: 'Dibatalkan',
};

interface LeaveForm {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export default function Leaves() {
  const [leaves, setLeaves] = useState<LeaveRequestWithRelations[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<LeaveForm>({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [leavesData, empData, typesData] = await Promise.all([
        api.select('leave_requests', { order: 'created_at.desc' }),
        api.select('employees', { status_eq: 'active', order: 'first_name.asc' }),
        api.select('leave_types', { order: 'name.asc' }),
      ]);

      const employeesMap = new Map((empData as Employee[]).map((e: Employee) => [e.id, e]));
      const leaveTypesMap = new Map((typesData as LeaveType[]).map((lt: LeaveType) => [lt.id, lt]));

      const leavesWithRelations = (leavesData as LeaveRequest[]).map((l: LeaveRequest) => ({
        ...l,
        employees: employeesMap.get(l.employee_id) || null,
        leave_types: leaveTypesMap.get(l.leave_type_id) || null,
      }));

      setLeaves(leavesWithRelations as LeaveRequestWithRelations[]);
      setEmployees(empData as Employee[]);
      setLeaveTypes(typesData as LeaveType[]);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setLoading(false);
  }

  const filtered = leaves.filter(l => {
    const emp = l.employees as Employee | undefined;
    const matchSearch = !search || `${emp?.first_name} ${emp?.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || l.status === filterStatus;
    const matchType = !filterType || l.leave_type_id === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const stats = {
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
    total: leaves.length,
  };

  function calcDays(start: string, end: string) {
    if (!start || !end) return 0;
    const s = new Date(start), e = new Date(end);
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  }

  async function handleSubmit() {
    if (!form.employee_id || !form.leave_type_id || !form.start_date || !form.end_date) {
      setError('Semua field wajib diisi.');
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setError('Tanggal selesai harus setelah tanggal mulai.');
      return;
    }
    setSaving(true);
    setError('');

    const days = calcDays(form.start_date, form.end_date);
    try {
      await api.insert('leave_requests', {
        employee_id: form.employee_id,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        days_count: days,
        reason: form.reason,
        status: 'pending',
      });
    } catch (err: any) {
      setError(err.message || 'Gagal mengajukan cuti');
      setSaving(false);
      return;
    }
    setSaving(false);
    setShowModal(false);
    fetchData();
  }

  async function handleApprove(id: string) {
    await api.update('leave_requests', id, { status: 'approved', approved_at: new Date().toISOString() });
    fetchData();
  }

  async function handleReject(id: string) {
    const reason = prompt('Alasan penolakan (opsional):');
    await api.update('leave_requests', id, { status: 'rejected', rejection_reason: reason || '' });
    fetchData();
  }

  async function handleCancel(id: string) {
    if (!confirm('Batalkan permohonan cuti ini?')) return;
    await api.update('leave_requests', id, { status: 'cancelled' });
    fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Cuti</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola permohonan cuti karyawan</p>
        </div>
        <button onClick={() => { setForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' }); setError(''); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Ajukan Cuti
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Pengajuan', value: stats.total, color: 'bg-gray-50 text-gray-700 border-gray-200' },
          { label: 'Menunggu', value: stats.pending, color: 'bg-amber-50 text-amber-700 border-amber-100' },
          { label: 'Disetujui', value: stats.approved, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: 'Ditolak', value: stats.rejected, color: 'bg-red-50 text-red-700 border-red-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Leave Type Balances */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Jenis Cuti</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {leaveTypes.map(lt => (
            <div key={lt.id} className="border border-gray-100 rounded-lg p-3 hover:border-gray-200 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lt.color }} />
                <p className="text-sm font-medium text-gray-800 truncate">{lt.name}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{lt.days_allowed}</p>
              <p className="text-xs text-gray-400">hari/tahun</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer">
              <option value="">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer">
              <option value="">Semua Jenis Cuti</option>
              {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
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
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Belum ada permohonan cuti</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Karyawan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Jenis Cuti</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Tanggal</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Hari</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Alasan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(leave => {
                  const emp = leave.employees as Employee | undefined;
                  const lt = leave.leave_types as LeaveType | undefined;
                  return (
                    <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {emp?.first_name?.[0]}{emp?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp?.first_name} {emp?.last_name}</p>
                            <p className="text-xs text-gray-400">{(emp as { employee_id?: string } | undefined)?.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lt?.color || '#6B7280' }} />
                          <span className="text-gray-700">{lt?.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        <p>{new Date(leave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                        {leave.start_date !== leave.end_date && <p className="text-xs text-gray-400">s/d {new Date(leave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-medium">{leave.days_count} hari</td>
                      <td className="py-3 px-4 text-gray-500 max-w-40">
                        <p className="truncate text-xs">{leave.reason || '-'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[leave.status]}`}>
                          {statusLabels[leave.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {leave.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(leave.id)} className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors text-gray-500 hover:text-emerald-600" title="Setujui">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleReject(leave.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-500 hover:text-red-600" title="Tolak">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(leave.status === 'pending' || leave.status === 'approved') && (
                            <button onClick={() => handleCancel(leave.id)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600" title="Batalkan">
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Ajukan Cuti</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Karyawan <span className="text-red-500">*</span></label>
                <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Pilih Karyawan</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Cuti <span className="text-red-500">*</span></label>
                <select value={form.leave_type_id} onChange={e => setForm(f => ({ ...f, leave_type_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Pilih Jenis Cuti</option>
                  {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} ({lt.days_allowed} hari/tahun)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Mulai <span className="text-red-500">*</span></label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: f.end_date || e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Selesai <span className="text-red-500">*</span></label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} min={form.start_date} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {form.start_date && form.end_date && (
                <p className="text-sm text-blue-600 font-medium bg-blue-50 rounded-lg px-3 py-2">
                  Durasi: {calcDays(form.start_date, form.end_date)} hari
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Alasan</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Tuliskan alasan pengajuan cuti..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
              <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                {saving ? 'Mengajukan...' : 'Ajukan Cuti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
