import { useEffect, useState } from 'react';
import { Search, Plus, X, ChevronDown, Eye, Check, Banknote, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import type { Employee, EmployeeSalary, EmployeeSalaryWithEmployee, Department } from '../lib/database.types';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft', approved: 'Disetujui', paid: 'Dibayar',
};

const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

interface SalaryForm {
  employee_id: string;
  period_month: string;
  period_year: string;
  basic_salary: string;
  transport_allowance: string;
  meal_allowance: string;
  housing_allowance: string;
  overtime_pay: string;
  bonus: string;
  other_earnings: string;
  bpjs_tk: string;
  bpjs_kesehatan: string;
  pph21: string;
  other_deductions: string;
  notes: string;
}

const emptyForm: SalaryForm = {
  employee_id: '', period_month: String(new Date().getMonth() + 1), period_year: String(new Date().getFullYear()),
  basic_salary: '0', transport_allowance: '0', meal_allowance: '0', housing_allowance: '0',
  overtime_pay: '0', bonus: '0', other_earnings: '0',
  bpjs_tk: '0', bpjs_kesehatan: '0', pph21: '0', other_deductions: '0', notes: '',
};

function fmt(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export default function Payroll() {
  const [salaries, setSalaries] = useState<EmployeeSalaryWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<EmployeeSalaryWithEmployee | null>(null);
  const [editSalary, setEditSalary] = useState<EmployeeSalaryWithEmployee | null>(null);
  const [form, setForm] = useState<SalaryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchSalaries();
  }, [filterMonth, filterYear]);

  async function fetchEmployees() {
    const data = await api.select('employees', { status_eq: 'active', order: 'first_name.asc' });
    setEmployees(data || []);
  }

  async function fetchSalaries() {
    setLoading(true);
    try {
      const [salaryData, empData, deptData] = await Promise.all([
        api.select('employee_salaries', {
          period_month_eq: filterMonth,
          period_year_eq: filterYear,
          order: 'created_at.desc',
        }),
        api.select('employees'),
        api.select('departments'),
      ]);

      const empMap = new Map<string, Employee>((empData || []).map((e: Employee) => [e.id, e]));
      const deptMap = new Map<string, Department>((deptData || []).map((d: Department) => [d.id, d]));

      const joined: EmployeeSalaryWithEmployee[] = (salaryData || []).map((sal: EmployeeSalary) => {
        const emp = empMap.get(sal.employee_id) || null;
        const dept = emp?.department_id ? deptMap.get(emp.department_id) || null : null;
        return {
          ...sal,
          employees: emp ? { ...emp, departments: dept } : null,
        };
      });

      setSalaries(joined);
    } catch {
      setSalaries([]);
    }
    setLoading(false);
  }

  const filtered = salaries.filter(s => {
    const emp = s.employees as Employee | undefined;
    const matchSearch = !search || `${emp?.first_name} ${emp?.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totals = salaries.reduce((acc, s) => ({
    earnings: acc.earnings + s.total_earnings,
    deductions: acc.deductions + s.total_deductions,
    net: acc.net + s.net_salary,
  }), { earnings: 0, deductions: 0, net: 0 });

  function openAdd() {
    setEditSalary(null);
    setForm({ ...emptyForm });
    setError('');
    setShowModal(true);
  }

  function openEdit(sal: EmployeeSalaryWithEmployee) {
    setEditSalary(sal);
    setForm({
      employee_id: sal.employee_id,
      period_month: String(sal.period_month),
      period_year: String(sal.period_year),
      basic_salary: String(sal.basic_salary),
      transport_allowance: String(sal.transport_allowance),
      meal_allowance: String(sal.meal_allowance),
      housing_allowance: String(sal.housing_allowance),
      overtime_pay: String(sal.overtime_pay),
      bonus: String(sal.bonus),
      other_earnings: String(sal.other_earnings),
      bpjs_tk: String(sal.bpjs_tk),
      bpjs_kesehatan: String(sal.bpjs_kesehatan),
      pph21: String(sal.pph21),
      other_deductions: String(sal.other_deductions),
      notes: sal.notes,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.employee_id) { setError('Pilih karyawan.'); return; }
    setSaving(true);
    setError('');

    const payload = {
      employee_id: form.employee_id,
      period_month: Number(form.period_month),
      period_year: Number(form.period_year),
      basic_salary: Number(form.basic_salary) || 0,
      transport_allowance: Number(form.transport_allowance) || 0,
      meal_allowance: Number(form.meal_allowance) || 0,
      housing_allowance: Number(form.housing_allowance) || 0,
      overtime_pay: Number(form.overtime_pay) || 0,
      bonus: Number(form.bonus) || 0,
      other_earnings: Number(form.other_earnings) || 0,
      bpjs_tk: Number(form.bpjs_tk) || 0,
      bpjs_kesehatan: Number(form.bpjs_kesehatan) || 0,
      pph21: Number(form.pph21) || 0,
      other_deductions: Number(form.other_deductions) || 0,
      notes: form.notes,
      status: 'draft' as const,
    };

    if (editSalary) {
      try {
        await api.update('employee_salaries', editSalary.id, payload);
      } catch (err) { setError((err as Error).message); setSaving(false); return; }
    } else {
      try {
        await api.insert('employee_salaries', payload);
      } catch (err) { setError((err as Error).message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModal(false);
    fetchSalaries();
  }

  async function handleApprove(id: string) {
    await api.update('employee_salaries', id, { status: 'approved' });
    fetchSalaries();
  }

  async function handlePay(id: string) {
    await api.update('employee_salaries', id, { status: 'paid', paid_at: new Date().toISOString() });
    fetchSalaries();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus data gaji ini?')) return;
    await api.delete('employee_salaries', id);
    fetchSalaries();
  }

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Penggajian</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola gaji dan tunjangan karyawan</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Buat Slip Gaji
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2.5 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Pendapatan</p>
              <p className="text-xl font-bold text-gray-900">{fmt(totals.earnings)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2.5 rounded-lg"><TrendingDown className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Potongan</p>
              <p className="text-xl font-bold text-gray-900">{fmt(totals.deductions)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-lg"><Wallet className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Gaji Bersih</p>
              <p className="text-xl font-bold text-gray-900">{fmt(totals.net)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
            {monthNames.slice(1).map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="relative">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer">
              <option value="">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Disetujui</option>
              <option value="paid">Dibayar</option>
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
            <Banknote className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Belum ada data gaji untuk periode ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Karyawan</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Gaji Pokok</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Tunjangan</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Potongan</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Gaji Bersih</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(sal => {
                  const emp = sal.employees as Employee | undefined;
                  const totalAllowance = sal.transport_allowance + sal.meal_allowance + sal.housing_allowance + sal.overtime_pay + sal.bonus + sal.other_earnings;
                  return (
                    <tr key={sal.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {emp?.first_name?.[0]}{emp?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp?.first_name} {emp?.last_name}</p>
                            <p className="text-xs text-gray-400">{(emp as { employee_id?: string } | undefined)?.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700 font-mono text-xs">{fmt(sal.basic_salary)}</td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-mono text-xs">+{fmt(totalAllowance)}</td>
                      <td className="py-3 px-4 text-right text-red-600 font-mono text-xs">-{fmt(sal.total_deductions)}</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900 font-mono text-xs">{fmt(sal.net_salary)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[sal.status]}`}>{statusLabels[sal.status]}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setShowDetail(sal)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700" title="Detail">
                            <Eye className="w-4 h-4" />
                          </button>
                          {sal.status === 'draft' && (
                            <>
                              <button onClick={() => openEdit(sal)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-500 hover:text-blue-600" title="Edit">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleApprove(sal.id)} className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors text-gray-500 hover:text-emerald-600" title="Setujui">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(sal.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-500 hover:text-red-600" title="Hapus">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {sal.status === 'approved' && (
                            <button onClick={() => handlePay(sal.id)} className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors text-gray-500 hover:text-emerald-600" title="Bayar">
                              <Banknote className="w-4 h-4" />
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

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">Slip Gaji</h2>
              <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                  {(showDetail.employees as Employee | undefined)?.first_name?.[0]}{(showDetail.employees as Employee | undefined)?.last_name?.[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{(showDetail.employees as Employee | undefined)?.first_name} {(showDetail.employees as Employee | undefined)?.last_name}</p>
                  <p className="text-xs text-gray-500">Periode: {monthNames[showDetail.period_month]} {showDetail.period_year}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pendapatan</h3>
                {[
                  ['Gaji Pokok', showDetail.basic_salary],
                  ['Tunjangan Transport', showDetail.transport_allowance],
                  ['Tunjangan Makan', showDetail.meal_allowance],
                  ['Tunjangan Perumahan', showDetail.housing_allowance],
                  ['Lembur', showDetail.overtime_pay],
                  ['Bonus', showDetail.bonus],
                  ['Pendapatan Lainnya', showDetail.other_earnings],
                ].map(([label, val]) => (val as number) > 0 && (
                  <div key={label as string} className="flex justify-between text-sm">
                    <span className="text-gray-600">{label as string}</span>
                    <span className="font-mono text-gray-800">{fmt(val as number)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span className="text-emerald-700">Total Pendapatan</span>
                  <span className="font-mono text-emerald-700">{fmt(showDetail.total_earnings)}</span>
                </div>

                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-3">Potongan</h3>
                {[
                  ['BPJS Ketenagakerjaan', showDetail.bpjs_tk],
                  ['BPJS Kesehatan', showDetail.bpjs_kesehatan],
                  ['PPh 21', showDetail.pph21],
                  ['Potongan Lainnya', showDetail.other_deductions],
                ].map(([label, val]) => (val as number) > 0 && (
                  <div key={label as string} className="flex justify-between text-sm">
                    <span className="text-gray-600">{label as string}</span>
                    <span className="font-mono text-red-600">-{fmt(val as number)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span className="text-red-700">Total Potongan</span>
                  <span className="font-mono text-red-700">-{fmt(showDetail.total_deductions)}</span>
                </div>

                <div className="flex justify-between text-base font-bold border-t-2 border-gray-200 pt-3 mt-3">
                  <span className="text-gray-900">Gaji Bersih</span>
                  <span className="font-mono text-blue-600">{fmt(showDetail.net_salary)}</span>
                </div>
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
              <h2 className="text-lg font-bold text-gray-900">{editSalary ? 'Edit Slip Gaji' : 'Buat Slip Gaji'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Karyawan <span className="text-red-500">*</span></label>
                    <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Pilih Karyawan</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bulan</label>
                    <select value={form.period_month} onChange={e => setForm(f => ({ ...f, period_month: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {monthNames.slice(1).map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tahun</label>
                    <select value={form.period_year} onChange={e => setForm(f => ({ ...f, period_year: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider pt-2">Pendapatan</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Gaji Pokok', key: 'basic_salary' },
                    { label: 'Tunjangan Transport', key: 'transport_allowance' },
                    { label: 'Tunjangan Makan', key: 'meal_allowance' },
                    { label: 'Tunjangan Perumahan', key: 'housing_allowance' },
                    { label: 'Lembur', key: 'overtime_pay' },
                    { label: 'Bonus', key: 'bonus' },
                    { label: 'Pendapatan Lainnya', key: 'other_earnings' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                      <input type="number" value={form[f.key as keyof SalaryForm]} onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>

                <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider pt-2">Potongan</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'BPJS Ketenagakerjaan', key: 'bpjs_tk' },
                    { label: 'BPJS Kesehatan', key: 'bpjs_kesehatan' },
                    { label: 'PPh 21', key: 'pph21' },
                    { label: 'Potongan Lainnya', key: 'other_deductions' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                      <input type="number" value={form[f.key as keyof SalaryForm]} onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
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
