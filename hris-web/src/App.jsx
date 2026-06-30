import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Employees from './components/Employees';
import Attendances from './components/Attendances';
import Leaves from './components/Leaves';
import Payroll from './components/Payroll';
import SettingsPage from './components/SettingsPage';
import OutletPage from './components/OutletPage';
import OmzetCabang from './components/OmzetCabang';
import SopPage from './components/SopPage';
import KontrakPage from './components/KontrakPage';
import PenilaianKPI from './components/PenilaianKPI';
import SanksiPage from './components/SanksiPage';
import ProgramPelatihanBaru from './components/ProgramPelatihanBaru';
import PolicyPage from './components/PolicyPage';
import KuisKompetensi from './components/KuisKompetensi';
import AngketKaryawan from './components/AngketKaryawan';
import BroadcastUtama from './components/BroadcastUtama';
import { HRISProvider } from './context/HRISContext';
import SyncOverlay from './components/SyncOverlay';
import HakUser from './components/HakUser';

import {
  Lock, CheckCircle, Eye, EyeOff, Loader2, LayoutDashboard,
  Users, Calendar, ShieldAlert, FileText, Store, Coins,
  BookOpen, BarChart3, AlertTriangle, Award, ClipboardList,
  Radio, Shield, Settings, Key, LogOut
} from 'lucide-react';
import { checkAccess, getRoleFromPosition } from './utils/security';
import './App.css';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    let hostname = window.location.hostname;
    if (hostname.includes('barokahgroupindonesia.tech')) {
      return 'https://api.barokahgroupindonesia.tech/api';
    }
    if (hostname === 'localhost') {
      hostname = '127.0.0.1';
    }
    const isTunnel = hostname.includes('localtunnel') || hostname.includes('ngrok') || hostname.includes('loca.lt') || hostname.includes('trycloudflare');
    if (!isTunnel) {
      return `http://${hostname}:5000/api`;
    }
  }
  return 'http://127.0.0.1:5000/api';
};

const API_URL = getApiUrl();

const validateLocalLogin = (inputEmail, password) => {
  // Try parsing user_credentials first
  let creds = null;
  try {
    const raw = localStorage.getItem('user_credentials');
    creds = raw ? JSON.parse(raw) : null;
  } catch (e) {}

  // Fallback to separate keys if user_credentials doesn't exist
  let passwords = creds?.passwords || {};
  let usernames = creds?.usernames || {};
  let roles = creds?.roles || {};

  if (!creds) {
    try {
      passwords = JSON.parse(localStorage.getItem('hris_user_passwords') || '{}');
      usernames = JSON.parse(localStorage.getItem('hris_custom_usernames') || '{}');
      roles = JSON.parse(localStorage.getItem('hris_user_roles') || '{}');
    } catch (e) {}
  }

  // Support super admin local intercept 'admin' / 'admin123'
  if (inputEmail === 'admin' && password === 'admin123') {
    return {
      id: 9999,
      email: 'admin@hris.local',
      role: 'owner',
      fullName: 'Admin Super',
      position: 'Super Administrator'
    };
  }

  const localEmployees = JSON.parse(localStorage.getItem('hris_employees') || '[]');
  let foundEmp = null;

  for (let i = 0; i < localEmployees.length; i++) {
    const emp = localEmployees[i];
    const firstName = emp.full_name.trim().split(/\s+/)[0] || 'USR';
    const prefix = (firstName.substring(0, 3).padEnd(3, 'X')).toUpperCase();
    const suffix = String(i + 1).padStart(5, '0');
    const generatedId = prefix + suffix;
    const customUsername = usernames[emp.id];
    
    if (
      generatedId.toLowerCase() === inputEmail ||
      (customUsername && customUsername.toLowerCase() === inputEmail)
    ) {
      foundEmp = emp;
      break;
    }
  }

  if (foundEmp) {
    const savedPass = passwords[foundEmp.id] || foundEmp.nik || '123456';
    if (String(savedPass) === String(password)) {
      const userRole = (roles[foundEmp.id] || getRoleFromPosition(foundEmp.position, foundEmp.role) || 'karyawan').toLowerCase();
      const isWebAllowed = userRole === 'master' || userRole === 'owner' || userRole === 'admin' || userRole === 'leader';
      
      if (!isWebAllowed) {
        throw new Error('Akses Ditolak: Akun Karyawan biasa hanya diperbolehkan masuk melalui Aplikasi Mobile Android.');
      }

      return {
        id: foundEmp.id,
        email: foundEmp.nik + '@hris.local',
        role: (userRole === 'master' || userRole === 'owner') ? 'owner' : (userRole === 'leader' ? 'leader' : 'admin'),
        employeeId: foundEmp.id,
        fullName: foundEmp.full_name,
        outlet: foundEmp.outlet,
        position: foundEmp.position
      };
    }
  }

  // Check default credentials
  if (inputEmail === 'admin@hris.com' && password === 'admin123') {
    return {
      id: 2,
      email: 'admin@hris.com',
      role: 'admin',
      fullName: 'HR Administrator',
      position: 'Human Resources Manager'
    };
  }
  if (inputEmail === 'owner@hris.com' && password === 'ownerpassword123') {
    return {
      id: 1,
      email: 'owner@hris.com',
      role: 'owner',
      fullName: 'Direktur Utama',
      position: 'Chief Executive Officer'
    };
  }

  return null;
};

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('menu');
  const [userPermissions, setUserPermissions] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Clear old seeded mockup data from localStorage (one-time migration for live deployment)
  useEffect(() => {
    try {
      const dailyLogsStr = localStorage.getItem('daily_revenue_logs');
      if (dailyLogsStr) {
        const dailyLogs = JSON.parse(dailyLogsStr);
        if (Array.isArray(dailyLogs) && dailyLogs.some(log => log.id && String(log.id).includes('seed'))) {
          const cleaned = dailyLogs.filter(log => log.id && !String(log.id).includes('seed'));
          localStorage.setItem('daily_revenue_logs', JSON.stringify(cleaned));
        }
      }
    } catch (e) {
      console.error('Error migrating daily_revenue_logs:', e);
    }

    try {
      const targetOmzetStr = localStorage.getItem('target_omzet_data');
      if (targetOmzetStr) {
        const targetOmzet = JSON.parse(targetOmzetStr);
        if (Array.isArray(targetOmzet) && targetOmzet.some(target => target.id && String(target.id).includes('seed'))) {
          const cleaned = targetOmzet.filter(target => target.id && !String(target.id).includes('seed'));
          localStorage.setItem('target_omzet_data', JSON.stringify(cleaned));
        }
      }
    } catch (e) {
      console.error('Error migrating target_omzet_data:', e);
    }

    try {
      const surveysStr = localStorage.getItem('hris_360_surveys');
      if (surveysStr) {
        const surveys = JSON.parse(surveysStr);
        if (Array.isArray(surveys) && surveys.some(s => s.id && String(s.id).includes('SEED'))) {
          localStorage.removeItem('hris_360_surveys');
          localStorage.removeItem('hris_360_responses');
          localStorage.removeItem('survey_360_data');
          localStorage.removeItem('hris_kpi_card_summary');
        }
      }
    } catch (e) {
      console.error('Error migrating KPI data:', e);
    }

    try {
      if (!localStorage.getItem('hris_payroll_cleanup_v2')) {
        const keysToRemove = [
          'hris_employees',
          'karyawan_data',
          'hris_payroll_slips',
          'hris_payroll_mobile_slips',
          'hris_attendances_history',
          'attendances_history',
          'hris_attendance_history',
          'attendance_logs',
          'hris_attendances_realtime',
          'hris_leaves',
          'leaves',
          'hris_leave_requests'
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
        localStorage.setItem('hris_payroll_cleanup_v2', 'true');
        console.log('Permanently cleared cached employees, payroll, attendance, and leave mock/existing local storage data.');
      }
    } catch (e) {
      console.error('Error during payroll and attendance cleanup:', e);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Ambil daftar perizinan dinamis pengguna saat token tersedia
  useEffect(() => {
    if (token) {
      if (token === 'local-admin-token' || token.startsWith('local-employee-token-')) {
        const mockPermissions = {};
        const modules = [
          'employees', 'attendances', 'leaves', 'payroll', 'outlets',
          'revenues', 'sops', 'contracts', 'kpis', 'sanctions',
          'trainings', 'policies', 'settings', 'kuis', 'broadcast'
        ];
        for (const mod of modules) {
          mockPermissions[mod] = { can_view: 1, can_edit: 1, can_delete: 1 };
        }
        setUserPermissions(mockPermissions);
        return;
      }

      fetch(`${API_URL}/auth/my-permissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setUserPermissions(data.data.permissions);
        }
      })
      .catch(err => console.error('Eror mengambil hak akses:', err));
    } else {
      setUserPermissions(null);
    }
  }, [token]);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Periksa apakah token ada di sessionStorage saat boot (untuk persistensi ringan sesi)
  useEffect(() => {
    const savedToken = sessionStorage.getItem('token');
    const savedUser = sessionStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const startTime = Date.now();

    const inputEmail = email.toLowerCase().trim();

    // Promise for Network Login Check
    const networkLoginPromise = (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inputEmail, password, client: 'web' }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Network error or invalid credentials');
        }

        const data = await res.json();
        if (data.status === 'success') {
          return data.data;
        } else {
          throw new Error(data.message || 'Invalid credentials');
        }
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    })();

    try {
      // Race the network request against a hard 1.5s timeout
      const networkResult = await Promise.race([
        networkLoginPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
      ]);

      // Make sure we run the loading state for at least 0.3s
      const elapsed = Date.now() - startTime;
      if (elapsed < 300) {
        await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
      }

      // Successful network login
      setLoggingIn(false);
      
      const userObj = networkResult.user;
      if (userObj.role !== 'owner' && userObj.role !== 'admin' && userObj.role !== 'leader' && userObj.role !== 'master') {
        setLoginError('Akses Ditolak: Akun Karyawan biasa hanya diperbolehkan masuk melalui Aplikasi Mobile Android.');
        return;
      }

      // Zero-Error Login success actions
      if (navigator.vibrate) navigator.vibrate(50); // subtle haptic vibration
      setToken(networkResult.token);
      setUser(userObj);
      sessionStorage.setItem('token', networkResult.token);
      sessionStorage.setItem('user', JSON.stringify(userObj));
      setPassword(''); // Clear password field
    } catch (netErr) {
      console.log('Network auth failed or timed out. Falling back to local authentication...', netErr.message);

      // LocalStorage Fallback Authentication
      try {
        const localResult = validateLocalLogin(inputEmail, password);

        // Make sure we run the loading state for at least 0.3s
        const elapsed = Date.now() - startTime;
        if (elapsed < 300) {
          await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
        }

        setLoggingIn(false);

        if (localResult) {
          // Zero-Error Login success actions
          if (navigator.vibrate) navigator.vibrate(50); // subtle haptic vibration
          const localToken = 'local-session-token-' + localResult.id;
          setToken(localToken);
          setUser(localResult);
          sessionStorage.setItem('token', localToken);
          sessionStorage.setItem('user', JSON.stringify(localResult));
          setPassword(''); // Clear password field
        } else {
          setLoginError('Email / ID Pengguna atau password salah.');
        }
      } catch (localErr) {
        setLoggingIn(false);
        setLoginError(localErr.message || 'Gagal memproses otentikasi.');
      }
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setActiveTab('menu');
  };

  const renderTabContent = () => {
    // 1. Proteksi Halaman Hak Akses & Hak User (settings / hakuser) - Khusus Peran Master
    const currentUserRole = getRoleFromPosition(user?.position, user?.role);
    if ((activeTab === 'settings' || activeTab === 'hakuser') && currentUserRole !== 'master' && currentUserRole !== 'owner') {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          marginTop: '20px'
        }} className="glass-card">
          <h2 style={{ color: 'var(--danger)', marginBottom: '16px' }}>Akses Ditolak</h2>
          <p style={{ color: 'var(--text-muted)' }}>Halaman ini hanya dapat diakses oleh akun dengan Peran Master.</p>
        </div>
      );
    }

    // 2. Proteksi Halaman Berdasarkan Dynamic READ access
    if (activeTab !== 'dashboard' && !checkAccess(user, 'read')) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          marginTop: '20px'
        }} className="glass-card">
          <h2 style={{ color: 'var(--danger)', marginBottom: '16px' }}>Akses Ditolak</h2>
          <p style={{ color: 'var(--text-muted)' }}>Anda tidak memiliki wewenang untuk melihat halaman ini.</p>
        </div>
      );
    }

    // 3. Proteksi Halaman Berdasarkan can_view (Fallback backend)
    if (
      userPermissions &&
      activeTab !== 'dashboard' &&
      userPermissions[activeTab] &&
      userPermissions[activeTab].can_view === 0
    ) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          marginTop: '20px'
        }} className="glass-card">
          <h2 style={{ color: 'var(--danger)', marginBottom: '16px' }}>Akses Ditolak</h2>
          <p style={{ color: 'var(--text-muted)' }}>Anda tidak memiliki wewenang untuk melihat halaman ini.</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard token={token} API_URL={API_URL} userPermissions={userPermissions} setActiveTab={setActiveTab} />;
      case 'employees':
        return <Employees token={token} API_URL={API_URL} userPermissions={userPermissions} user={user} theme={theme} />;
      case 'attendances':
        return <Attendances token={token} API_URL={API_URL} userPermissions={userPermissions} setActiveTab={setActiveTab} />;
      case 'leaves':
        return <Leaves token={token} API_URL={API_URL} userPermissions={userPermissions} user={user} />;
      case 'payroll':
        return <Payroll token={token} API_URL={API_URL} userPermissions={userPermissions} />;
      case 'contracts':
        return <KontrakPage token={token} API_URL={API_URL} userPermissions={userPermissions} />;
      case 'settings':
        return <SettingsPage token={token} API_URL={API_URL} userPermissions={userPermissions} user={user} />;
      case 'hakuser':
        return <HakUser token={token} API_URL={API_URL} user={user} />;
      case 'outlets':
        return <OutletPage token={token} API_URL={API_URL} userPermissions={userPermissions} user={user} />;
      case 'revenues':
        return <OmzetCabang token={token} API_URL={API_URL} userPermissions={userPermissions} theme={theme} />;
      case 'sops':
        return <SopPage token={token} API_URL={API_URL} userPermissions={userPermissions} />;

      case 'kpis':
        return <PenilaianKPI token={token} API_URL={API_URL} userPermissions={userPermissions} />;
      case 'sanctions':
        return <SanksiPage token={token} API_URL={API_URL} userPermissions={userPermissions} />;
      case 'trainings':
        return <ProgramPelatihanBaru token={token} API_URL={API_URL} userPermissions={userPermissions} />;
      case 'policies':
        return <PolicyPage token={token} API_URL={API_URL} userPermissions={userPermissions} user={user} />;
      case 'kuis':
        return <KuisKompetensi token={token} API_URL={API_URL} userPermissions={userPermissions} />;
      case 'angket':
        return <AngketKaryawan token={token} API_URL={API_URL} userPermissions={userPermissions} />;
      case 'broadcast':
        return <BroadcastUtama token={token} API_URL={API_URL} userPermissions={userPermissions} />;

      default:
        return <Dashboard token={token} API_URL={API_URL} userPermissions={userPermissions} setActiveTab={setActiveTab} />;
    }
  };

  // Jika Belum Terotentikasi, Render Tampilan Login Frosted Glass
  if (!token) {
    return (
      <div className="login-screen">
        <div className="glass-card login-card animate-fade-in">
          <div className="login-header">
            <div className="logo-icon" style={{ margin: '0 auto', width: '50px', height: '50px' }}>
              <Lock size={24} color="#fff" />
            </div>
            <h2>Barokah Grup</h2>
            <p>Masukkan ID dan password Anda untuk masuk</p>
          </div>

          <form onSubmit={handleLoginSubmit} style={{ textAlign: 'left' }}>
            {loginError && (
              <p style={{
                color: 'var(--danger)',
                background: 'var(--danger-glow)',
                padding: '12px',
                borderRadius: '10px',
                marginBottom: '20px',
                fontSize: '0.9rem',
                border: '1px solid hsla(0, 84%, 60%, 0.2)'
              }}>
                {loginError}
              </p>
            )}

             <div className="input-group">
              <label>ID Pengguna</label>
              <input
                type="text"
                className="input-field"
                placeholder="Masukkan ID atau Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loggingIn}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>

            <div className="input-group" style={{ position: 'relative' }}>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: '40px' }}
                  required
                  disabled={loggingIn}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loggingIn}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    zIndex: 5
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loggingIn} style={{ width: '100%', justifyContent: 'center', marginTop: '20px', height: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {loggingIn ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={18} />}
              <span>{loggingIn ? 'Menghubungkan ke Gerbang Barokah API & Sinkronisasi Kredensial...' : 'Masuk Dashboard'}</span>
            </button>
            {loggingIn && <div className="marching-loader"></div>}


          </form>


        </div>
      </div>
    );
  }

  const capitalEachWord = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  const titles = {
    menu: 'Menu Utama Portal',
    dashboard: 'Dasbor Analitik Utama',
    employees: 'Manajemen Data Karyawan',
    attendances: 'Kehadiran Karyawan',
    leaves: 'Manajemen Cuti & Izin (Pusat Pengajuan)',
    payroll: 'Pemrosesan Slip Gaji (Payroll)',
    contracts: 'Manajemen Surat Penugasan',
    outlets: 'Manajemen Outlet Cabang Utama',
    revenues: 'Omzet Pendapatan Cabang',
    sops: 'SOP & Prosedur Operasional',
    kpis: 'Penilaian Kinerja KPI',
    sanctions: 'Sanksi & Surat Peringatan (SP)',
    trainings: 'Program Pelatihan & Sertifikasi',
    policies: 'Kebijakan & Peraturan Perusahaan',
    kuis: 'Kuis Kompetensi Karyawan',
    angket: 'Angket Karyawan',
    broadcast: 'Broadcast & Notifikasi',
    settings: 'Hak Akses RBAC',
    hakuser: 'Hak Akses User & Karyawan',
  };

  const renderMenuAwal = () => {
    const currentUserRole = getRoleFromPosition(user?.position, user?.role);
    const isMaster = (currentUserRole === 'master' || currentUserRole === 'owner' || user?.role === 'owner' || user?.role === 'master');

    const allMenuItems = [
      { id: 'dashboard', label: 'Dashboard Utama', desc: 'Dasbor analitik, performa, dan statistik HRIS.', icon: LayoutDashboard, color: '#00ADB5' },
      { id: 'employees', label: 'Kelola Karyawan', desc: 'Manajemen database staf, jabatan, dan kontrak.', icon: Users, color: '#32E0C4' },
      { id: 'attendances', label: 'Kehadiran Karyawan', desc: 'Pantau absensi harian, keterlambatan, dan jam kerja.', icon: Calendar, color: '#FFD369' },
      { id: 'leaves', label: 'Pusat Pengajuan', desc: 'Pengajuan cuti, izin, kasbon, dan persetujuan staf.', icon: ShieldAlert, color: '#FF7C7C' },
      { id: 'payroll', label: 'Payroll', desc: 'Proses penggajian, tunjangan, potongan, dan slip gaji.', icon: FileText, color: '#A5B68D' },
      { id: 'contracts', label: 'Surat Penugasan', desc: 'Buat dan kelola surat tugas mutasi/demosi staf.', icon: FileText, color: '#b42df1' },
      { id: 'outlets', label: 'Outlet Cabang', desc: 'Kelola data lokasi cabang dan koordinat geofencing.', icon: Store, color: '#4ECDC4' },
      { id: 'revenues', label: 'Omzet Cabang', desc: 'Input dan rekap omzet harian tiap outlet cabang.', icon: Coins, color: '#F5A623' },
      { id: 'sops', label: 'SOP & Prosedur', desc: 'Akses dokumentasi SOP dan prosedur operasional cabang.', icon: BookOpen, color: '#00D2FC' },
      { id: 'kpis', label: 'Penilaian KPI', desc: 'Evaluasi kinerja dan leaderboard KPI karyawan.', icon: BarChart3, color: '#FF8008' },
      { id: 'sanctions', label: 'Sanksi & SP', desc: 'Pemberian Surat Peringatan (SP) dan konseling staf.', icon: AlertTriangle, color: '#E05C5C' },
      { id: 'trainings', label: 'Program Pelatihan', desc: 'Manajemen materi training dan program peningkatan staf.', icon: Award, color: '#6C5CE7' },
      { id: 'kuis', label: 'Kuis Kompetensi', desc: 'Generate soal dan uji kompetensi berkala staf.', icon: BookOpen, color: '#0984E3' },
      { id: 'angket', label: 'Angket Karyawan', desc: 'Survey kepuasan dan angket aspirasi tim.', icon: ClipboardList, color: '#00CEC9' },
      { id: 'broadcast', label: 'Broadcast & Notifikasi', desc: 'Kirim pengumuman massal dan notifikasi push.', icon: Radio, color: '#E84393' },
      { id: 'policies', label: 'Kebijakan Perusahaan', desc: 'Panduan peraturan, kasbon, dan hak karyawan.', icon: Shield, color: '#636E72' },
    ];

    const filteredItems = allMenuItems.filter(item => {
      if (user?.role === 'owner' || user?.role === 'master') return true;
      if (userPermissions && userPermissions[item.id]) {
        return userPermissions[item.id].can_view === 1;
      }
      return false;
    });

    if (isMaster) {
      filteredItems.push(
        { id: 'settings', label: 'Hak Akses', desc: 'Atur perizinan per modul untuk Admin & Leader.', icon: Settings, color: '#9B59B6' },
        { id: 'hakuser', label: 'Hak User', desc: 'Kelola username & password login akun web/mobile.', icon: Key, color: '#F1C40F' }
      );
    }

    return (
      <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Welcome Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(57,62,70,0.6) 0%, rgba(34,40,49,0.8) 100%)',
          borderRadius: '20px',
          border: '1.5px solid rgba(0,173,181,0.2)',
          padding: '30px 40px',
          marginBottom: '35px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Decorative Glow */}
          <div style={{
            position: 'absolute', top: '-100px', right: '-100px',
            width: '300px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,173,181,0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span>Selamat Datang Kembali, {user?.fullName}!</span>
            <span style={{ fontSize: '0.9rem', background: 'rgba(0,173,181,0.15)', color: '#00ADB5', padding: '4px 12px', borderRadius: '30px', border: '1px solid rgba(0,173,181,0.3)', fontWeight: 700 }}>
              {user?.position || 'Pengguna'}
            </span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.6 }}>
            Silakan pilih modul di bawah untuk mengelola sistem HRIS Barokah Grup secara terpusat.
          </p>
        </div>

        {/* Grid Menu Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {filteredItems.map(item => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(30);
                  setActiveTab(item.id);
                }}
                className="menu-card-item animate-fade-in"
                style={{
                  background: 'rgba(57,62,70,0.3)',
                  border: '1.5px solid rgba(255,255,255,0.06)',
                  borderRadius: '20px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  backdropFilter: 'blur(5px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.border = `1.5px solid ${item.color}50`;
                  e.currentTarget.style.boxShadow = `0 12px 30px ${item.color}15`;
                  const iconBox = e.currentTarget.querySelector('.menu-icon-box');
                  if (iconBox) {
                    iconBox.style.background = item.color;
                    iconBox.style.color = '#222831';
                    iconBox.style.boxShadow = `0 0 15px ${item.color}80`;
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.06)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                  const iconBox = e.currentTarget.querySelector('.menu-icon-box');
                  if (iconBox) {
                    iconBox.style.background = 'rgba(255,255,255,0.04)';
                    iconBox.style.color = item.color;
                    iconBox.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Header Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    className="menu-icon-box"
                    style={{
                      width: '46px', height: '46px', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.04)',
                      color: item.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    textTransform: 'uppercase', tracking: '1px',
                    color: item.color, background: `${item.color}10`,
                    padding: '3px 10px', borderRadius: '30px'
                  }}>
                    Buka →
                  </span>
                </div>

                {/* Title & Desc */}
                <div style={{ marginTop: '4px' }}>
                  <h3 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0' }}>
                    {item.label}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Logout Special Card */}
          <div
            onClick={handleLogout}
            className="menu-card-item animate-fade-in"
            style={{
              background: 'rgba(224,92,92,0.04)',
              border: '1.5px solid rgba(224,92,92,0.15)',
              borderRadius: '20px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backdropFilter: 'blur(5px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.background = 'rgba(224,92,92,0.12)';
              e.currentTarget.style.border = '1.5px solid rgba(224,92,92,0.4)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(224,92,92,0.2)';
              const iconBox = e.currentTarget.querySelector('.menu-icon-box');
              if (iconBox) {
                iconBox.style.background = '#E05C5C';
                iconBox.style.color = '#222831';
                iconBox.style.boxShadow = '0 0 15px rgba(224,92,92,0.8)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(224,92,92,0.04)';
              e.currentTarget.style.border = '1.5px solid rgba(224,92,92,0.15)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
              const iconBox = e.currentTarget.querySelector('.menu-icon-box');
              if (iconBox) {
                iconBox.style.background = 'rgba(255,255,255,0.04)';
                iconBox.style.color = '#E05C5C';
                iconBox.style.boxShadow = 'none';
              }
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                className="menu-icon-box"
                style={{
                  width: '46px', height: '46px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#E05C5C',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                <LogOut size={22} />
              </div>
              <span style={{
                fontSize: '0.75rem', fontWeight: 700,
                textTransform: 'uppercase', tracking: '1px',
                color: '#E05C5C', background: 'rgba(224,92,92,0.1)',
                padding: '3px 10px', borderRadius: '30px'
              }}>
                Keluar
              </span>
            </div>

            <div style={{ marginTop: '4px' }}>
              <h3 style={{ color: '#E05C5C', fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0' }}>
                Keluar Sesi
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                Keluar dari akun Anda dan hapus data otentikasi sesi aktif.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Tampilan Dasbor Lengkap Terotentikasi
  return (
    <HRISProvider>
      {/* Global Sync Overlay — Marching Ants Animation */}
      <SyncOverlay />

      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar Header */}
        <Header activeTab={activeTab} user={user} token={token} API_URL={API_URL} setActiveTab={setActiveTab} theme={theme} setTheme={setTheme} />

        {/* Sticky Back Button & Breadcrumbs (only if activeTab is not 'menu') */}
        {activeTab !== 'menu' && (
          <div style={{
            background: 'rgba(57,62,70,0.5)',
            borderBottom: '1px solid rgba(0,173,181,0.15)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}>
            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(30);
                setActiveTab('menu');
              }}
              style={{
                background: 'rgba(0,173,181,0.12)',
                border: '1px solid rgba(0,173,181,0.3)',
                borderRadius: '10px',
                padding: '8px 16px',
                color: '#00ADB5',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 10px rgba(0,173,181,0.1)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#00ADB5';
                e.currentTarget.style.color = '#222831';
                e.currentTarget.style.boxShadow = '0 0 16px rgba(0,173,181,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0,173,181,0.12)';
                e.currentTarget.style.color = '#00ADB5';
                e.currentTarget.style.boxShadow = '0 0 10px rgba(0,173,181,0.1)';
              }}
            >
              ← Menu Utama
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/</span>
            <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}>
              {titles[activeTab] || capitalEachWord(activeTab)}
            </span>
          </div>
        )}

        {/* Konten Halaman Aktif */}
        <main style={{ flex: 1, padding: '24px', overflowX: 'hidden' }}>
          {activeTab === 'menu' ? renderMenuAwal() : renderTabContent()}
        </main>
      </div>
    </HRISProvider>
  );
}
