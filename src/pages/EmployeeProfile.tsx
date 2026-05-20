import { useEffect, useState } from 'react';
import { User, Mail, Phone, Briefcase, Building2, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';
import type { Employee, Department, Position, Branch } from '../lib/database.types';

interface EmployeeDetails extends Employee {
  department?: Department | null;
  position?: Position | null;
  branch?: Branch | null;
}

export default function EmployeeProfile() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.employee_id) {
      fetchEmployeeData();
    }
  }, [user]);

  async function fetchEmployeeData() {
    try {
      const employees = await api.select('employees', { filter: `id.eq.${user?.employee_id}` }) as any[];
      if (employees && employees.length > 0) {
        const emp = employees[0];
        const [depts, pos, branches] = await Promise.all([
          api.select('departments') as Promise<Department[]>,
          api.select('positions') as Promise<Position[]>,
          api.select('branches') as Promise<Branch[]>,
        ]);

        setEmployee({
          ...emp,
          department: depts?.find(d => d.id === emp.department_id) || null,
          position: pos?.find(p => p.id === emp.position_id) || null,
          branch: branches?.find(b => b.id === emp.branch_id) || null,
        });
      }
    } catch (err) {
      console.error('Failed to fetch employee data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Data profil tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
        <p className="text-sm text-gray-500 mt-1">Informasi pribadi dan data pekerjaan</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-24" />
        <div className="px-6 pb-6">
          {/* Avatar and basic info */}
          <div className="flex items-start gap-4 -mt-12 mb-6">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg shrink-0">
              {employee.first_name?.[0]}{employee.last_name?.[0]}
            </div>
            <div className="flex-1 pt-2">
              <h2 className="text-2xl font-bold text-gray-900">{employee.first_name} {employee.last_name}</h2>
              <p className="text-sm text-gray-500">{employee.employee_id}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Personal Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Informasi Pribadi
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 mb-0.5">Email</p>
                  <p className="flex items-center gap-2 text-gray-900"><Mail className="w-4 h-4 text-gray-400" />{employee.email}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Telepon</p>
                  <p className="flex items-center gap-2 text-gray-900"><Phone className="w-4 h-4 text-gray-400" />{employee.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Jenis Kelamin</p>
                  <p className="text-gray-900 capitalize">{employee.gender === 'male' ? 'Laki-laki' : employee.gender === 'female' ? 'Perempuan' : '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Tanggal Lahir</p>
                  <p className="text-gray-900">{employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('id-ID') : '-'}</p>
                </div>
              </div>
            </div>

            {/* Work Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Informasi Pekerjaan
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 mb-0.5">Departemen</p>
                  <p className="flex items-center gap-2 text-gray-900"><Building2 className="w-4 h-4 text-gray-400" />{employee.department?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Jabatan</p>
                  <p className="flex items-center gap-2 text-gray-900"><Briefcase className="w-4 h-4 text-gray-400" />{employee.position?.title || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Tipe Pekerjaan</p>
                  <p className="text-gray-900 capitalize">
                    {employee.employment_type === 'full-time' ? 'Penuh Waktu' :
                     employee.employment_type === 'part-time' ? 'Paruh Waktu' :
                     employee.employment_type === 'contract' ? 'Kontrak' : 'Magang'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Cabang</p>
                  <p className="flex items-center gap-2 text-gray-900"><MapPin className="w-4 h-4 text-gray-400" />{employee.branch?.name || '-'}</p>
                </div>
              </div>
            </div>

            {/* Address Info */}
            <div className="space-y-4 sm:col-span-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Alamat
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 mb-0.5">Alamat Lengkap</p>
                  <p className="text-gray-900">{employee.address || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Kota</p>
                  <p className="text-gray-900">{employee.city || '-'}</p>
                </div>
              </div>
            </div>

            {/* Work History */}
            <div className="space-y-4 sm:col-span-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Sejarah Pekerjaan
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 mb-0.5">Tanggal Bergabung</p>
                  <p className="text-gray-900">{new Date(employee.hire_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Status</p>
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
                    employee.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    employee.status === 'inactive' ? 'bg-gray-100 text-gray-600' :
                    employee.status === 'on-leave' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {employee.status === 'active' ? 'Aktif' :
                     employee.status === 'inactive' ? 'Tidak Aktif' :
                     employee.status === 'on-leave' ? 'Cuti' : 'Diberhentikan'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
