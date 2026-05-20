import { useState } from 'react';
import {
  LayoutDashboard, Users, Clock, CalendarDays, Building2, Menu, X,
  LogOut, ChevronRight, Bell, Banknote, GraduationCap, Calculator,
  Building, Shield, User, FileText
} from 'lucide-react';
import { useAuth } from './lib/auth-context';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import AttendancePage from './pages/Attendance';
import Leaves from './pages/Leaves';
import Departments from './pages/Departments';
import Payroll from './pages/Payroll';
import TrainingPage from './pages/Training';
import SalaryFormulaPage from './pages/SalaryFormula';
import Branches from './pages/Branches';
import UsersPage from './pages/Users';
import EmployeeProfile from './pages/EmployeeProfile';

type Page = 'dashboard' | 'employees' | 'attendance' | 'leaves' | 'departments' | 'payroll' | 'training' | 'salary-formula' | 'branches' | 'users' | 'profile' | 'my-leaves' | 'expenses';

// Navigation for each role
const adminNav = [
  {
    label: 'Utama',
    items: [
      { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Manajemen',
    items: [
      { id: 'employees' as Page, label: 'Karyawan', icon: Users },
      { id: 'attendance' as Page, label: 'Kehadiran', icon: Clock },
      { id: 'leaves' as Page, label: 'Cuti', icon: CalendarDays },
      { id: 'departments' as Page, label: 'Departemen', icon: Building2 },
    ],
  },
  {
    label: 'Keuangan & Pengembangan',
    items: [
      { id: 'salary-formula' as Page, label: 'Formula Gaji', icon: Calculator },
      { id: 'payroll' as Page, label: 'Penggajian', icon: Banknote },
      { id: 'training' as Page, label: 'Training', icon: GraduationCap },
    ],
  },
  {
    label: 'Organisasi & Akses',
    items: [
      { id: 'branches' as Page, label: 'Cabang', icon: Building },
      { id: 'users' as Page, label: 'Pengguna & Permisi', icon: Shield },
    ],
  },
];

const leaderNav = [
  {
    label: 'Utama',
    items: [
      { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
];

const employeeNav = [
  {
    label: 'Profil',
    items: [
      { id: 'profile' as Page, label: 'Profil Saya', icon: User },
    ],
  },
  {
    label: 'Permohonan',
    items: [
      { id: 'my-leaves' as Page, label: 'Pengajuan Cuti', icon: CalendarDays },
      { id: 'expenses' as Page, label: 'Pengajuan Kasbon', icon: FileText },
    ],
  },
];

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  employees: 'Karyawan',
  attendance: 'Kehadiran',
  leaves: 'Manajemen Cuti',
  departments: 'Departemen & Jabatan',
  'salary-formula': 'Formula Gaji',
  payroll: 'Penggajian',
  training: 'Training & Pengembangan',
  branches: 'Cabang',
  users: 'Pengguna & Permisi',
  profile: 'Profil Saya',
  'my-leaves': 'Pengajuan Cuti',
  expenses: 'Pengajuan Kasbon',
};

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Get navigation based on role
  const navSections = user.role === 'admin' ? adminNav : user.role === 'leader' ? leaderNav : employeeNav;

  function renderPage() {
    // Admin has full access
    if (user.role === 'admin') {
      switch (page) {
        case 'dashboard': return <Dashboard />;
        case 'employees': return <Employees />;
        case 'attendance': return <AttendancePage />;
        case 'leaves': return <Leaves />;
        case 'departments': return <Departments />;
        case 'salary-formula': return <SalaryFormulaPage />;
        case 'payroll': return <Payroll />;
        case 'training': return <TrainingPage />;
        case 'branches': return <Branches />;
        case 'users': return <UsersPage />;
        default: return <Dashboard />;
      }
    }

    // Leader - read-only access to dashboard
    if (user.role === 'leader') {
      if (page === 'dashboard') return <Dashboard />;
      return <Dashboard />;
    }

    // Employee - self-service only
    if (user.role === 'employee') {
      switch (page) {
        case 'profile': return <EmployeeProfile />;
        case 'my-leaves': return <Leaves />;
        case 'expenses': return <div className="text-center py-12"><p className="text-gray-500">Fitur pengajuan kasbon akan segera tersedia</p></div>;
        default: return <EmployeeProfile />;
      }
    }

    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 flex flex-col
        transform transition-transform duration-300 ease-in-out shadow-lg lg:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">HRIS Pro</p>
              <p className={`text-xs font-medium ${
                user.role === 'admin' ? 'text-red-600' :
                user.role === 'leader' ? 'text-amber-600' :
                'text-emerald-600'
              }`}>
                {user.role === 'admin' ? 'Super Admin' : user.role === 'leader' ? 'Leader' : 'Karyawan'}
              </p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {navSections.map((section, si) => (
            <div key={section.label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-2">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = page === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setPage(item.id); setSidebarOpen(false); }}
                      className={`
                        w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                        ${active
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                        <span>{item.label}</span>
                      </div>
                      {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                    </button>
                  );
                })}
              </div>
              {si < navSections.length - 1 && <div className="border-b border-gray-100 mx-3 mt-3" />}
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.employee_name?.split(' ').map(n => n[0]).join('') || user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user.employee_name || user.email}</p>
              <p className="text-xs text-gray-400">{user.role}</p>
            </div>
            <button onClick={signOut} className="p-1 text-gray-300 hover:text-gray-500 shrink-0 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-10 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">{pageTitles[page]}</h2>
              <p className="text-xs text-gray-400 hidden sm:block">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
