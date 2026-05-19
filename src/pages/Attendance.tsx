import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Search, Filter, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import type { Employee, Attendance, Department } from '../lib/database.types';

type AttendanceWithEmployee = Attendance & { employees?: Employee | null };

const statusColors: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  'half-day': 'bg-blue-100 text-blue-700',
  holiday: 'bg-purple-100 text-purple-700',
  weekend: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  present: 'Hadir', absent: 'Tidak Hadir', late: 'Terlambat', 'half-day': 'Setengah Hari', holiday: 'Libur', weekend: 'Akhir Pekan',
};

interface AttendanceForm {
  employee_id: string;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
  notes: string;
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDept, setFilterDept] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editAtt, setEditAtt] = useState<AttendanceWithEmployee | null>(null);
  const [form, setForm] = useState<AttendanceForm>({ employee_id: '', date: selectedDate, check_in: '', check_out: '', status: 'present', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployeesAndDepts();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  async function fetchEmployeesAndDepts() {
    const [empData, deptData] = await Promise.all([
      api.select('employees', { status_eq: 'active', order: 'first_name.asc' }),
      api.select('departments', { order: 'name.asc' }),
    ]);
    setEmployees(empData || []);
    setDepartments(deptData || []);
  }

  async function fetchAttendance() {
    setLoading(true);
    const [attData, empData] = await Promise.all([
      api.select('attendance', { date_eq: selectedDate, order: 'created_at.desc' }),
      api.select('employees'),
    ]);
    const empMap = new Map((empData || []).map((e: Employee) => [e.id, e]));
    const joined = (attData || []).map((a: Attendance) => ({
      ...a,
      employees: empMap.get(a.employee_id) || null,
    }));
    setAttendance(joined as AttendanceWithEmployee[]);
    setLoading(false);
  }

  function navigateDate(days: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  }

  const filtered = attendance.filter(a => {
    const emp = a.employees;
    const matchSearch = !search || `${emp?.first_name} ${emp?.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchDept = !filterDept || emp?.department_id === filterDept;
    return matchSearch && matchDept;
  });

  const stats = {
    present: attendance.filter(a => a.status === 'present').length,
    late: attendance.filter(a => a.status === 'late').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    halfDay: attendance.filter(a => a.status === 'half-day').length,
  };

  function openAdd() {
    setEditAtt(null);
    setForm({ employee_id: '', date: selectedDate, check_in: '', check_out: '', status: 'present', notes: '' });
    setShowModal(true);
  }

  function openEdit(att: AttendanceWithEmployee) {
    setEditAtt(att);
    setForm({
      employee_id: att.employee_id,
      date: att.date,
      check_in: att.check_in ? new Date(att.check_in).toISOString().slice(11, 16) : '',
      check_out: att.check_out ? new Date(att.check_out).toISOString().slice(11, 16) : '',
      status: att.status,
      notes: att.notes,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.employee_id || !form.date) return;
    setSaving(true);

    const toTimestamp = (dateStr: string, timeStr: string) => {
      if (!timeStr) return null;
      return new Date(`${dateStr}T${timeStr}:00`).toISOString();
    };

    const payload = {
      employee_id: form.employee_id,
      date: form.date,
      check_in: toTimestamp(form.date, form.check_in),
      check_out: toTimestamp(form.date, form.check_out),
      status: form.status as Attendance['status'],
      notes: form.notes,
    };

    if (editAtt) {
      await api.update('attendance', editAtt.id, payload);
    } else {
      await api.insert('attendance', payload);
    }

    setSaving(false);
    setShowModal(false);
    fetchAttendance();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus data kehadiran ini?')) return;
    await api.delete('attendance', id);
    fetchAttendance();
  }

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kehadiran</h1>
          <p className="text-sm text-gray-500 mt-1">Pantau dan kelola kehadiran karyawan</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Catat Kehadiran
        </button>
      </div>

      {/* Date Navigator */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-gray-900">{dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            {isToday && <span className="text-xs text-blue-600 font-medium">Hari Ini</span>}
          </div>
          <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Hadir', value: stats.present, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: 'Terlambat', value: stats.late, color: 'bg-amber-50 text-amber-700 border-amber-100' },
          { label: 'Tidak Hadir', value: stats.absent, color: 'bg-red-50 text-red-700 border-red-100' },
          { label: 'Setengah Hari', value: stats.halfDay, color: 'bg-blue-50 text-blue-700 border-blue-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
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
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer">
              <option value="">Semua Departemen</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex items-center">
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
            <p className="text-sm">Belum ada data kehadiran untuk tanggal ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Karyawan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Jam Masuk</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Jam Keluar</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Durasi</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Catatan</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(att => {
                  const duration = att.check_in && att.check_out
                    ? Math.round((new Date(att.check_out).getTime() - new Date(att.check_in).getTime()) / 3600000 * 10) / 10
                    : null;
                  return (
                    <tr key={att.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {att.employees?.first_name?.[0]}{att.employees?.last_name?.[0]}
                          </div>
                          <p className="font-medium text-gray-900">{att.employees?.first_name} {att.employees?.last_name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono">
                        {att.check_in ? new Date(att.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono">
                        {att.check_out ? new Date(att.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {duration !== null ? `${duration} jam` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[att.status]}`}>
                          {statusLabels[att.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs max-w-32 truncate">{att.notes || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(att)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-500 hover:text-blue-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(att.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-500 hover:text-red-600">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editAtt ? 'Edit Kehadiran' : 'Catat Kehadiran'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Karyawan <span className="text-red-500">*</span></label>
                <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Pilih Karyawan</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Jam Masuk</label>
                  <input type="time" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Jam Keluar</label>
                  <input type="time" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="present">Hadir</option>
                  <option value="late">Terlambat</option>
                  <option value="absent">Tidak Hadir</option>
                  <option value="half-day">Setengah Hari</option>
                  <option value="holiday">Libur</option>
                  <option value="weekend">Akhir Pekan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving || !form.employee_id} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
