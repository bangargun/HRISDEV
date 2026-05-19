import { useEffect, useState } from 'react';
import { Users, Clock, Calendar, TrendingUp, UserCheck, UserX, AlertCircle, ArrowUpRight, Building, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import type { Employee, Attendance, LeaveRequest, LeaveRequestWithRelations, Branch } from '../lib/database.types';

interface Stats {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  absentToday: number;
  pendingLeaves: number;
  onLeave: number;
}

interface BranchStats {
  branchId: string;
  branchName: string;
  branchCode: string;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0, activeEmployees: 0, presentToday: 0,
    absentToday: 0, pendingLeaves: 0, onLeave: 0,
  });
  const [branchStats, setBranchStats] = useState<BranchStats[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [recentLeaves, setRecentLeaves] = useState<LeaveRequestWithRelations[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<(Attendance & { employees?: Employee | null; branches?: Branch | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedBranch]);

  async function fetchDashboardData() {
    const today = new Date().toISOString().split('T')[0];

    const empParams: Record<string, string> = {};
    if (selectedBranch) empParams.branch_id_eq = selectedBranch;

    const attParams: Record<string, string> = { date_eq: today, limit: '15' };
    if (selectedBranch) attParams.filter = `branch_id.eq.${selectedBranch}`;

    const leaveParams: Record<string, string> = { order: 'created_at.desc', limit: '5' };

    const [employees, attendance, leaves, branchData, departments, leaveTypes] = await Promise.all([
      api.select('employees', empParams) as Promise<(Employee & { departments?: { name: string } | null; branches?: Branch | null })[]>,
      api.select('attendance', attParams) as Promise<(Attendance & { employees?: Employee | null; branches?: Branch | null })[]>,
      api.select('leave_requests', leaveParams) as Promise<LeaveRequestWithRelations[]>,
      api.select('branches', { order: 'name.asc' }) as Promise<Branch[]>,
      api.select('departments') as Promise<{ id: string; name: string }[]>,
      api.select('leave_types') as Promise<{ id: string; name: string; color: string }[]>,
    ]);

    // Join employees with departments and branches
    const employeesJoined = (employees || []).map(e => ({
      ...e,
      departments: departments?.find(d => d.id === e.department_id) || null,
      branches: branchData?.find(b => b.id === e.branch_id) || null,
    }));

    // Join attendance with employees (and their branches)
    const attendanceJoined = (attendance || []).map(a => {
      const emp = (employees || []).find(e => e.id === a.employee_id) as Employee | undefined;
      const empBranch = emp ? branchData?.find(b => b.id === emp.branch_id) || null : null;
      return {
        ...a,
        employees: emp ? { ...emp, branches: empBranch } : null,
        branches: empBranch,
      };
    });

    // Join leave_requests with employees and leave_types
    const leavesJoined = (leaves || []).map(l => ({
      ...l,
      employees: (employees || []).find(e => e.id === l.employee_id) as Employee | undefined,
      leave_types: leaveTypes?.find(lt => lt.id === l.leave_type_id) as { name: string; color: string } | undefined,
    }));

    const activeEmps = employeesJoined.filter(e => e.status === 'active');
    const presentToday = attendanceJoined.filter(a => a.status === 'present' || a.status === 'late').length;
    const absentToday = attendanceJoined.filter(a => a.status === 'absent').length;

    setStats({
      totalEmployees: employeesJoined.length,
      activeEmployees: activeEmps.length,
      presentToday,
      absentToday,
      pendingLeaves: leavesJoined.filter(l => l.status === 'pending').length,
      onLeave: leavesJoined.filter(l => l.status === 'approved').length,
    });

    // Branch stats
    const branchMap: Record<string, BranchStats> = {};
    branchData.forEach(b => {
      branchMap[b.id] = { branchId: b.id, branchName: b.name, branchCode: b.code, totalEmployees: 0, presentToday: 0, absentToday: 0 };
    });
    employeesJoined.forEach(e => {
      const bid = e.branches?.id || e.branch_id || '';
      if (branchMap[bid]) branchMap[bid].totalEmployees++;
    });
    attendanceJoined.forEach(a => {
      const emp = a.employees as (Employee & { branches?: Branch | null }) | undefined;
      const bid = emp?.branches?.id || emp?.branch_id || '';
      if (branchMap[bid]) {
        if (a.status === 'present' || a.status === 'late') branchMap[bid].presentToday++;
        if (a.status === 'absent') branchMap[bid].absentToday++;
      }
    });
    setBranchStats(Object.values(branchMap));
    setBranches(branchData);
    setRecentLeaves(leavesJoined);
    setRecentAttendance(attendanceJoined);
    setLoading(false);
  }

  const statCards = [
    { label: 'Total Karyawan', value: stats.totalEmployees, icon: Users, color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-600', sub: `${stats.activeEmployees} aktif` },
    { label: 'Hadir Hari Ini', value: stats.presentToday, icon: UserCheck, color: 'bg-emerald-500', lightColor: 'bg-emerald-50', textColor: 'text-emerald-600', sub: `${stats.absentToday} tidak hadir` },
    { label: 'Cuti Pending', value: stats.pendingLeaves, icon: Clock, color: 'bg-amber-500', lightColor: 'bg-amber-50', textColor: 'text-amber-600', sub: 'Perlu disetujui' },
    { label: 'Sedang Cuti', value: stats.onLeave, icon: Calendar, color: 'bg-rose-500', lightColor: 'bg-rose-50', textColor: 'text-rose-600', sub: 'Hari ini' },
  ];

  const statusColors: Record<string, string> = {
    present: 'bg-emerald-100 text-emerald-700',
    absent: 'bg-red-100 text-red-700',
    late: 'bg-amber-100 text-amber-700',
    'half-day': 'bg-blue-100 text-blue-700',
  };

  const leaveStatusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer"
          >
            <option value="">Semua Cabang</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className={`${card.lightColor} p-2.5 rounded-lg`}>
                <card.icon className={`w-5 h-5 ${card.textColor}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm font-medium text-gray-600 mt-0.5">{card.label}</p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Branch Overview */}
      {!selectedBranch && branchStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-800">Ringkasan per Cabang</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchStats.map(bs => (
              <div key={bs.branchId} className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer" onClick={() => setSelectedBranch(bs.branchId)}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Building className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{bs.branchName}</p>
                    <p className="text-xs text-gray-400 font-mono">{bs.branchCode}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-gray-900">{bs.totalEmployees}</p>
                    <p className="text-xs text-gray-400">Karyawan</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-emerald-700">{bs.presentToday}</p>
                    <p className="text-xs text-emerald-600">Hadir</p>
                  </div>
                  <div className="bg-red-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-red-700">{bs.absentToday}</p>
                    <p className="text-xs text-red-600">Absen</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-800">Karyawan per Departemen</h2>
          </div>
          <DeptChart selectedBranch={selectedBranch} />
        </div>

        {/* Recent leave requests */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-800">Permohonan Cuti Terbaru</h2>
          </div>
          {recentLeaves.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada permohonan cuti</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLeaves.map(leave => (
                <div key={leave.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {(leave.employees as Employee | undefined)?.first_name?.[0] ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {(leave.employees as Employee | undefined)?.first_name} {(leave.employees as Employee | undefined)?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(leave.leave_types as { name: string } | undefined)?.name} · {leave.days_count} hari
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${leaveStatusColors[leave.status]}`}>
                    {leave.status === 'pending' ? 'Menunggu' : leave.status === 'approved' ? 'Disetujui' : leave.status === 'rejected' ? 'Ditolak' : 'Dibatalkan'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's attendance */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-800">Kehadiran Hari Ini</h2>
        </div>
        {recentAttendance.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <UserX className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Belum ada data kehadiran hari ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-medium text-gray-500">Karyawan</th>
                  <th className="text-left py-2 font-medium text-gray-500">Cabang</th>
                  <th className="text-left py-2 font-medium text-gray-500">Masuk</th>
                  <th className="text-left py-2 font-medium text-gray-500">Keluar</th>
                  <th className="text-left py-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map(att => {
                  const emp = att.employees as (Employee & { branches?: Branch | null }) | undefined;
                  return (
                    <tr key={att.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-2.5 font-medium text-gray-800">
                        {emp?.first_name} {emp?.last_name}
                      </td>
                      <td className="py-2.5 text-gray-500 text-xs">{emp?.branches?.name || '-'}</td>
                      <td className="py-2.5 text-gray-600">
                        {att.check_in ? new Date(att.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2.5 text-gray-600">
                        {att.check_out ? new Date(att.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[att.status] || 'bg-gray-100 text-gray-600'}`}>
                          {att.status === 'present' ? 'Hadir' : att.status === 'absent' ? 'Tidak Hadir' : att.status === 'late' ? 'Terlambat' : att.status === 'half-day' ? 'Setengah Hari' : att.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DeptChart({ selectedBranch }: { selectedBranch: string }) {
  const [deptCounts, setDeptCounts] = useState<{ name: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      const empParams: Record<string, string> = {};
      if (selectedBranch) empParams.branch_id_eq = selectedBranch;

      const [emps, depts] = await Promise.all([
        api.select('employees', empParams) as Promise<Employee[]>,
        api.select('departments') as Promise<{ id: string; name: string }[]>,
      ]);

      const employeesJoined = (emps || []).map(e => ({
        ...e,
        departments: (depts || []).find(d => d.id === e.department_id) || null,
      }));

      const map: Record<string, number> = {};
      employeesJoined.forEach(e => {
        const name = e.departments?.name || 'Lainnya';
        map[name] = (map[name] || 0) + 1;
      });
      setDeptCounts(Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
      setTotal(employeesJoined.length);
    })();
  }, [selectedBranch]);

  return (
    <div className="space-y-3">
      {deptCounts.map(dept => {
        const pct = total > 0 ? Math.round((dept.count / total) * 100) : 0;
        return (
          <div key={dept.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 font-medium">{dept.name}</span>
              <span className="text-gray-500">{dept.count} ({pct}%)</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
