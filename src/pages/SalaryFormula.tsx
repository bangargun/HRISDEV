import { useEffect, useState } from 'react';
import { Plus, X, Calculator, TrendingUp, TrendingDown, Layers, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../lib/api';
import type { SalaryFormula, TierConfig } from '../lib/database.types';

const methodLabels: Record<string, string> = {
  fixed: 'Tetap',
  percentage: 'Persentase',
  tiered: 'Progresif/Bertingkat',
  formula: 'Rumus Kustom',
};

const methodColors: Record<string, string> = {
  fixed: 'bg-gray-100 text-gray-700',
  percentage: 'bg-blue-100 text-blue-700',
  tiered: 'bg-amber-100 text-amber-700',
  formula: 'bg-teal-100 text-teal-700',
};

const baseRefLabels: Record<string, string> = {
  basic_salary: 'Gaji Pokok',
  gross_salary: 'Gaji Kotor',
  net_salary: 'Gaji Bersih',
  custom: 'Kustom',
};

interface FormulaForm {
  name: string;
  code: string;
  component_type: string;
  calculation_method: string;
  base_reference: string;
  percentage: string;
  fixed_amount: string;
  formula_expression: string;
  tier_config: TierConfig[];
  is_taxable: boolean;
  is_mandatory: boolean;
  sort_order: string;
  description: string;
  is_active: boolean;
}

const emptyForm: FormulaForm = {
  name: '', code: '', component_type: 'earning', calculation_method: 'fixed',
  base_reference: 'basic_salary', percentage: '0', fixed_amount: '0',
  formula_expression: '', tier_config: [], is_taxable: true, is_mandatory: false,
  sort_order: '0', description: '', is_active: true,
};

const emptyTier: TierConfig = { min: 0, max: 0, rate: 0, description: '' };

export default function SalaryFormulaPage() {
  const [formulas, setFormulas] = useState<SalaryFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<SalaryFormula | null>(null);
  const [editFormula, setEditFormula] = useState<SalaryFormula | null>(null);
  const [form, setForm] = useState<FormulaForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchFormulas();
  }, []);

  async function fetchFormulas() {
    const data = await api.select('salary_formulas', { order: 'sort_order.asc' });
    setFormulas((data as SalaryFormula[]) || []);
    setLoading(false);
  }

  const earnings = formulas.filter(f => f.component_type === 'earning');
  const deductions = formulas.filter(f => f.component_type === 'deduction');

  const filtered = filterType === 'earning' ? earnings : filterType === 'deduction' ? deductions : formulas;

  function openAdd(type: string) {
    setEditFormula(null);
    const nextOrder = type === 'earning'
      ? Math.max(0, ...earnings.map(e => e.sort_order)) + 1
      : Math.max(100, ...deductions.map(d => d.sort_order)) + 1;
    setForm({ ...emptyForm, component_type: type, sort_order: String(nextOrder) });
    setError('');
    setShowModal(true);
  }

  function openEdit(f: SalaryFormula) {
    setEditFormula(f);
    setForm({
      name: f.name, code: f.code, component_type: f.component_type,
      calculation_method: f.calculation_method, base_reference: f.base_reference,
      percentage: String(f.percentage), fixed_amount: String(f.fixed_amount),
      formula_expression: f.formula_expression, tier_config: f.tier_config || [],
      is_taxable: f.is_taxable, is_mandatory: f.is_mandatory,
      sort_order: String(f.sort_order), description: f.description, is_active: f.is_active,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.code) { setError('Nama dan kode wajib diisi.'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name: form.name,
      code: form.code.toUpperCase().replace(/\s+/g, '_'),
      component_type: form.component_type as SalaryFormula['component_type'],
      calculation_method: form.calculation_method as SalaryFormula['calculation_method'],
      base_reference: form.base_reference as SalaryFormula['base_reference'],
      percentage: Number(form.percentage) || 0,
      fixed_amount: Number(form.fixed_amount) || 0,
      formula_expression: form.formula_expression,
      tier_config: form.calculation_method === 'tiered' ? form.tier_config : [],
      is_taxable: form.is_taxable,
      is_mandatory: form.is_mandatory,
      sort_order: Number(form.sort_order) || 0,
      description: form.description,
      is_active: form.is_active,
    };

    if (editFormula) {
      const { error: err } = await api.update('salary_formulas', editFormula.id, payload);
      if (err) { setError(err!.message); setSaving(false); return; }
    } else {
      const { error: err } = await api.insert('salary_formulas', payload);
      if (err) { setError(err!.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModal(false);
    fetchFormulas();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus formula ini?')) return;
    await api.delete('salary_formulas', id);
    fetchFormulas();
  }

  async function toggleActive(f: SalaryFormula) {
    await api.update('salary_formulas', f.id, { is_active: !f.is_active });
    fetchFormulas();
  }

  function addTier() {
    setForm(f => ({ ...f, tier_config: [...f.tier_config, { ...emptyTier }] }));
  }

  function updateTier(index: number, field: keyof TierConfig, value: string | number) {
    setForm(f => {
      const tiers = [...f.tier_config];
      tiers[index] = { ...tiers[index], [field]: value };
      return { ...f, tier_config: tiers };
    });
  }

  function removeTier(index: number) {
    setForm(f => ({ ...f, tier_config: f.tier_config.filter((_, i) => i !== index) }));
  }

  function renderFormulaPreview(f: SalaryFormula | FormulaForm) {
    if (f.calculation_method === 'fixed') return 'Nilai tetap (diisi manual per karyawan)';
    if (f.calculation_method === 'percentage') return `${f.percentage}% x ${baseRefLabels[f.base_reference] || f.base_reference}`;
    if (f.calculation_method === 'tiered') return 'Tarif progresif bertingkat';
    if (f.calculation_method === 'formula') return f.formula_expression || 'Rumus kustom';
    return '-';
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Formula Gaji</h1>
          <p className="text-sm text-gray-500 mt-1">Konfigurasi komponen dan rumus perhitungan gaji</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2.5 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{earnings.filter(e => e.is_active).length}</p>
              <p className="text-xs text-gray-500">Komponen Pendapatan</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2.5 rounded-lg"><TrendingDown className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{deductions.filter(d => d.is_active).length}</p>
              <p className="text-xs text-gray-500">Komponen Potongan</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-lg"><Layers className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formulas.filter(f => f.is_mandatory).length}</p>
              <p className="text-xs text-gray-500">Komponen Wajib</p>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-gray-800">Komponen Pendapatan</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{earnings.length}</span>
          </div>
          <button onClick={() => openAdd('earning')} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
        {earnings.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Belum ada komponen pendapatan</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {earnings.map(f => (
              <div key={f.id} className={`flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors ${!f.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 text-xs font-bold shrink-0">{f.sort_order}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{f.name}</p>
                      <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{f.code}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${methodColors[f.calculation_method]}`}>{methodLabels[f.calculation_method]}</span>
                      {f.is_mandatory && <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Wajib</span>}
                      {!f.is_active && <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Nonaktif</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{renderFormulaPreview(f)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <button onClick={() => toggleActive(f)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400" title={f.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {f.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-gray-300" />}
                  </button>
                  <button onClick={() => setShowDetail(f)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700" title="Detail">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(f)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-400 hover:text-blue-600" title="Edit">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  {!f.is_mandatory && (
                    <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600" title="Hapus">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deductions Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <h2 className="font-semibold text-gray-800">Komponen Potongan</h2>
            <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">{deductions.length}</span>
          </div>
          <button onClick={() => openAdd('deduction')} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
        {deductions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Belum ada komponen potongan</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {deductions.map(f => (
              <div key={f.id} className={`flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors ${!f.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 text-xs font-bold shrink-0">{f.sort_order - 100}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{f.name}</p>
                      <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{f.code}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${methodColors[f.calculation_method]}`}>{methodLabels[f.calculation_method]}</span>
                      {f.is_mandatory && <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Wajib</span>}
                      {!f.is_active && <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Nonaktif</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{renderFormulaPreview(f)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <button onClick={() => toggleActive(f)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400" title={f.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {f.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-gray-300" />}
                  </button>
                  <button onClick={() => setShowDetail(f)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700" title="Detail">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(f)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-400 hover:text-blue-600" title="Edit">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  {!f.is_mandatory && (
                    <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600" title="Hapus">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Detail Formula</h2>
              <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">{showDetail.name}</h3>
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{showDetail.code}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Tipe', showDetail.component_type === 'earning' ? 'Pendapatan' : 'Potongan'],
                  ['Metode', methodLabels[showDetail.calculation_method]],
                  ['Referensi Dasar', baseRefLabels[showDetail.base_reference]],
                  ['Kenakan Pajak', showDetail.is_taxable ? 'Ya' : 'Tidak'],
                  ['Wajib', showDetail.is_mandatory ? 'Ya' : 'Tidak'],
                  ['Status', showDetail.is_active ? 'Aktif' : 'Nonaktif'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-gray-800">{value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-1">Rumus Perhitungan</p>
                <p className="text-sm text-blue-900 font-mono">{renderFormulaPreview(showDetail)}</p>
              </div>

              {showDetail.calculation_method === 'percentage' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Persentase</p>
                  <p className="text-lg font-bold text-gray-900">{showDetail.percentage}%</p>
                </div>
              )}

              {showDetail.calculation_method === 'tiered' && showDetail.tier_config && showDetail.tier_config.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Tingkatan Tarif</p>
                  <div className="space-y-2">
                    {showDetail.tier_config.map((tier, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{tier.description}</p>
                          <p className="text-xs text-gray-500">Rp {tier.min.toLocaleString('id-ID')} - {tier.max >= 5000000000 ? 'seterusnya' : `Rp ${tier.max.toLocaleString('id-ID')}`}</p>
                        </div>
                        <span className="text-sm font-bold text-amber-700">{tier.rate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showDetail.description && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Deskripsi</p>
                  <p className="text-sm text-gray-700">{showDetail.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{editFormula ? 'Edit Formula' : 'Tambah Formula'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nama Komponen <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Tunjangan Transport" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kode <span className="text-red-500">*</span></label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))} placeholder="Contoh: TRANSPORT_ALLOWANCE" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipe Komponen</label>
                  <select value={form.component_type} onChange={e => setForm(f => ({ ...f, component_type: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="earning">Pendapatan</option>
                    <option value="deduction">Potongan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Metode Perhitungan</label>
                  <select value={form.calculation_method} onChange={e => setForm(f => ({ ...f, calculation_method: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="fixed">Tetap (diisi manual)</option>
                    <option value="percentage">Persentase</option>
                    <option value="tiered">Progresif/Bertingkat</option>
                    <option value="formula">Rumus Kustom</option>
                  </select>
                </div>
              </div>

              {form.calculation_method === 'percentage' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Persentase (%)</label>
                    <input type="number" step="0.01" value={form.percentage} onChange={e => setForm(f => ({ ...f, percentage: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Referensi Dasar</label>
                    <select value={form.base_reference} onChange={e => setForm(f => ({ ...f, base_reference: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="basic_salary">Gaji Pokok</option>
                      <option value="gross_salary">Gaji Kotor</option>
                      <option value="net_salary">Gaji Bersih</option>
                      <option value="custom">Kustom</option>
                    </select>
                  </div>
                </div>
              )}

              {form.calculation_method === 'fixed' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah Tetap (Rp)</label>
                  <input type="number" value={form.fixed_amount} onChange={e => setForm(f => ({ ...f, fixed_amount: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-400 mt-1">Jumlah ini dapat di-override per karyawan saat pembuatan slip gaji</p>
                </div>
              )}

              {form.calculation_method === 'formula' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rumus</label>
                  <textarea value={form.formula_expression} onChange={e => setForm(f => ({ ...f, formula_expression: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono" placeholder="Contoh: (basic_salary / 173) * overtime_hours * 1.5" />
                  <p className="text-xs text-gray-400 mt-1">Variabel tersedia: basic_salary, gross_salary, overtime_hours, days_present</p>
                </div>
              )}

              {form.calculation_method === 'tiered' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Tingkatan Tarif</label>
                    <button onClick={addTier} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Tambah Tingkat
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.tier_config.map((tier, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs text-gray-400">Min (Rp)</label>
                            <input type="number" value={tier.min} onChange={e => updateTier(i, 'min', Number(e.target.value))} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Max (Rp)</label>
                            <input type="number" value={tier.max} onChange={e => updateTier(i, 'max', Number(e.target.value))} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Tarif (%)</label>
                            <input type="number" value={tier.rate} onChange={e => updateTier(i, 'rate', Number(e.target.value))} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Keterangan</label>
                            <input value={tier.description} onChange={e => updateTier(i, 'description', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                        </div>
                        <button onClick={() => removeTier(i)} className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {form.tier_config.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">Belum ada tingkatan. Klik "Tambah Tingkat" untuk menambahkan.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Urutan</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end gap-4 pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_taxable} onChange={e => setForm(f => ({ ...f, is_taxable: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Kenakan Pajak</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_mandatory} onChange={e => setForm(f => ({ ...f, is_mandatory: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Wajib</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Jelaskan komponen gaji ini..." />
              </div>

              {/* Preview */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-1">Preview Rumus</p>
                <p className="text-sm text-blue-900 font-mono">{renderFormulaPreview(form)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                {saving ? 'Menyimpan...' : editFormula ? 'Simpan' : 'Tambah Formula'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
