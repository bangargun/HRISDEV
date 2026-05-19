import { useEffect, useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, X, Users, Briefcase } from 'lucide-react';
import { api } from '../lib/api';
import type { Department, Employee, Position } from '../lib/database.types';

type DepartmentWithDetails = Department & {
  employees?: Employee[];
  positions?: Position[];
  manager?: Employee | null;
};

interface DeptForm {
  name: string;
  description: string;
  manager_id: string;
}

interface PosForm {
  title: string;
  department_id: string;
  level: string;
  description: string;
}

export default function Departments() {
  const [departments, setDepartments] = useState<DepartmentWithDetails[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showPosModal, setShowPosModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [editPos, setEditPos] = useState<Position | null>(null);
  const [deptForm, setDeptForm] = useState<DeptForm>({ name: '', description: '', manager_id: '' });
  const [posForm, setPosForm] = useState<PosForm>({ title: '', department_id: '', level: 'staff', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [depts, pos, emps] = await Promise.all([
      api.select('departments', { order: 'name.asc' }),
      api.select('positions', { order: 'title.asc' }),
      api.select('employees', { status_eq: 'active', order: 'first_name.asc' }),
    ]);

    const deptsWithDetails: DepartmentWithDetails[] = depts.map(d => ({
      ...d,
      employees: emps.filter(e => e.department_id === d.id),
      positions: pos.filter(p => p.department_id === d.id),
      manager: emps.find(e => e.id === d.manager_id) || null,
    }));

    setDepartments(deptsWithDetails);
    setPositions(pos);
    setEmployees(emps);
    setLoading(false);
  }

  function openAddDept() {
    setEditDept(null);
    setDeptForm({ name: '', description: '', manager_id: '' });
    setShowDeptModal(true);
  }

  function openEditDept(dept: Department) {
    setEditDept(dept);
    setDeptForm({ name: dept.name, description: dept.description, manager_id: dept.manager_id || '' });
    setShowDeptModal(true);
  }

  async function saveDept() {
    if (!deptForm.name) return;
    setSaving(true);
    const payload = { name: deptForm.name, description: deptForm.description, manager_id: deptForm.manager_id || null };
    if (editDept) {
      await api.update('departments', editDept.id, payload);
    } else {
      await api.insert('departments', payload);
    }
    setSaving(false);
    setShowDeptModal(false);
    fetchData();
  }

  async function deleteDept(id: string) {
    if (!confirm('Hapus departemen ini? Semua data terkait akan terpengaruh.')) return;
    await api.delete('departments', id);
    fetchData();
  }

  function openAddPos(deptId?: string) {
    setEditPos(null);
    setPosForm({ title: '', department_id: deptId || '', level: 'staff', description: '' });
    setShowPosModal(true);
  }

  function openEditPos(pos: Position) {
    setEditPos(pos);
    setPosForm({ title: pos.title, department_id: pos.department_id || '', level: pos.level, description: pos.description });
    setShowPosModal(true);
  }

  async function savePos() {
    if (!posForm.title) return;
    setSaving(true);
    const payload = { title: posForm.title, department_id: posForm.department_id || null, level: posForm.level as Position['level'], description: posForm.description };
    if (editPos) {
      await api.update('positions', editPos.id, payload);
    } else {
      await api.insert('positions', payload);
    }
    setSaving(false);
    setShowPosModal(false);
    fetchData();
  }

  async function deletePos(id: string) {
    if (!confirm('Hapus jabatan ini?')) return;
    await api.delete('positions', id);
    fetchData();
  }

  const levelColors: Record<string, string> = {
    intern: 'bg-gray-100 text-gray-600',
    staff: 'bg-blue-50 text-blue-700',
    senior: 'bg-teal-50 text-teal-700',
    lead: 'bg-emerald-50 text-emerald-700',
    manager: 'bg-amber-50 text-amber-700',
    director: 'bg-orange-50 text-orange-700',
    vp: 'bg-rose-50 text-rose-700',
    'c-level': 'bg-red-50 text-red-700',
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Departemen & Jabatan</h1>
          <p className="text-sm text-gray-500 mt-1">{departments.length} departemen · {positions.length} jabatan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openAddPos()} className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Tambah Jabatan
          </button>
          <button onClick={openAddDept} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Tambah Departemen
          </button>
        </div>
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {departments.map(dept => (
          <div key={dept.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{dept.name}</h3>
                  {dept.description && <p className="text-sm text-gray-500 mt-0.5">{dept.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEditDept(dept)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-400 hover:text-blue-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteDept(dept.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>{dept.employees?.length || 0} karyawan</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Briefcase className="w-4 h-4" />
                  <span>{dept.positions?.length || 0} jabatan</span>
                </div>
              </div>

              {dept.manager && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {dept.manager.first_name[0]}{dept.manager.last_name[0]}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Kepala Departemen</p>
                    <p className="text-sm font-medium text-gray-800">{dept.manager.first_name} {dept.manager.last_name}</p>
                  </div>
                </div>
              )}

              {/* Positions in this dept */}
              {dept.positions && dept.positions.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jabatan</p>
                    <button onClick={() => openAddPos(dept.id)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Tambah</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dept.positions.map(pos => (
                      <div key={pos.id} className="group flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-default">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${levelColors[pos.level]}`}>{pos.level}</span>
                        <span className="text-sm text-gray-700">{pos.title}</span>
                        <div className="hidden group-hover:flex gap-0.5 ml-1">
                          <button onClick={() => openEditPos(pos)} className="p-0.5 hover:bg-blue-100 rounded text-gray-400 hover:text-blue-600 transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => deletePos(pos.id)} className="p-0.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {(!dept.positions || dept.positions.length === 0) && (
              <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                <button onClick={() => openAddPos(dept.id)} className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Tambah jabatan
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dept Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editDept ? 'Edit Departemen' : 'Tambah Departemen'}</h2>
              <button onClick={() => setShowDeptModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Departemen <span className="text-red-500">*</span></label>
                <input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                <textarea value={deptForm.description} onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kepala Departemen</label>
                <select value={deptForm.manager_id} onChange={e => setDeptForm(f => ({ ...f, manager_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Tidak Ditentukan</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowDeptModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
              <button onClick={saveDept} disabled={saving || !deptForm.name} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                {saving ? 'Menyimpan...' : editDept ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Position Modal */}
      {showPosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editPos ? 'Edit Jabatan' : 'Tambah Jabatan'}</h2>
              <button onClick={() => setShowPosModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Jabatan <span className="text-red-500">*</span></label>
                <input value={posForm.title} onChange={e => setPosForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Departemen</label>
                <select value={posForm.department_id} onChange={e => setPosForm(f => ({ ...f, department_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Tidak Ditentukan</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
                <select value={posForm.level} onChange={e => setPosForm(f => ({ ...f, level: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['intern', 'staff', 'senior', 'lead', 'manager', 'director', 'vp', 'c-level'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                <textarea value={posForm.description} onChange={e => setPosForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowPosModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
              <button onClick={savePos} disabled={saving || !posForm.title} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                {saving ? 'Menyimpan...' : editPos ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
