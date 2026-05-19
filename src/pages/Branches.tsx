import { useEffect, useState } from 'react';
import { Plus, X, MapPin, Phone, Mail, Building, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../lib/api';
import type { Branch, BranchWithCounts, Employee } from '../lib/database.types';

interface BranchForm {
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  is_active: boolean;
}

const emptyForm: BranchForm = {
  name: '', code: '', address: '', city: '', phone: '', email: '', is_active: true,
};

export default function Branches() {
  const [branches, setBranches] = useState<BranchWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBranches();
  }, []);

  async function fetchBranches() {
    const [branchRes, empRes] = await Promise.all([
      api.select('branches', { order: 'name.asc' }),
      api.select('employees', { status_eq: 'active' }),
    ]);
    const branchData = (branchRes.data as Branch[]) || [];
    const empData = (empRes.data as Employee[]) || [];

    const withCounts: BranchWithCounts[] = branchData.map(b => ({
      ...b,
      employee_count: empData.filter(e => e.branch_id === b.id).length,
    }));

    setBranches(withCounts);
    setLoading(false);
  }

  function openAdd() {
    setEditBranch(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(b: Branch) {
    setEditBranch(b);
    setForm({
      name: b.name, code: b.code, address: b.address, city: b.city,
      phone: b.phone, email: b.email, is_active: b.is_active,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.code) { setError('Nama dan kode cabang wajib diisi.'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name: form.name,
      code: form.code.toUpperCase().replace(/\s+/g, '-'),
      address: form.address,
      city: form.city,
      phone: form.phone,
      email: form.email,
      is_active: form.is_active,
    };

    if (editBranch) {
      const { error: err } = await api.update('branches', editBranch.id, payload);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await api.insert('branches', payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModal(false);
    fetchBranches();
  }

  async function toggleActive(b: Branch) {
    await api.update('branches', b.id, { is_active: !b.is_active });
    fetchBranches();
  }

  async function handleDelete(id: string) {
    if (!confirm('Nonaktifkan cabang ini? Karyawan yang terkait tetap tersimpan.')) return;
    await api.update('branches', id, { is_active: false });
    fetchBranches();
  }

  const totalEmployees = branches.reduce((sum, b) => sum + (b.employee_count || 0), 0);
  const activeBranches = branches.filter(b => b.is_active).length;

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
          <h1 className="text-2xl font-bold text-gray-900">Cabang</h1>
          <p className="text-sm text-gray-500 mt-1">{branches.length} cabang terdaftar · {activeBranches} aktif</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Tambah Cabang
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-lg"><Building className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
              <p className="text-xs text-gray-500">Total Cabang</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2.5 rounded-lg"><Building className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeBranches}</p>
              <p className="text-xs text-gray-500">Cabang Aktif</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-2.5 rounded-lg"><Users className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
              <p className="text-xs text-gray-500">Total Karyawan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {branches.map(b => (
          <div key={b.id} className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${b.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${b.is_active ? 'bg-blue-50' : 'bg-gray-100'}`}>
                    <Building className={`w-5 h-5 ${b.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{b.name}</h3>
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{b.code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(b)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title={b.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {b.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-gray-300" />}
                  </button>
                  <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-400 hover:text-blue-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {b.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{b.address}{b.city ? `, ${b.city}` : ''}</span>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{b.phone}</span>
                  </div>
                )}
                {b.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{b.email}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-sm">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-700">{b.employee_count || 0}</span>
                  <span className="text-gray-400">karyawan</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {b.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {branches.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Building className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Belum ada cabang terdaftar</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editBranch ? 'Edit Cabang' : 'Tambah Cabang Baru'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nama Cabang <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kode <span className="text-red-500">*</span></label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '-') }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Alamat</label>
                <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kota</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telepon</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">Cabang aktif</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                {saving ? 'Menyimpan...' : editBranch ? 'Simpan' : 'Tambah Cabang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
