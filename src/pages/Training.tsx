import { useEffect, useState } from 'react';
import { Plus, X, Eye, GraduationCap, Users, Calendar, MapPin, Award, Search, ChevronDown, Filter } from 'lucide-react';
import { api } from '../lib/api';
import type { Employee, Training, TrainingEnrollment, TrainingWithEnrollments, TrainingEnrollmentWithEmployee } from '../lib/database.types';

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-700',
  ongoing: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  upcoming: 'Akan Datang', ongoing: 'Berlangsung', completed: 'Selesai', cancelled: 'Dibatalkan',
};

const enrollStatusColors: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-700',
  attended: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const enrollStatusLabels: Record<string, string> = {
  enrolled: 'Terdaftar', attended: 'Hadir', completed: 'Lulus', failed: 'Tidak Lulus', cancelled: 'Dibatalkan',
};

const categoryColors: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700',
  technical: 'bg-blue-100 text-blue-700',
  leadership: 'bg-amber-100 text-amber-700',
  compliance: 'bg-rose-100 text-rose-700',
  safety: 'bg-orange-100 text-orange-700',
  'soft-skill': 'bg-teal-100 text-teal-700',
};

const categoryLabels: Record<string, string> = {
  general: 'Umum', technical: 'Teknis', leadership: 'Kepemimpinan', compliance: 'Kepatuhan', safety: 'Keselamatan', 'soft-skill': 'Soft Skill',
};

interface TrainingForm {
  title: string;
  description: string;
  trainer: string;
  category: string;
  start_date: string;
  end_date: string;
  location: string;
  quota: string;
  status: string;
  certificate: boolean;
}

interface EnrollForm {
  training_id: string;
  employee_ids: string[];
}

export default function TrainingPage() {
  const [trainings, setTrainings] = useState<TrainingWithEnrollments[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<TrainingWithEnrollments | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editTraining, setEditTraining] = useState<Training | null>(null);
  const [form, setForm] = useState<TrainingForm>({
    title: '', description: '', trainer: '', category: 'general',
    start_date: '', end_date: '', location: '', quota: '20', status: 'upcoming', certificate: true,
  });
  const [enrollForm, setEnrollForm] = useState<EnrollForm>({ training_id: '', employee_ids: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [trainings, enrollments, employees] = await Promise.all([
      api.select('trainings', { order: 'start_date.desc' }),
      api.select('training_enrollments'),
      api.select('employees', { status_eq: 'active', order: 'first_name.asc' }),
    ]);
    const trainingsWithEnrollments = trainings.map(t => ({
      ...t,
      training_enrollments: enrollments.filter(e => e.training_id === t.id).map(e => ({
        ...e,
        employees: employees.find(emp => emp.id === e.employee_id) || null,
      })),
    }));
    setTrainings(trainingsWithEnrollments as TrainingWithEnrollments[]);
    setEmployees(employees as Employee[]);
    setLoading(false);
  }

  const filtered = trainings.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.trainer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchCategory = !filterCategory || t.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const stats = {
    upcoming: trainings.filter(t => t.status === 'upcoming').length,
    ongoing: trainings.filter(t => t.status === 'ongoing').length,
    completed: trainings.filter(t => t.status === 'completed').length,
    totalEnrollments: trainings.reduce((sum, t) => sum + (t.training_enrollments?.length || 0), 0),
  };

  function openAdd() {
    setEditTraining(null);
    setForm({ title: '', description: '', trainer: '', category: 'general', start_date: '', end_date: '', location: '', quota: '20', status: 'upcoming', certificate: true });
    setError('');
    setShowModal(true);
  }

  function openEdit(t: Training) {
    setEditTraining(t);
    setForm({
      title: t.title, description: t.description, trainer: t.trainer, category: t.category,
      start_date: t.start_date, end_date: t.end_date, location: t.location,
      quota: String(t.quota), status: t.status, certificate: t.certificate,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title || !form.start_date || !form.end_date) {
      setError('Judul dan tanggal wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      title: form.title, description: form.description, trainer: form.trainer,
      category: form.category as Training['category'],
      start_date: form.start_date, end_date: form.end_date, location: form.location,
      quota: Number(form.quota) || 0, status: form.status as Training['status'],
      certificate: form.certificate,
    };

    if (editTraining) {
      try {
        await api.update('trainings', editTraining.id, payload as Record<string, unknown>);
      } catch (err) { setError((err as Error).message); setSaving(false); return; }
    } else {
      try {
        await api.insert('trainings', payload as Record<string, unknown>);
      } catch (err) { setError((err as Error).message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModal(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus program training ini?')) return;
    await api.delete('trainings', id);
    fetchData();
  }

  function openEnroll(trainingId: string) {
    setEnrollForm({ training_id: trainingId, employee_ids: [] });
    setShowEnrollModal(true);
  }

  async function handleEnroll() {
    if (enrollForm.employee_ids.length === 0) return;
    setSaving(true);
    const inserts = enrollForm.employee_ids.map(eid => ({
      training_id: enrollForm.training_id,
      employee_id: eid,
      status: 'enrolled' as const,
    }));
    try {
      await api.insert('training_enrollments', inserts as Record<string, unknown>[]);
    } catch (err) { setError((err as Error).message); setSaving(false); return; }
    setSaving(false);
    setShowEnrollModal(false);
    fetchData();
  }

  async function updateEnrollmentStatus(id: string, status: string, score?: number) {
    const update: Record<string, unknown> = { status };
    if (status === 'completed') update.completed_at = new Date().toISOString();
    if (score !== undefined) update.score = score;
    await api.update('training_enrollments', id, update);
    fetchData();
  }

  async function removeEnrollment(id: string) {
    await api.delete('training_enrollments', id);
    fetchData();
  }

  function toggleEmployee(eid: string) {
    setEnrollForm(f => ({
      ...f,
      employee_ids: f.employee_ids.includes(eid)
        ? f.employee_ids.filter(id => id !== eid)
        : [...f.employee_ids, eid],
    }));
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
          <h1 className="text-2xl font-bold text-gray-900">Training & Pengembangan</h1>
          <p className="text-sm text-gray-500 mt-1">{trainings.length} program training</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Buat Training
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Akan Datang', value: stats.upcoming, color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { label: 'Berlangsung', value: stats.ongoing, color: 'bg-amber-50 text-amber-700 border-amber-100' },
          { label: 'Selesai', value: stats.completed, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: 'Total Peserta', value: stats.totalEnrollments, color: 'bg-gray-50 text-gray-700 border-gray-200' },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari training, trainer..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer">
              <option value="">Semua Status</option>
              <option value="upcoming">Akan Datang</option>
              <option value="ongoing">Berlangsung</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer">
              <option value="">Semua Kategori</option>
              {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Training Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map(t => {
          const enrollments = (t.training_enrollments as TrainingEnrollmentWithEmployee[]) || [];
          const enrolledCount = enrollments.length;
          const completedCount = enrollments.filter(e => e.status === 'completed').length;
          const avgScore = enrollments.filter(e => e.score !== null).length > 0
            ? Math.round(enrollments.filter(e => e.score !== null).reduce((sum, e) => sum + (e.score || 0), 0) / enrollments.filter(e => e.score !== null).length)
            : null;

          return (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[t.category]}`}>{categoryLabels[t.category]}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[t.status]}`}>{statusLabels[t.status]}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg truncate">{t.title}</h3>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => setShowDetail(t)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-400 hover:text-blue-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {t.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{t.description}</p>}

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{t.trainer || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{t.location || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{new Date(t.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(t.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span>{enrolledCount}/{t.quota} peserta</span>
                  </div>
                </div>

                {/* Progress */}
                {t.status === 'completed' && enrolledCount > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Kelulusan</span>
                      <span className="text-gray-700 font-medium">{completedCount}/{enrolledCount} lulus {avgScore !== null ? `(rata-rata ${avgScore})` : ''}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${enrolledCount > 0 ? (completedCount / enrolledCount * 100) : 0}%` }} />
                    </div>
                  </div>
                )}

                {/* Enrolled employees preview */}
                {enrolledCount > 0 && (
                  <div className="flex items-center -space-x-2">
                    {enrollments.slice(0, 5).map(en => (
                      <div key={en.id} className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold border-2 border-white shrink-0">
                        {(en.employees as Employee | undefined)?.first_name?.[0]}
                      </div>
                    ))}
                    {enrolledCount > 5 && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white shrink-0">
                        +{enrolledCount - 5}
                      </div>
                    )}
                  </div>
                )}

                {t.certificate && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                    <Award className="w-3.5 h-3.5" />
                    <span>Bersertifikat</span>
                  </div>
                )}
              </div>

              {/* Action bar */}
              {(t.status === 'upcoming' || t.status === 'ongoing') && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button onClick={() => openEnroll(t.id)} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Tambah Peserta
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Belum ada program training</p>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Detail Training</h2>
              <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[showDetail.category]}`}>{categoryLabels[showDetail.category]}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[showDetail.status]}`}>{statusLabels[showDetail.status]}</span>
                {showDetail.certificate && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><Award className="w-3 h-3" />Sertifikat</span>}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{showDetail.title}</h3>
              {showDetail.description && <p className="text-sm text-gray-600 mb-4">{showDetail.description}</p>}

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                {[
                  ['Trainer', showDetail.trainer],
                  ['Lokasi', showDetail.location],
                  ['Tanggal', `${new Date(showDetail.start_date).toLocaleDateString('id-ID')} - ${new Date(showDetail.end_date).toLocaleDateString('id-ID')}`],
                  ['Kuota', `${showDetail.quota} peserta`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-800">{value || '-'}</p>
                  </div>
                ))}
              </div>

              {/* Enrolled employees */}
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Peserta ({(showDetail.training_enrollments || []).length})</h4>
              {(showDetail.training_enrollments || []).length === 0 ? (
                <p className="text-sm text-gray-400">Belum ada peserta terdaftar</p>
              ) : (
                <div className="space-y-2">
                  {(showDetail.training_enrollments as TrainingEnrollmentWithEmployee[]).map(en => {
                    const emp = en.employees as Employee | undefined;
                    return (
                      <div key={en.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {emp?.first_name?.[0]}{emp?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{emp?.first_name} {emp?.last_name}</p>
                            {en.score !== null && <p className="text-xs text-gray-400">Skor: {en.score}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${enrollStatusColors[en.status]}`}>{enrollStatusLabels[en.status]}</span>
                          {(showDetail.status === 'ongoing' || showDetail.status === 'completed') && en.status === 'enrolled' && (
                            <button onClick={() => updateEnrollmentStatus(en.id, 'completed')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Lulus</button>
                          )}
                          {en.status === 'enrolled' && (
                            <button onClick={() => removeEnrollment(en.id)} className="text-xs text-red-500 hover:text-red-600">Hapus</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Training Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{editTraining ? 'Edit Training' : 'Buat Training Baru'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Judul Training <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Trainer</label>
                  <input value={form.trainer} onChange={e => setForm(f => ({ ...f, trainer: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lokasi</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kuota</label>
                  <input type="number" value={form.quota} onChange={e => setForm(f => ({ ...f, quota: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="upcoming">Akan Datang</option>
                    <option value="ongoing">Berlangsung</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.certificate} onChange={e => setForm(f => ({ ...f, certificate: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Bersertifikat</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                {saving ? 'Menyimpan...' : editTraining ? 'Simpan' : 'Buat Training'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Tambah Peserta</h2>
              <button onClick={() => setShowEnrollModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
              <p className="text-sm text-gray-500 mb-3">Pilih karyawan yang akan didaftarkan:</p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {employees.map(emp => {
                  const selected = enrollForm.employee_ids.includes(emp.id);
                  return (
                    <label key={emp.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={selected} onChange={() => toggleEmployee(emp.id)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {emp.first_name[0]}{emp.last_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-gray-400">{emp.employee_id}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {enrollForm.employee_ids.length > 0 && (
                <p className="text-sm text-blue-600 font-medium mt-3">{enrollForm.employee_ids.length} karyawan dipilih</p>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
              <button onClick={() => setShowEnrollModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
              <button onClick={handleEnroll} disabled={saving || enrollForm.employee_ids.length === 0} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                {saving ? 'Menyimpan...' : `Daftarkan ${enrollForm.employee_ids.length} Peserta`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
