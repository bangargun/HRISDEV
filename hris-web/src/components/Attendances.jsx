import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, MapPin, Users, CheckCircle, AlertCircle, Clock, XCircle, Edit2, Trash2, X, Filter, Plus, Info, Store, Loader2, ChevronDown, ChevronRight, ChevronLeft, FileText, BarChart2, TrendingDown, AlertTriangle, Camera, Eye, RefreshCw } from 'lucide-react';
import { getLiveOutletList } from '../utils/outletUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useHRIS } from '../context/HRISContext';


import { formatDate } from '../utils/security';


export default function Attendances({ token, API_URL, userPermissions, setActiveTab }) {
  // ─── HRIS Context — Reactive employee list ─────────────────────────────────
  const { activeEmployees: ctxActiveEmployees } = useHRIS();

  const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const currentYear = new Date().getFullYear();
  const TAHUN = Array.from({ length: 2030 - (currentYear - 2) + 1 }, (_, i) => currentYear - 2 + i);

  // ─── DATA STATES ───────────────────────────────────────────────────────────
  const [employees, setEmployees]             = useState([]);
  const [policies, setPolicies]               = useState([]);
  const [realtimeLogs, setRealtimeLogs]       = useState([]);
  const [historyLogs, setHistoryLogs]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [availableOutlets, setAvailableOutlets] = useState([]);

  // ─── NAVIGATION STATE ──────────────────────────────────────────────────────
  const [activeSubTab, setActiveSubTab] = useState('attendance');
  // 'attendance' | 'break_schedule' | 'break_eval' | 'peak_days'

  // ─── PAPAN INPUT KEHADIRAN (Tab Kehadiran Karyawan) ─────────────────────────
  const [showInputBoard, setShowInputBoard] = useState(false);
  const [inputBoardDate, setInputBoardDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputBoardOutlet, setInputBoardOutlet] = useState('');
  const [inputBoardRows, setInputBoardRows] = useState([]);
  const [showAttPreview, setShowAttPreview] = useState(false);
  const [attFilterOutlet, setAttFilterOutlet] = useState('');
  const [attFilterStatus, setAttFilterStatus] = useState('');
  const [attFilterMonth, setAttFilterMonth] = useState(new Date().getMonth() + 1);
  const [attFilterYear, setAttFilterYear] = useState(new Date().getFullYear());
  const [attFilterDate, setAttFilterDate] = useState(new Date().toISOString().slice(0, 7));

  // ─── REALTIME FILTERS (reactive — no confirm dialog) ───────────────────────
  const [searchRealtime, setSearchRealtime]   = useState('');
  const [outletRealtime, setOutletRealtime]   = useState('');
  const [monthRealtime, setMonthRealtime]     = useState(new Date().getMonth() + 1);
  const [yearRealtime, setYearRealtime]       = useState(new Date().getFullYear());
  const [startDateRealtime, setStartDateRealtime] = useState('');
  const [endDateRealtime, setEndDateRealtime]   = useState('');

  // ─── HISTORY FILTERS (reactive) ────────────────────────────────────────────
  const [searchHistory, setSearchHistory]     = useState('');
  const [outletHistory, setOutletHistory]     = useState('');
  const [monthHistory, setMonthHistory]       = useState(new Date().getMonth() + 1);
  const [yearHistory, setYearHistory]         = useState(new Date().getFullYear());
  const [startDateHistory, setStartDateHistory] = useState('');
  const [endDateHistory, setEndDateHistory]     = useState('');

  // ─── RECAP FILTERS ─────────────────────────────────────────────────────────
  const [searchRecap, setSearchRecap]         = useState('');
  const [outletRecap, setOutletRecap]         = useState('');
  const [monthRecap, setMonthRecap]           = useState(new Date().getMonth() + 1);
  const [yearRecap, setYearRecap]             = useState(new Date().getFullYear());
  const [expandedRecapRow, setExpandedRecapRow] = useState(null);

  // ─── BREAK EVAL FILTERS (reactive) ─────────────────────────────────────────
  const [outletEval, setOutletEval]           = useState('');
  const [monthEval, setMonthEval]             = useState(new Date().getMonth() + 1);
  const [yearEval, setYearEval]               = useState(new Date().getFullYear());
  const [breakTab, setBreakTab]               = useState('summary');
  const [empEvalFilter, setEmpEvalFilter]     = useState('');

  // ─── BREAK SCHEDULE: TABLE FILTER STATES ──────────────────────────────────
  const [scheduleDate, setScheduleDate]       = useState(new Date().toISOString().split('T')[0]);
  const [scheduleOutlet, setScheduleOutlet]   = useState('');
  const [generatedSchedules, setGeneratedSchedules] = useState([]);
  const [isSyncingSchedule, setIsSyncingSchedule] = useState(false);
  // Filter tabel jadwal
  const [bsTableDate, setBsTableDate]         = useState(new Date().toISOString().split('T')[0]);
  const [bsTableOutlet, setBsTableOutlet]     = useState('');
  const [bsTableSearch, setBsTableSearch]     = useState('');
  const [bsTableData, setBsTableData]         = useState([]);
  const [bsTableLoading, setBsTableLoading]   = useState(false);
  // Form tambah jadwal manual
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [addFormDate, setAddFormDate]         = useState(new Date().toISOString().split('T')[0]);
  const [addFormOutlet, setAddFormOutlet]     = useState('');
  const [addFormRows, setAddFormRows]         = useState([]);
  const [addFormErrors, setAddFormErrors]     = useState({});
  const [addFormGlobalError, setAddFormGlobalError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [addFormOutletLoading, setAddFormOutletLoading] = useState(false);


  // ─── COLUMN VISIBILITY ─────────────────────────────────────────────────────
  const [showColFilterRealtime, setShowColFilterRealtime] = useState(false);
  const [visibleColumnsRealtime, setVisibleColumnsRealtime] = useState({
    no: true, name: true, outlet: true, tanggal: true,
    jam_masuk: true, jam_pulang: true,
    jam_mulai_istirahat: true, jam_akhir_istirahat: true,
    status: true, durasi: true, selfie: true, keterangan: true, actions: true
  });
  const colLabelMapRealtime = {
    no:'NO', name:'NAMA KARYAWAN', outlet:'OUTLET', tanggal:'TANGGAL',
    jam_masuk:'JAM MASUK', jam_pulang:'JAM PULANG',
    jam_mulai_istirahat:'MULAI ISTIRAHAT', jam_akhir_istirahat:'AKHIR ISTIRAHAT',
    status:'STATUS', durasi:'DURASI KERJA', selfie:'SELFIE', keterangan:'KETERANGAN', actions:'AKSI'
  };

  const [showColFilterHistory, setShowColFilterHistory] = useState(false);
  const [visibleColumnsHistory, setVisibleColumnsHistory] = useState({
    date: true, nik: true, full_name: true, department: true,
    outlet: true, clock_in: true, clock_out: true,
    break_time: true, status_in: true, selfie: true, map: true, notes: true, actions: true
  });
  const colLabelMapHistory = {
    date:'TANGGAL', nik:'NIK', full_name:'NAMA LENGKAP', department:'JABATAN',
    outlet:'OUTLET', clock_in:'JAM MASUK', clock_out:'JAM KELUAR',
    break_time:'WAKTU ISTIRAHAT', status_in:'STATUS MASUK', selfie:'SELFIE', map:'PETA', notes:'CATATAN', actions:'AKSI'
  };

  // ─── MODAL STATES ──────────────────────────────────────────────────────────
  const [showRealtimeModal, setShowRealtimeModal] = useState(false);
  const [editingRealtimeId, setEditingRealtimeId] = useState(null);
  const [selectedEmpIdRealtime, setSelectedEmpIdRealtime] = useState('');
  const [realtimeOutlet, setRealtimeOutlet]   = useState('');
  const [realtimeDate, setRealtimeDate]       = useState(new Date().toISOString().split('T')[0]);
  const [realtimeStatus, setRealtimeStatus]   = useState('hadir');
  const [realtimeNotes, setRealtimeNotes]     = useState('');
  const [realtimeCustomIn, setRealtimeCustomIn]     = useState('');
  const [realtimeCustomOut, setRealtimeCustomOut]   = useState('');
  const [realtimeCustomStartBreak, setRealtimeCustomStartBreak] = useState('');
  const [realtimeCustomEndBreak, setRealtimeCustomEndBreak]     = useState('');
  const [realtimeBriefing, setRealtimeBriefing] = useState('Tidak');

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [selectedEmpIdHistory, setSelectedEmpIdHistory] = useState('');
  const [historyOutletForm, setHistoryOutletForm] = useState('');
  const [historyDate, setHistoryDate]         = useState(new Date().toISOString().split('T')[0]);
  const [historyClockIn, setHistoryClockIn]   = useState('');
  const [historyClockOut, setHistoryClockOut] = useState('');
  const [historyStatusIn, setHistoryStatusIn] = useState('ontime');
  const [historyNotes, setHistoryNotes]       = useState('');
  const [historyStartBreak, setHistoryStartBreak] = useState('');
  const [historyEndBreak, setHistoryEndBreak]   = useState('');
  const [historyBriefing, setHistoryBriefing]   = useState('Tidak');

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', confirmText: 'YAKIN', cancelText: 'BATAL', onConfirm: null
  });
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // Peak Days State
  const [peakDays, setPeakDays] = useState([]);
  const [showPeakDayModal, setShowPeakDayModal] = useState(false);
  const [newPeakDay, setNewPeakDay] = useState({ tanggal: '', bulan: '', tahun: '', nama_peak_day: '' });
  const [peakDayPage, setPeakDayPage] = useState(1);
  const [peakDayTransition, setPeakDayTransition] = useState(false);
  const [selfiePreviewData, setSelfiePreviewData] = useState(null);

  // ─── TOAST ─────────────────────────────────────────────────────────────────
  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 5000);
  };

  const handleViewSelfie = (log) => {
    const photos = [];
    if (log.photo_in_url || log.photo_in) photos.push({ label: 'Masuk', url: log.photo_in_url || log.photo_in });
    if (log.photo_break_start_url || log.photo_break_start) photos.push({ label: 'Mulai Istirahat', url: log.photo_break_start_url || log.photo_break_start });
    if (log.photo_break_end_url || log.photo_break_end) photos.push({ label: 'Selesai Istirahat', url: log.photo_break_end_url || log.photo_break_end });
    if (log.photo_out_url || log.photo_out) photos.push({ label: 'Pulang', url: log.photo_out_url || log.photo_out });

    if (photos.length === 0) {
      showToast('info', 'Tidak ada foto selfie untuk log kehadiran ini.');
      return;
    }
    setSelfiePreviewData({
      name: log.full_name || log.nama_karyawan || 'Karyawan',
      date: log.date,
      photos
    });
  };

  // ─── DATA LOADING ──────────────────────────────────────────────────────────
  const fetchDynamicOutlets = () => setAvailableOutlets(getLiveOutletList());

  const fetchPolicies = async () => {
    try {
      const local = JSON.parse(localStorage.getItem('corporate_policies') || '[]');
      if (local.length > 0) { setPolicies(local); return; }
      const res = await fetch(`${API_URL}/policies`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') setPolicies(data.data);
    } catch (e) {
      setPolicies(JSON.parse(localStorage.getItem('corporate_policies') || '[]'));
    }
  };

  const fetchHistoryFromBackend = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance/history`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const backend = data.status === 'success' ? data.data : [];
      const local = JSON.parse(localStorage.getItem('hris_attendances_history') || '[]');
      const merged = [...local];
      backend.forEach(b => {
        if (!merged.some(m => m.id === b.id || (m.date === b.date && m.nik === b.nik))) merged.push(b);
      });
      setHistoryLogs(merged);
    } catch {
      setHistoryLogs(JSON.parse(localStorage.getItem('hris_attendances_history') || '[]'));
    }
  };

  const fetchPeakDays = async () => {
    if (token && API_URL) {
      try {
        const res = await fetch(`${API_URL}/policies/peak-days`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success' && Array.isArray(data.data)) {
            setPeakDays(data.data);
            localStorage.setItem('peak_day_rules', JSON.stringify(data.data));
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching peak days:', err);
      }
    }
    try {
      const raw = localStorage.getItem('peak_day_rules');
      if (raw) setPeakDays(JSON.parse(raw));
    } catch {}
  };

  const handleAddPeakDay = async (e) => {
    e.preventDefault();
    if (!newPeakDay.tanggal || !newPeakDay.bulan || !newPeakDay.tahun || !newPeakDay.nama_peak_day) {
      showToast('error', 'Semua field Peak Day wajib diisi!');
      return;
    }

    const payload = {
      tanggal: parseInt(newPeakDay.tanggal),
      bulan: parseInt(newPeakDay.bulan),
      tahun: parseInt(newPeakDay.tahun),
      nama_peak_day: newPeakDay.nama_peak_day.trim()
    };

    if (token && API_URL) {
      try {
        const res = await fetch(`${API_URL}/policies/peak-days/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ peakDays: [...peakDays, payload] })
        });
        if (res.ok) {
          const d = await res.json();
          if (d.status === 'success') {
            showToast('success', '🗓️ Peak Day berhasil ditambahkan!');
            const fetchRes = await fetch(`${API_URL}/policies/peak-days`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (fetchRes.ok) {
              const fetchD = await fetchRes.json();
              if (fetchD.status === 'success') {
                setPeakDays(fetchD.data);
                localStorage.setItem('peak_day_rules', JSON.stringify(fetchD.data));
              }
            }
          } else {
            showToast('error', d.message || 'Gagal menambahkan Peak Day');
          }
        } else {
          showToast('error', 'Gagal menghubungi server untuk menambah Peak Day');
        }
      } catch (err) {
        showToast('error', 'Error menambah Peak Day');
      }
    } else {
      const updated = [...peakDays, { ...payload, id: Date.now() }];
      setPeakDays(updated);
      localStorage.setItem('peak_day_rules', JSON.stringify(updated));
      showToast('success', '🗓️ Peak Day berhasil ditambahkan secara lokal!');
    }

    setShowPeakDayModal(false);
    setNewPeakDay({ tanggal: '', bulan: '', tahun: '', nama_peak_day: '' });
  };

  const handleDeletePeakDay = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus Peak Day ini?')) return;

    if (token && API_URL) {
      try {
        const remaining = peakDays.filter(p => p.id !== id);
        const res = await fetch(`${API_URL}/policies/peak-days/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ peakDays: remaining })
        });
        if (res.ok) {
          showToast('success', '🗓️ Peak Day berhasil dihapus!');
          setPeakDays(remaining);
          localStorage.setItem('peak_day_rules', JSON.stringify(remaining));
        } else {
          showToast('error', 'Gagal menghapus Peak Day');
        }
      } catch (err) {
        showToast('error', 'Error menghapus Peak Day');
      }
    } else {
      const remaining = peakDays.filter(p => p.id !== id);
      setPeakDays(remaining);
      localStorage.setItem('peak_day_rules', JSON.stringify(remaining));
      showToast('success', '🗓️ Peak Day berhasil dihapus secara lokal!');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setEmployees(JSON.parse(localStorage.getItem('hris_employees') || '[]'));
    await fetchPolicies();
    fetchDynamicOutlets();
    setRealtimeLogs(JSON.parse(localStorage.getItem('hris_attendances_realtime') || '[]'));
    await fetchHistoryFromBackend();
    await fetchPeakDays();
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [token, API_URL]);

  // Reactive listener to reload attendance logs dynamically when approved in Pusat Pengajuan
  useEffect(() => {
    const handleSyncUpdate = () => {
      console.log('Syncing updated attendance logs from localStorage (event triggered)...');
      setRealtimeLogs(JSON.parse(localStorage.getItem('hris_attendances_realtime') || '[]'));
      setHistoryLogs(JSON.parse(localStorage.getItem('hris_attendances_history') || '[]'));
    };
    window.addEventListener('storage', handleSyncUpdate);
    window.addEventListener('hris_attendance_update', handleSyncUpdate);
    return () => {
      window.removeEventListener('storage', handleSyncUpdate);
      window.removeEventListener('hris_attendance_update', handleSyncUpdate);
    };
  }, []);

  // Reactive: update employees dari HRISContext (saat data karyawan berubah)
  useEffect(() => {
    if (Array.isArray(ctxActiveEmployees) && ctxActiveEmployees.length > 0) {
      setEmployees(ctxActiveEmployees);
    }
  }, [ctxActiveEmployees]);


  // ─── HELPERS ───────────────────────────────────────────────────────────────
  const parseToMinutes = (t) => {
    if (!t) return 0;
    const p = t.split(':');
    return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
  };

  const calculateWorkDuration = (jamMasuk, jamPulang, mulaiBreak, akhirBreak) => {
    if (!jamMasuk || !jamPulang) return '-';
    let masuk = parseToMinutes(jamMasuk), pulang = parseToMinutes(jamPulang);
    if (pulang < masuk) pulang += 1440;
    let total = pulang - masuk;
    if (mulaiBreak && akhirBreak) {
      let bStart = parseToMinutes(mulaiBreak), bEnd = parseToMinutes(akhirBreak);
      if (bEnd < bStart) bEnd += 1440;
      total -= (bEnd - bStart);
    }
    if (total <= 0) return '0j 0m';
    return `${Math.floor(total / 60)}j ${total % 60}m`;
  };

  const getPolicyTimeForOutlet = (name, outlet, def) => {
    const p = policies.find(x => x.nama_kebijakan === name);
    if (!p) return def;
    try { const v = JSON.parse(p.nilai); return v[outlet] || def; } catch { return p.nilai || def; }
  };

  const getRestDurationForOutlet = (outletName) => {
    const raw = localStorage.getItem('corporate_policies');
    const pList = raw ? JSON.parse(raw) : policies;
    const matching = (pList || []).filter(p => p.status === 'ACTIVE' && (p.nama_aturan || '').toLowerCase().includes('durasi istirahat'))
      .find(p => p.all_outlets || (p.outlets || []).some(o => o.toUpperCase().trim() === (outletName || '').toUpperCase().trim()));
    if (matching?.deskripsi) {
      const m = matching.deskripsi.match(/(\d+)\s*jam/i);
      if (m) return parseInt(m[1], 10);
    }
    if ((outletName || '').toUpperCase().includes('ABS') || (outletName || '').toUpperCase().includes('SURABAYA')) return 2;
    return 3;
  };

  const getPolicyClockOutTime = (outletName) => {
    const raw = localStorage.getItem('corporate_policies');
    const pList = raw ? JSON.parse(raw) : policies;
    const matching = (pList || []).filter(p => p.status === 'ACTIVE' && (p.nama_aturan || '').toLowerCase().includes('jam pulang'))
      .find(p => p.all_outlets || (p.outlets || []).some(o => o.toUpperCase().trim() === (outletName || '').toUpperCase().trim()));
    if (matching?.deskripsi) {
      const m = matching.deskripsi.match(/pukul\s*(\d{2})[.:](\d{2})/i);
      if (m) return `${m[1]}:${m[2]}`;
    }
    if ((outletName || '').toUpperCase().includes('ABS') || (outletName || '').toUpperCase().includes('SURABAYA')) return '22:30';
    return '00:30';
  };

  const isCheckoutBeforePolicy = (clockOut, policyTime) => {
    if (!clockOut || !policyTime) return false;
    const toMinsFromNoon = t => { const p = t.split(':'); const h = parseInt(p[0],10), m = parseInt(p[1],10)||0; return h >= 12 ? (h-12)*60+m : (h+12)*60+m; };
    return toMinsFromNoon(clockOut) < toMinsFromNoon(policyTime);
  };

  const checkIsHalfDay = (log) => {
    if (!log.jam_keluar && !log.clock_out) return false;
    const clockOutMins = parseToMinutes(log.jam_keluar || log.clock_out || '');
    if (clockOutMins === 0) return false;

    let outlet = (log.outlet || '').trim();
    if (!outlet) {
      const emp = employees.find(e => (log.employee_id && String(e.id) === String(log.employee_id)) || (log.nik && e.nik === log.nik));
      if (emp) outlet = emp.outlet || '';
    }
    const policyOut = getPolicyClockOutTime(outlet);
    const policyOutMins = parseToMinutes(policyOut);

    // Setengah Hari: pulang >= 18:00 (1080 mins) dan < policy clock out
    return (clockOutMins >= 1080 && clockOutMins < policyOutMins);
  };

  const resolveOutlet = (log) => {
    let o = (log.outlet || '').trim();
    if (!o) {
      const emp = employees.find(e => (log.employee_id && String(e.id) === String(log.employee_id)) || (log.nik && e.nik === log.nik));
      if (emp) o = emp.outlet || '';
    }
    return o;
  };

  const getOfficialBreakDuration = (outletName) => {
    const active = (policies || []).filter(p => p.status === 'ACTIVE');
    const bp = active.filter(p => (p.nama_aturan || '').toLowerCase().includes('istirahat'));
    const match = bp.find(p => (p.outlets || []).some(o => o.toUpperCase().trim() === (outletName || '').toUpperCase().trim()) || p.all_outlets);
    if (match?.deskripsi) {
      const m = match.deskripsi.match(/(\d+)\s*(?:jam|hour)/i);
      if (m) return parseInt(m[1], 10) * 60;
    }
    return ((outletName || '').toUpperCase().includes('ABS') || (outletName || '').toUpperCase().includes('SURABAYA')) ? 120 : 180;
  };

  const calculateBreakOverage = (log) => {
    if (!log.jam_mulai_istirahat || !log.jam_akhir_istirahat) return 0;
    let s = parseToMinutes(log.jam_mulai_istirahat), e = parseToMinutes(log.jam_akhir_istirahat);
    if (e < s) e += 1440;
    const outlet = resolveOutlet(log);
    return Math.max(0, (e - s) - getOfficialBreakDuration(outlet));
  };

  // ─── STATUS KEHADIRAN OTOMATIS ─────────────────────────────────────────────
  const getAttendanceStatus = (log) => {
    if (!log) return '-';
    // Karyawan absen dari leaves approved
    if (log._fromLeave || log.status_in === 'leave_approved') {
      return log.leave_type || log.jenis_absen || 'Tidak Hadir';
    }
    // Absen manual
    if (log.realtimeStatus === 'absen' || log.status_in === 'absent' || log.is_absent) {
      return log.leave_type || 'Absen';
    }
    const clockInMins = parseToMinutes(log.jam_masuk || log.clock_in || '');
    const clockOutMins = parseToMinutes(log.jam_keluar || log.clock_out || '');

    if (clockInMins > 0 && clockOutMins > 0) {
      // 10:00 = 600 mins, 15:00 = 900 mins, 18:00 = 1080 mins, 22:00 = 1320 mins
      if (clockOutMins >= 600 && clockOutMins < 900) {
        return 'Tidak Hadir';
      }
      if (clockOutMins >= 900 && clockOutMins < 1080) {
        return 'Tidak Hadir';
      }
      if (clockOutMins >= 1080 && clockOutMins < 1320) {
        return 'Setengah Hari';
      }
      if (clockOutMins >= 1320) {
        const outlet = resolveOutlet(log);
        const policyOut = getPolicyClockOutTime(outlet);
        const policyOutMins = parseToMinutes(policyOut);
        if (clockOutMins < policyOutMins) {
          return 'Setengah Hari';
        }
      }
    }
    // Terlambat: masuk > 10:00
    const masukLimit = 10 * 60; // 10:00 = 600 menit
    if (clockInMins > masukLimit) return 'Hadir & Terlambat';
    return 'Hadir & Tepat Waktu';
  };

  const getMenitTerlambat = (log) => {
    const clockIn = log.jam_masuk || log.clock_in || '';
    if (!clockIn) return 0;
    const masukMins = parseToMinutes(clockIn);
    const limitMins = 10 * 60;
    return Math.max(0, masukMins - limitMins);
  };

  const getBreakDurationStr = (log) => {
    const s = log.jam_mulai_istirahat || log.jam_mulai_istirahat || '';
    const e = log.jam_akhir_istirahat || log.jam_akhir_istirahat || '';
    if (!s || !e) return '-';
    let sm = parseToMinutes(s), em = parseToMinutes(e);
    if (em < sm) em += 1440;
    const diff = em - sm;
    if (diff <= 0) return '-';
    return `${Math.floor(diff/60)}j ${diff%60}m`;
  };

  // ─── PAPAN INPUT: generate karyawan dari outlet ─────────────────────────────
  const generateInputBoardRows = (outlet) => {
    if (!outlet) { setInputBoardRows([]); return; }
    // Ambil leaves yang sudah approved
    const leaves = JSON.parse(localStorage.getItem('hris_leaves') || '[]');
    const approvedLeaveNames = new Set(
      leaves
        .filter(l => l.status === 'approved' || l.status === 'APPROVED')
        .filter(l => {
          const d = new Date(inputBoardDate);
          const from = l.start_date ? new Date(l.start_date) : null;
          const to = l.end_date ? new Date(l.end_date) : from;
          return from && d >= from && d <= (to || from);
        })
        .map(l => (l.employee_name || l.nama_karyawan || '').toLowerCase().trim())
    );

    const outletEmps = employees.filter(e =>
      (e.outlet || '').toUpperCase().trim() === outlet.toUpperCase().trim() &&
      (e.employee_status || e.status || '').toLowerCase() === 'active'
    );

    const rows = outletEmps
      .filter(e => !approvedLeaveNames.has((e.full_name || e.nama || '').toLowerCase().trim()))
      .map(e => ({
        emp_id: e.id,
        emp_name: e.full_name || e.nama || '',
        jabatan: e.jabatan || e.position || '',
        status: 'hadir',
        jam_masuk: '10:00',
        jam_keluar: '',
        ikut_briefing: 'Tidak',
      }));
    setInputBoardRows(rows);
  };

  const updateInputRow = (idx, field, value) => {
    setInputBoardRows(prev => prev.map((r, i) =>
      i === idx ? { ...r, [field]: value } : r
    ));
  };

  const handleSaveInputBoard = () => {
    if (!inputBoardOutlet) { showToast('error', 'Pilih outlet terlebih dahulu.'); return; }
    if (inputBoardRows.length === 0) { showToast('error', 'Tidak ada karyawan untuk disimpan.'); return; }
    setShowAttPreview(true);
  };

  const handleConfirmInputBoard = () => {
    const existing = JSON.parse(localStorage.getItem('hris_attendances_realtime') || '[]');
    const newLogs = inputBoardRows.map(row => ({
      id: `att-${Date.now()}-${row.emp_id}`,
      employee_id: row.emp_id,
      full_name: row.emp_name,
      nama_karyawan: row.emp_name,
      jabatan: row.jabatan,
      outlet: inputBoardOutlet,
      tanggal: inputBoardDate,
      jam_masuk: row.status === 'absen' ? '' : row.jam_masuk,
      jam_keluar: row.status === 'absen' ? '' : row.jam_keluar,
      realtimeStatus: row.status,
      status_in: row.status === 'absen' ? 'absent' : 'ontime',
      ikut_briefing: row.status === 'absen' ? 'Tidak' : row.ikut_briefing || 'Tidak',
      sent_status: 'sent',
      created_at: new Date().toISOString(),
    }));
    const updated = [...existing, ...newLogs];
    localStorage.setItem('hris_attendances_realtime', JSON.stringify(updated));
    setRealtimeLogs(updated);
    setShowAttPreview(false);
    setShowInputBoard(false);
    setInputBoardRows([]);
    setInputBoardOutlet('');
    showToast('success', `✅ ${newLogs.length} data kehadiran berhasil disimpan dan dikirim ke mobile APK!`);
  };

  // ─── AUTO-POPULATE TIMES IN REALTIME MODAL ─────────────────────────────────
  useEffect(() => {
    if (selectedEmpIdRealtime && !editingRealtimeId) {
      const emp = employees.find(e => String(e.id) === String(selectedEmpIdRealtime));
      if (emp?.outlet) {
        setRealtimeCustomIn(getPolicyTimeForOutlet('JAM MASUK', emp.outlet, '10:00'));
        setRealtimeCustomOut(getPolicyTimeForOutlet('JAM PULANG', emp.outlet, '22:00'));
        setRealtimeCustomStartBreak(getPolicyTimeForOutlet('JAM MULAI ISTIRAHAT', emp.outlet, '15:00'));
        setRealtimeCustomEndBreak(getPolicyTimeForOutlet('JAM AKHIR ISTIRAHAT', emp.outlet, '17:00'));
      }
    }
  }, [selectedEmpIdRealtime, employees, policies, editingRealtimeId]);


  useEffect(() => {
    if (activeSubTab === 'break_schedule') fetchBsTableData(bsTableDate, bsTableOutlet);
  }, [activeSubTab, bsTableDate, bsTableOutlet]);


  useEffect(() => {
    setEmpEvalFilter('');
  }, [outletEval]);

  // ─── FILTERED DATA ─────────────────────────────────────────────────────────
  const filteredRealtime = useMemo(() => {
    // 1. Filter raw check-in logs based on current filters
    const activeLogs = realtimeLogs.filter(l => {
      if (attFilterOutlet && (l.outlet||'').toUpperCase().trim() !== attFilterOutlet.toUpperCase().trim()) return false;
      if (attFilterDate && !(l.tanggal||l.date||'').startsWith(attFilterDate)) return false;
      if (attFilterStatus) {
        const s = getAttendanceStatus(l);
        if (!s.toLowerCase().includes(attFilterStatus.toLowerCase())) return false;
      }
      return true;
    });

    // 2. Load approved leaves
    let leaves = [];
    try {
      leaves = JSON.parse(localStorage.getItem('hris_leaves') || localStorage.getItem('leaves') || '[]');
    } catch (e) {}

    const approvedLeaves = leaves.filter(l => 
      (l.status === 'approved' || l.status === 'APPROVED') &&
      l.leave_type !== 'kasbon'
    );

    // Helper to generate dates in range
    const getDatesInRange = (startStr, endStr) => {
      const dates = [];
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return dates;
      let current = new Date(start);
      while (current <= end) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    const injectedLogs = [];

    approvedLeaves.forEach(l => {
      const dates = getDatesInRange(l.start_date, l.end_date || l.start_date);
      dates.forEach(d => {
        // Apply filters
        if (attFilterOutlet && (l.outlet||'').toUpperCase().trim() !== attFilterOutlet.toUpperCase().trim()) return;
        if (attFilterDate && !d.startsWith(attFilterDate)) return;

        const empName = l.employee_name || l.nama_karyawan || '';
        
        let statusLabel = 'Absen';
        if (l.leave_type === 'cuti' || l.leave_type === 'libur_reguler') statusLabel = 'Libur Reguler (Disetujui)';
        else if (l.leave_type === 'cuti_tahunan') statusLabel = 'Cuti Tahunan (Disetujui)';
        else if (l.leave_type === 'izin') statusLabel = 'Izin (Disetujui)';
        else if (l.leave_type === 'sakit') statusLabel = 'Sakit (Disetujui)';
        else if (l.leave_type === 'setengah_hari') statusLabel = 'Setengah Hari (Disetujui)';

        if (attFilterStatus && !statusLabel.toLowerCase().includes(attFilterStatus.toLowerCase())) return;

        // Check if employee already has a check-in for date d
        const hasCheckIn = realtimeLogs.some(r => 
          (String(r.employee_id) === String(l.employee_id) || (r.nama_karyawan || '').toLowerCase().trim() === empName.toLowerCase().trim()) &&
          (r.date === d || r.tanggal === d)
        );

        if (!hasCheckIn) {
          injectedLogs.push({
            id: `injected-leave-${l.id}-${d}`,
            employee_id: l.employee_id,
            nama_karyawan: empName,
            full_name: empName,
            outlet: l.outlet || '-',
            date: d,
            tanggal: d,
            jam_masuk: '',
            jam_keluar: '',
            jam_mulai_istirahat: '',
            jam_akhir_istirahat: '',
            _fromLeave: true,
            leave_type: statusLabel,
            status_in: 'leave_approved',
            notes: `${statusLabel}: ${l.reason || '-'}`,
            keterangan: `${statusLabel}: ${l.reason || '-'}`,
            ikut_briefing: 'Tidak',
            sent_status: 'sent'
          });
        }
      });
    });

    const combined = [...activeLogs, ...injectedLogs];
    // Sort by Date Descending
    combined.sort((a, b) => (b.tanggal||b.date||'').localeCompare(a.tanggal||a.date||''));
    return combined;
  }, [realtimeLogs, attFilterOutlet, attFilterDate, attFilterStatus]);

  const filteredHistory = useMemo(() => historyLogs.filter(log => {
    const name = (log.full_name || '').toLowerCase();
    const nik = log.nik || '';
    const dept = (log.department || '').toLowerCase();
    const logOutlet = resolveOutlet(log).toUpperCase();
    const matchSearch = name.includes(searchHistory.toLowerCase()) || nik.includes(searchHistory) || dept.includes(searchHistory.toLowerCase());
    const matchOutlet = outletHistory ? logOutlet === outletHistory.toUpperCase() : true;
    let matchMonth = true, matchYear = true;
    if (log.date) {
      const p = log.date.split('-');
      if (monthHistory) matchMonth = parseInt(p[1],10) === monthHistory;
      if (yearHistory) matchYear = parseInt(p[0],10) === yearHistory;
    }
    const matchStart = startDateHistory ? log.date >= startDateHistory : true;
    const matchEnd = endDateHistory ? log.date <= endDateHistory : true;
    return matchSearch && matchOutlet && matchMonth && matchYear && matchStart && matchEnd;
  }), [historyLogs, employees, searchHistory, outletHistory, monthHistory, yearHistory, startDateHistory, endDateHistory]);

  // ─── EVAL FILTERED DATA (uses all logs with break data) ────────────────────
  const filteredEval = useMemo(() => {
    const combined = [
      ...realtimeLogs.map(l => ({ ...l, _source: 'realtime', full_name: l.full_name || l.nama_karyawan, jam_mulai_istirahat: l.jam_mulai_istirahat, jam_akhir_istirahat: l.jam_akhir_istirahat })),
      ...historyLogs
    ];
    return combined.filter(log => {
      const logOutlet = resolveOutlet(log).toUpperCase();
      const matchOutlet = outletEval ? logOutlet === outletEval.toUpperCase() : true;
      let matchMonth = true, matchYear = true;
      if (log.date) {
        const p = log.date.split('-');
        if (monthEval) matchMonth = parseInt(p[1],10) === monthEval;
        if (yearEval) matchYear = parseInt(p[0],10) === yearEval;
      }
      const logEmpName = log.full_name || log.nama_karyawan || '';
      const matchEmployee = empEvalFilter
        ? (logEmpName.toLowerCase() === empEvalFilter.toLowerCase() || String(log.employee_id) === String(empEvalFilter))
        : true;
      return matchOutlet && matchMonth && matchYear && log.jam_mulai_istirahat && log.jam_akhir_istirahat && matchEmployee;
    });
  }, [realtimeLogs, historyLogs, employees, outletEval, monthEval, yearEval, empEvalFilter]);

  // ─── RECAP BUILDER (Opsi B: gabung realtime + history) ─────────────────────
  const recapData = useMemo(() => {
    const map = {};

    const processLog = (log, source) => {
      // Identify employee
      const emp = employees.find(e =>
        (log.employee_id && String(e.id) === String(log.employee_id)) ||
        (log.nik && e.nik === log.nik) ||
        (log.full_name && e.full_name && e.full_name.toLowerCase() === (log.full_name || log.nama_karyawan || '').toLowerCase())
      );
      const empKey = log.employee_id || log.nik || log.full_name || log.nama_karyawan;
      if (!empKey) return;

      const name = emp?.full_name || log.full_name || log.nama_karyawan || '-';
      const nik = emp?.nik || log.nik || '-';
      const position = emp?.position || log.department || '-';
      const outlet = resolveOutlet(log) || emp?.outlet || '-';
      const outletUp = outlet.toUpperCase();

      // Apply recap filters
      const matchOutlet = outletRecap ? outletUp === outletRecap.toUpperCase() : true;
      let matchMonth = true, matchYear = true;
      if (log.date) {
        const p = log.date.split('-');
        if (monthRecap) matchMonth = parseInt(p[1],10) === monthRecap;
        if (yearRecap) matchYear = parseInt(p[0],10) === yearRecap;
      }
      if (!matchOutlet || !matchMonth || !matchYear) return;

      if (!map[empKey]) {
        map[empKey] = { name, nik, position, outlet, hadir: 0, terlambat: 0, setengaHari: 0, absen: 0, totalMenit: 0, logs: [] };
      }

      // Classify status
      let status = 'hadir';
      if (source === 'realtime') {
        const s = (log.status || '').toLowerCase();
        if (s === 'absen' || s === 'absent' || s === 'tidak hadir') status = 'absen';
        else if (s === 'terlambat' || s === 'late') status = 'terlambat';
        else if (s === 'setengah hari' || s === 'half_day' || (log.keterangan && /setengah hari|half day/i.test(log.keterangan))) status = 'setengaHari';
        else status = 'hadir';
      } else {
        if (!log.clock_in) status = 'absen';
        else if (checkIsHalfDay(log)) status = 'setengaHari';
        else if (log.status_in === 'late' || (log.notes && /terlambat|late/i.test(log.notes))) status = 'terlambat';
        else status = 'hadir';
      }

      map[empKey][status] += 1;

      // Accumulate work time
      const clockIn = log.jam_masuk || log.clock_in;
      const clockOut = log.jam_pulang || log.clock_out;
      const bStart = log.jam_mulai_istirahat;
      const bEnd = log.jam_akhir_istirahat;
      if (clockIn && clockOut) {
        let masuk = parseToMinutes(clockIn.substring(0,5));
        let pulang = parseToMinutes(clockOut.substring(0,5));
        if (pulang < masuk) pulang += 1440;
        let work = pulang - masuk;
        if (bStart && bEnd) {
          let bs = parseToMinutes(bStart), be = parseToMinutes(bEnd);
          if (be < bs) be += 1440;
          work -= (be - bs);
        }
        if (work > 0) map[empKey].totalMenit += work;
      }

      map[empKey].logs.push({
        date: log.date, status,
        clockIn: log.jam_masuk || log.clock_in || '-',
        clockOut: log.jam_pulang || log.clock_out || '-',
        keterangan: log.keterangan || log.notes || '-',
        source
      });
    };

    realtimeLogs.forEach(l => processLog(l, 'realtime'));
    historyLogs.forEach(l => processLog(l, 'history'));

    return Object.values(map)
      .filter(r => (r.name || '').toLowerCase().includes(searchRecap.toLowerCase()) || (r.nik || '').includes(searchRecap))
      .map(r => {
        const totalHadir = r.hadir + r.terlambat + r.setengaHari;
        const totalDays = r.hadir + r.terlambat + r.setengaHari + r.absen;
        const pct = totalDays > 0 ? Math.round((totalHadir / totalDays) * 100) : 0;
        const jam = Math.floor(r.totalMenit / 60);
        const menit = r.totalMenit % 60;
        return { ...r, totalHadir, totalDays, pct, jamKerja: `${jam}j ${menit}m`, logs: r.logs.sort((a,b) => a.date > b.date ? -1 : 1) };
      })
      .sort((a,b) => b.totalDays - a.totalDays);
  }, [realtimeLogs, historyLogs, employees, outletRecap, monthRecap, yearRecap, searchRecap]);

  // ─── SUMMARY STATS (Tab 1 - from filteredRealtime) ────────────────────────
  const rtTotal  = filteredRealtime.length;
  const rtHadir  = filteredRealtime.filter(l => !['absen','absent','tidak hadir'].includes((l.status||'').toLowerCase())).length;
  const rtAbsen  = filteredRealtime.filter(l => ['absen','absent','tidak hadir'].includes((l.status||'').toLowerCase())).length;
  const rtLate   = filteredRealtime.filter(l => ['terlambat','late'].includes((l.status||'').toLowerCase())).length;
  const rtHalfDay= filteredRealtime.filter(l => ['setengah hari','half_day'].includes((l.status||'').toLowerCase()) || (l.keterangan && /half day|setengah hari/i.test(l.keterangan))).length;

  // ─── BREAK EVAL SUMMARY ───────────────────────────────────────────────────
  const breakSummary = useMemo(() => {
    const map = {};
    filteredEval.forEach(log => {
      const empKey = log.employee_id || log.nik || log.full_name || log.nama_karyawan;
      if (!empKey) return;
      const name = log.full_name || log.nama_karyawan || '-';
      const nik = log.nik || '-';
      const outlet = resolveOutlet(log);
      const overage = calculateBreakOverage(log);
      if (!map[empKey]) map[empKey] = { name, nik, outlet, totalDays: 0, totalPoints: 0 };
      map[empKey].totalDays++;
      map[empKey].totalPoints += overage;
    });
    return Object.values(map).map(item => {
      const excessPoints = Math.max(0, item.totalPoints - 15);
      return { ...item, excessPoints, denda: excessPoints * 1000 };
    }).sort((a,b) => b.denda - a.denda);
  }, [filteredEval, employees]);

  const filteredEmployeesForEval = useMemo(() => {
    if (!outletEval) return employees;
    return employees.filter(emp => emp.outlet && emp.outlet.trim().toUpperCase() === outletEval.trim().toUpperCase());
  }, [employees, outletEval]);

  const totalDenda = breakSummary.reduce((s, i) => s + i.denda, 0);
  const kenaDedan = breakSummary.filter(i => i.denda > 0).length;

  // ─── STATUS BADGE ─────────────────────────────────────────────────────────
  const StatusBadge = ({ status }) => {
    const s = (status || '').toLowerCase();
    let color, bg, label;
    if (['hadir','ontime','present'].includes(s)) { color='#22c55e'; bg='rgba(34,197,94,0.12)'; label='Hadir'; }
    else if (['terlambat','late'].includes(s))     { color='#f59e0b'; bg='rgba(245,158,11,0.12)'; label='Terlambat'; }
    else if (['setengah hari','half_day'].includes(s)) { color='#3b82f6'; bg='rgba(59,130,246,0.12)'; label='½ Hari'; }
    else if (['absen','absent','tidak hadir'].includes(s)) { color='#ef4444'; bg='rgba(239,68,68,0.12)'; label='Absen'; }
    else { color='var(--text-muted)'; bg='rgba(255,255,255,0.05)'; label=toTitleCase(status); }
    return <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 10px', borderRadius:'20px', fontSize:'0.72rem', fontWeight:700, color, background:bg, border:`1px solid ${color}30` }}>{label}</span>;
  };

  // ─── FORM HANDLERS ─────────────────────────────────────────────────────────
  const handleRealtimeSubmit = (e) => {
    e.preventDefault();
    if (!realtimeOutlet?.trim()) { showToast('error', 'Mohon pilih Nama Outlet terlebih dahulu.'); return; }
    setConfirmModal({ isOpen:true, title:'Konfirmasi Simpan', message:'Simpan data kehadiran real-time ini?', confirmText:'Ya, Simpan', cancelText:'Batal', onConfirm: executeRealtimeSave });
  };

  const executeRealtimeSave = () => {
    const emp = employees.find(e => String(e.id) === String(selectedEmpIdRealtime));
    if (!emp) return;
    const outletFinal = realtimeOutlet?.trim() || emp.outlet || '';
    const durasi = calculateWorkDuration(realtimeCustomIn, realtimeCustomOut, realtimeCustomStartBreak, realtimeCustomEndBreak);
    let updated;
    if (editingRealtimeId) {
      updated = realtimeLogs.map(l => l.id === editingRealtimeId ? { ...l, employee_id:selectedEmpIdRealtime, date:realtimeDate, nama_karyawan:emp.full_name, outlet:outletFinal, jam_masuk:realtimeCustomIn, jam_pulang:realtimeCustomOut, jam_mulai_istirahat:realtimeCustomStartBreak, jam_akhir_istirahat:realtimeCustomEndBreak, status:realtimeStatus, durasi, keterangan:realtimeNotes, ikut_briefing:realtimeBriefing } : l);
    } else {
      updated = [{ id:Date.now(), employee_id:selectedEmpIdRealtime, date:realtimeDate, nama_karyawan:emp.full_name, outlet:outletFinal, jam_masuk:realtimeCustomIn, jam_pulang:realtimeCustomOut, jam_mulai_istirahat:realtimeCustomStartBreak, jam_akhir_istirahat:realtimeCustomEndBreak, status:realtimeStatus, durasi, keterangan:realtimeNotes, ikut_briefing:realtimeBriefing }, ...realtimeLogs];
    }
    setRealtimeLogs(updated);
    localStorage.setItem('hris_attendances_realtime', JSON.stringify(updated));
    showToast('success', 'Data kehadiran berhasil disimpan!');
    setShowRealtimeModal(false);
    resetRealtimeForm();
  };

  const handleEditRealtime = (log) => {
    setEditingRealtimeId(log.id); setSelectedEmpIdRealtime(log.employee_id);
    setRealtimeOutlet(log.outlet||''); setRealtimeDate(log.date);
    setRealtimeCustomIn(log.jam_masuk); setRealtimeCustomOut(log.jam_pulang);
    setRealtimeCustomStartBreak(log.jam_mulai_istirahat); setRealtimeCustomEndBreak(log.jam_akhir_istirahat);
    setRealtimeStatus(log.status); setRealtimeNotes(log.keterangan||'');
    setRealtimeBriefing(log.ikut_briefing || 'Tidak');
    setShowRealtimeModal(true);
  };

  const handleDeleteRealtime = (id) => {
    setConfirmModal({ isOpen:true, title:'Konfirmasi Hapus', message:'Hapus data kehadiran ini secara permanen?', confirmText:'Ya, Hapus', cancelText:'Batal', onConfirm: () => {
      const updated = realtimeLogs.filter(l => l.id !== id);
      setRealtimeLogs(updated);
      localStorage.setItem('hris_attendances_realtime', JSON.stringify(updated));
      showToast('success', 'Data berhasil dihapus.');
    }});
  };

  const resetRealtimeForm = () => {
    setEditingRealtimeId(null); setSelectedEmpIdRealtime(''); setRealtimeOutlet('');
    setRealtimeDate(new Date().toISOString().split('T')[0]);
    setRealtimeCustomIn(''); setRealtimeCustomOut(''); setRealtimeCustomStartBreak(''); setRealtimeCustomEndBreak('');
    setRealtimeStatus('hadir'); setRealtimeNotes(''); setRealtimeBriefing('Tidak');
  };

  const handleHistorySubmit = (e) => {
    e.preventDefault();
    setConfirmModal({ isOpen:true, title:'Konfirmasi Simpan', message:'Simpan riwayat kehadiran manual ini?', confirmText:'Ya, Simpan', cancelText:'Batal', onConfirm: executeHistorySave });
  };

  const executeHistorySave = () => {
    const emp = employees.find(e => String(e.id) === String(selectedEmpIdHistory));
    if (!emp) return;
    const outletFinal = historyOutletForm?.trim() || emp.outlet || '';
    let updated;
    const record = { employee_id:selectedEmpIdHistory, date:historyDate, nik:emp.nik, full_name:emp.full_name, department:emp.position, outlet:outletFinal, clock_in:historyClockIn, clock_out:historyClockOut, jam_mulai_istirahat:historyStartBreak, jam_akhir_istirahat:historyEndBreak, status_in:historyStatusIn, notes:historyNotes, ikut_briefing:historyBriefing };
    if (editingHistoryId) {
      updated = historyLogs.map(l => l.id === editingHistoryId ? { ...l, ...record } : l);
    } else {
      updated = [{ id:Date.now(), ...record }, ...historyLogs];
    }
    setHistoryLogs(updated);
    localStorage.setItem('hris_attendances_history', JSON.stringify(updated));
    showToast('success', 'Riwayat kehadiran berhasil disimpan!');
    setShowHistoryModal(false); resetHistoryForm();
  };

  const handleEditHistory = (log) => {
    setEditingHistoryId(log.id); setSelectedEmpIdHistory(log.employee_id||'');
    setHistoryOutletForm(log.outlet||''); setHistoryDate(log.date);
    setHistoryClockIn(log.clock_in||''); setHistoryClockOut(log.clock_out||'');
    setHistoryStatusIn(log.status_in||'ontime'); setHistoryNotes(log.notes||'');
    setHistoryStartBreak(log.jam_mulai_istirahat||''); setHistoryEndBreak(log.jam_akhir_istirahat||'');
    setHistoryBriefing(log.ikut_briefing || 'Tidak');
    setShowHistoryModal(true);
  };

  const handleDeleteHistory = (id) => {
    setConfirmModal({ isOpen:true, title:'Konfirmasi Hapus', message:'Hapus riwayat kehadiran ini?', confirmText:'Ya, Hapus', cancelText:'Batal', onConfirm: () => {
      const updated = historyLogs.filter(l => l.id !== id);
      setHistoryLogs(updated); localStorage.setItem('hris_attendances_history', JSON.stringify(updated));
      showToast('success', 'Riwayat berhasil dihapus.');
    }});
  };

  const resetHistoryForm = () => {
    setEditingHistoryId(null); setSelectedEmpIdHistory(''); setHistoryOutletForm('');
    setHistoryDate(new Date().toISOString().split('T')[0]);
    setHistoryClockIn(''); setHistoryClockOut(''); setHistoryStatusIn('ontime'); setHistoryNotes('');
    setHistoryStartBreak(''); setHistoryEndBreak(''); setHistoryBriefing('Tidak');
  };

  // ─── BREAK SCHEDULE: MANUAL INPUT HANDLERS ────────────────────────────────

  /** Ambil tabel jadwal dari DB berdasarkan filter */
  const fetchBsTableData = async (date, outlet) => {
    setBsTableLoading(true);
    try {
      let url = `${API_URL}/attendance/break-schedule?date=${date}`;
      if (outlet) url += `&outlet=${encodeURIComponent(outlet)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') setBsTableData(Array.isArray(data.data) ? data.data : []);
      else setBsTableData([]);
    } catch { setBsTableData([]); }
    finally { setBsTableLoading(false); }
  };

  /** Ambil karyawan aktif suatu outlet, kurangi yg absen pada tanggal tertentu */
  const fetchEmployeesForOutlet = async (outlet, date) => {
    if (!outlet || !date) { setAddFormRows([]); return; }
    setAddFormOutletLoading(true);
    try {
      // Dapatkan karyawan aktif di outlet tsb
      const empList = employees.filter(e => {
        const eo = (e.outlet || '').toUpperCase().trim();
        const to = (outlet || '').toUpperCase().trim();
        return (eo === to || eo.includes(to) || to.includes(eo)) && e.employee_status !== 'inactive';
      });
      // Kurangi yg absen pada tanggal terpilih
      const absentIds = new Set();
      [...realtimeLogs, ...historyLogs].forEach(log => {
        if ((log.date || log.tanggal) === date) {
          const s = (log.status || log.status_in || '').toLowerCase();
          if (['absen', 'absent', 'tidak hadir', 'alpha'].includes(s) || log.is_absent) {
            absentIds.add(String(log.employee_id || log.nik));
          }
        }
      });
      const duration = getRestDurationForOutlet(outlet);
      const numSess = duration === 2 ? 3 : 2;
      const times = getSessionTimes(duration);
      // Assign sesi default: distribusi bergantian
      const rows = empList
        .filter(e => !absentIds.has(String(e.id)) && !absentIds.has(String(e.nik)))
        .map((e, i) => {
          const defaultSesi = (i % numSess) + 1;
          return { employee_id: e.id, full_name: e.full_name, nik: e.nik, position: e.position, gender: e.gender, sesi: defaultSesi, jam_mulai: times[defaultSesi][0], jam_selesai: times[defaultSesi][1] };
        });
      setAddFormRows(rows);
      setAddFormErrors({});
      setAddFormGlobalError('');
    } catch (err) {
      showToast('error', 'Gagal memuat daftar karyawan.');
    } finally {
      setAddFormOutletLoading(false);
    }
  };

  /** Mapping sesi → [jam_mulai, jam_selesai] berdasarkan durasi outlet */
  const getSessionTimes = (duration) => {
    if (duration === 2) return { 1: ['12:00','14:00'], 2: ['14:00','16:00'], 3: ['16:00','18:00'] };
    return { 1: ['12:00','15:00'], 2: ['15:00','18:00'] };
  };

  /** Peringatan validasi berdasarkan row yang sudah diisi */
  const getScheduleWarnings = (rows, outlet) => {
    const warnings = [];
    if (!rows || rows.length === 0) return warnings;
    const duration = getRestDurationForOutlet(outlet);
    const numSess = duration === 2 ? 3 : 2;
    for (let sesi = 1; sesi <= numSess; sesi++) {
      const onBreak = rows.filter(r => r.sesi === sesi);
      const onDuty = rows.filter(r => r.sesi !== sesi);
      const totalKoki = rows.filter(r => (r.position||'').toLowerCase().includes('koki')).length;
      const totalWaiter = rows.filter(r => (r.position||'').toLowerCase().includes('waiter')).length;
      const totalWanita = rows.filter(r => (r.gender||'').toLowerCase() === 'wanita').length;
      if (totalKoki > 0 && onDuty.filter(r => (r.position||'').toLowerCase().includes('koki')).length === 0)
        warnings.push(`⚠️ Sesi ${sesi}: Tidak ada Koki yang bertugas (semua sedang istirahat)!`);
      if (totalWaiter > 0 && onDuty.filter(r => (r.position||'').toLowerCase().includes('waiter')).length === 0)
        warnings.push(`⚠️ Sesi ${sesi}: Tidak ada Waiter yang bertugas (semua sedang istirahat)!`);
      if (totalWanita > 0 && onDuty.filter(r => (r.gender||'').toLowerCase() === 'wanita').length === 0)
        warnings.push(`⚠️ Sesi ${sesi}: Tidak ada Karyawan Wanita yang bertugas (semua istirahat bersamaan)!`);
    }
    const females = rows.filter(r => (r.gender||'').toLowerCase() === 'wanita');
    if (females.length >= 2) {
      const bySess = {};
      females.forEach(r => { bySess[r.sesi] = (bySess[r.sesi] || 0) + 1; });
      Object.entries(bySess).forEach(([sess, cnt]) => {
        if (cnt === females.length) warnings.push(`⚠️ Semua karyawan wanita (${cnt}) dijadwalkan istirahat di Sesi ${sess} secara bersamaan!`);
      });
    }
    return warnings;
  };

  /** Handler saat outlet dipilih di form tambah */
  const handleAddFormOutletChange = (outlet) => {
    setAddFormOutlet(outlet);
    setAddFormRows([]);
    setAddFormErrors({});
    setAddFormGlobalError('');
    if (outlet && addFormDate) fetchEmployeesForOutlet(outlet, addFormDate);
  };

  /** Handler saat tanggal berubah di form tambah */
  const handleAddFormDateChange = (date) => {
    setAddFormDate(date);
    if (addFormOutlet && date) fetchEmployeesForOutlet(addFormOutlet, date);
  };

  /** Handler perubahan sesi per karyawan di form */
  const handleAddFormSesiChange = (empId, sesi) => {
    const duration = getRestDurationForOutlet(addFormOutlet);
    const times = getSessionTimes(duration);
    setAddFormRows(prev => prev.map(r =>
      r.employee_id === empId ? { ...r, sesi, jam_mulai: times[sesi][0], jam_selesai: times[sesi][1] } : r
    ));
    setAddFormErrors(prev => { const n = { ...prev }; delete n[empId]; return n; });
  };

  /** Validasi form sebelum review */
  const validateAddForm = () => {
    const errors = {};
    if (!addFormDate) { setAddFormGlobalError('Tanggal wajib dipilih.'); return false; }
    if (!addFormOutlet) { setAddFormGlobalError('Outlet wajib dipilih.'); return false; }
    if (addFormRows.length === 0) { setAddFormGlobalError('Tidak ada karyawan yang dapat dijadwalkan.'); return false; }
    addFormRows.forEach(r => {
      if (!r.sesi || r.sesi < 1) errors[r.employee_id] = 'Sesi wajib dipilih.';
    });
    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      setAddFormGlobalError('Terdapat karyawan yang belum dipilih sesinya!');
      return false;
    }
    setAddFormErrors({});
    setAddFormGlobalError('');
    return true;
  };

  /** Submit review → buka halaman review */
  const handleSubmitAddForm = () => {
    if (!validateAddForm()) return;
    setShowReviewModal(true);
  };

  /** Konfirmasi kirim ke server */
  const handleConfirmSend = async () => {
    setIsSyncingSchedule(true);
    try {
      const res = await fetch(`${API_URL}/attendance/break-schedule/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date: addFormDate,
          schedules: addFormRows.map(r => ({ employee_id: r.employee_id, sesi: r.sesi, jam_mulai: r.jam_mulai, jam_selesai: r.jam_selesai }))
        })
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) { setShowSessionExpiredModal(true); return; }
      if (data.status === 'success') {
        showToast('success', `🚀 Jadwal ${addFormRows.length} karyawan berhasil dikirim ke server!`);
        setShowReviewModal(false);
        setShowAddScheduleModal(false);
        setAddFormRows([]);
        setAddFormOutlet('');
        // Refresh tabel
        fetchBsTableData(bsTableDate, bsTableOutlet);
      } else {
        showToast('error', `Gagal mengirim: ${data.message}`);
      }
    } catch { showToast('error', 'Gagal menghubungi server.'); }
    finally { setIsSyncingSchedule(false); }
  };

  /** Hapus satu baris jadwal dari DB */
  const handleDeleteBsRow = (id) => {
    setConfirmModal({ isOpen: true, title: 'Hapus Jadwal', message: 'Hapus baris jadwal istirahat ini dari server?', confirmText: 'Ya, Hapus', cancelText: 'Batal', onConfirm: async () => {
      try {
        const res = await fetch(`${API_URL}/attendance/break-schedule/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.status === 401 || res.status === 403) { setShowSessionExpiredModal(true); return; }
        if (data.status === 'success') {
          setBsTableData(prev => prev.filter(s => s.id !== id));
          showToast('success', 'Jadwal berhasil dihapus.');
        } else { showToast('error', `Gagal hapus: ${data.message}`); }
      } catch { showToast('error', 'Gagal menghubungi server.'); }
    }});
  };


  const exportEvalPDF = () => {
    const doc = new jsPDF('l','mm','a4');
    const pW = doc.internal.pageSize.getWidth();
    doc.setFillColor(34,40,49); doc.rect(0,0,pW,36,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.setTextColor(255,255,255);
    doc.text('EVALUASI & DENDA ISTIRAHAT KARYAWAN — BAROKAH GRUP', 14, 13);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(180,180,180);
    const bulanLabel = monthEval ? BULAN[monthEval-1] : 'Semua Bulan';
    doc.text(`Outlet: ${outletEval||'Semua'} | Periode: ${bulanLabel} ${yearEval||'Semua Tahun'} | Toleransi: 15 Poin | Denda: Rp1.000/Poin`, 14, 21);
    doc.text(`Cetak: ${new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} ${new Date().toLocaleTimeString('id-ID')}`, 14, 28);
    doc.setTextColor(0,173,181); doc.setFontSize(8); doc.text(`Total Kena Denda: ${kenaDedan} karyawan | Total Denda: Rp ${totalDenda.toLocaleString('id-ID')}`, 14, 34);
    autoTable(doc, {
      startY: 40,
      head: [['NO','NAMA KARYAWAN','NIK','OUTLET','HARI ISTIRAHAT','TOTAL POIN','TOLERANSI','POIN KENA DENDA','ESTIMASI DENDA']],
      body: breakSummary.map((item,i) => [i+1, toTitleCase(item.name), item.nik, toTitleCase(item.outlet), `${item.totalDays} hari`, `${item.totalPoints} poin`, '15 poin', `${item.excessPoints} poin`, item.denda>0?`Rp ${item.denda.toLocaleString('id-ID')}`:'Rp 0']),
      theme: 'grid',
      headStyles: { fillColor:[239,68,68], textColor:[255,255,255], fontStyle:'bold', fontSize:7.5 },
      alternateRowStyles: { fillColor:[250,250,250] },
      styles: { fontSize:7.5, cellPadding:2.5 },
      columnStyles: { 0:{cellWidth:8}, 8:{fontStyle:'bold'} },
      didDrawPage: (d) => {
        const ph = doc.internal.pageSize.getHeight();
        doc.setFontSize(7); doc.setTextColor(150,150,150);
        doc.text(`HRIS Barokah Grup — Halaman ${d.pageNumber}`, 14, ph-6);
        doc.text(`Dicetak ${new Date().toLocaleDateString('id-ID')}`, pW-14, ph-6, {align:'right'});
      }
    });
    doc.save(`evaluasi_denda_${new Date().toISOString().slice(0,10)}.pdf`);
    showToast('success', 'Laporan PDF denda berhasil diunduh!');
  };

  // ─── REUSABLE FILTER BAR ───────────────────────────────────────────────────
  const FilterBar = ({ outlet, setOutlet, month, setMonth, year, setYear, extra }) => (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
      <div style={{ position:'relative' }}>
        <MapPin size={14} color="var(--text-muted)" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
        <select className="input-field" value={outlet} onChange={e=>setOutlet(e.target.value)}
          style={{ paddingLeft:'30px', height:'38px', fontSize:'0.82rem', minWidth:'180px', background:'var(--bg-main)', color:'#fff' }}>
          <option value="">🏪 Semua Outlet</option>
          {availableOutlets.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div style={{ position:'relative' }}>
        <Calendar size={14} color="var(--text-muted)" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
        <select className="input-field" value={month} onChange={e=>setMonth(e.target.value?parseInt(e.target.value,10):'')}
          style={{ paddingLeft:'30px', height:'38px', fontSize:'0.82rem', minWidth:'140px', background:'var(--bg-main)', color:'#fff' }}>
          <option value="">📅 Semua Bulan</option>
          {BULAN.map((b,i)=><option key={i} value={i+1}>{b}</option>)}
        </select>
      </div>
      <select className="input-field" value={year} onChange={e=>setYear(e.target.value?parseInt(e.target.value,10):'')}
        style={{ height:'38px', fontSize:'0.82rem', minWidth:'110px', background:'var(--bg-main)', color:'#fff' }}>
        <option value="">Semua Tahun</option>
        {TAHUN.map(y=><option key={y} value={y}>{y}</option>)}
      </select>
      {extra}
    </div>
  );

  // ─── TABS CONFIG (4 Tab Baru) ───────────────────────────────────────────────
  const tabs = [
    { id:'attendance',     label:'Kehadiran Karyawan',        emoji:'📋' },
    { id:'break_schedule', label:'Jadwal Istirahat',          emoji:'🕒' },
    { id:'break_eval',     label:'Evaluasi Denda Istirahat',  emoji:'💸' },
    { id:'peak_days',      label:'Master Hari Sibuk',         emoji:'🗓️' },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>

      {/* ── TOAST ── */}
      {toast.show && (
        <div className={`toast-notification ${toast.type==='success'?'toast-success':'toast-error'}`}>
          {toast.type==='success' ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
          <span className="toast-message">{toast.message}</span>
        </div>
      )}

      {/* ── TAB NAV ── */}
      <div style={{ display:'flex', background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'14px', padding:'6px', gap:'4px', overflowX:'auto', boxShadow:'0 4px 20px rgba(0,0,0,0.25)' }}>
        {tabs.map(tab => {
          const active = activeSubTab === tab.id;
          return (
            <button key={tab.id} onClick={()=>setActiveSubTab(tab.id)} style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
              padding:'11px 14px', background:active?'var(--primary-glow)':'transparent',
              border:active?'1px solid var(--primary-solid)':'1px solid transparent',
              borderRadius:'10px', color:active?'var(--primary-solid)':'var(--text-muted)',
              fontWeight:active?800:500, fontSize:'0.83rem', cursor:'pointer',
              transition:'all 0.2s ease', whiteSpace:'nowrap'
            }}>
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: KEHADIRAN KARYAWAN
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'attendance' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

          {/* Tombol Tambahkan Kehadiran */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-main)', margin:0 }}>📋 Data Kehadiran Karyawan</h3>
            <button
              onClick={() => { setShowInputBoard(true); setInputBoardRows([]); setInputBoardOutlet(''); }}
              style={{ background:'var(--primary-solid)', color:'#fff', border:'none', borderRadius:'10px',
                padding:'10px 20px', fontWeight:700, fontSize:'0.85rem', cursor:'pointer',
                display:'flex', alignItems:'center', gap:'8px', boxShadow:'0 4px 12px rgba(59,130,246,0.3)' }}
            >
              <Plus size={16}/> Tambahkan Kehadiran Karyawan
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center',
            background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px' }}>
            <Filter size={15} color='var(--text-muted)'/>
            <select value={attFilterOutlet} onChange={e=>setAttFilterOutlet(e.target.value)}
              style={{ height:'36px', border:'1px solid var(--border-color)', borderRadius:'8px',
                background:'var(--bg-surface)', color:'var(--text-main)', fontSize:'0.82rem', padding:'0 10px', minWidth:'160px' }}>
              <option value=''>Semua Outlet</option>
              {availableOutlets.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontWeight:600 }}>📅 Kalender:</span>
              <input type='month' value={attFilterDate} onChange={e=>setAttFilterDate(e.target.value)}
                min="2020-01" max="2040-12"
                style={{ height:'36px', border:'1px solid var(--border-color)', borderRadius:'8px',
                  background:'var(--bg-surface)', color:'var(--text-main)', fontSize:'0.82rem', padding:'0 10px' }}/>
            </div>
            <select value={attFilterStatus} onChange={e=>setAttFilterStatus(e.target.value)}
              style={{ height:'36px', border:'1px solid var(--border-color)', borderRadius:'8px',
                background:'var(--bg-surface)', color:'var(--text-main)', fontSize:'0.82rem', padding:'0 10px', minWidth:'160px' }}>
              <option value=''>Semua Status</option>
              <option value='Hadir & Tepat Waktu'>Hadir & Tepat Waktu</option>
              <option value='Hadir & Terlambat'>Hadir & Terlambat</option>
              <option value='Setengah Hari'>Setengah Hari</option>
              <option value='Absen'>Absen</option>
            </select>
          </div>

          {/* Tabel Kehadiran */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'14px', overflow:'hidden' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid var(--border-color)' }}>
              <span style={{ fontWeight:700, fontSize:'0.92rem', color:'var(--text-main)' }}>📄 Tabel Kehadiran Karyawan</span>
              <button onClick={() => {
                const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
                doc.setFontSize(14); doc.text('Laporan Kehadiran Karyawan', 14, 15);
                const filtered = filteredRealtime;
                autoTable(doc, {
                  startY: 22, styles:{fontSize:7.5},
                  head: [['Tanggal, Bulan & Tahun','Nama','Outlet','Jam Masuk','Jam Keluar','Jam Istirahat','Status Kehadiran','Durasi Kerja','Durasi Istirahat','Terlambat (menit)','Ikut Briefing','Status Kirim']],
                  body: filtered.map((l,i) => [
                    formatDate(l.tanggal||l.date), l.full_name||l.nama_karyawan||'-', l.outlet||'-',
                    l.jam_masuk||l.clock_in||'-', l.jam_keluar||l.clock_out||'-',
                    (l.jam_mulai_istirahat && l.jam_akhir_istirahat) ? `${l.jam_mulai_istirahat} - ${l.jam_akhir_istirahat}` : (l.jadwal_mulai_istirahat && l.jadwal_selesai_istirahat) ? `${l.jadwal_mulai_istirahat} - ${l.jadwal_selesai_istirahat} (Jadwal)` : '-',
                    getAttendanceStatus(l),
                    calculateWorkDuration(l.jam_masuk||l.clock_in, l.jam_keluar||l.clock_out, l.jam_mulai_istirahat, l.jam_akhir_istirahat),
                    getBreakDurationStr(l),
                    getMenitTerlambat(l) > 0 ? getMenitTerlambat(l) : '-',
                    l.ikut_briefing || 'Tidak',
                    l.sent_status === 'sent' ? 'Terkirim' : 'Belum'
                  ])
                });
                doc.save(`kehadiran_karyawan_${new Date().toISOString().slice(0,10)}.pdf`);
              }} style={{ background:'var(--primary-solid)', color:'#fff', border:'none', borderRadius:'8px',
                padding:'7px 14px', fontWeight:600, fontSize:'0.78rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                <FileText size={14}/> Download PDF
              </button>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
                <thead>
                  <tr style={{ background:'var(--bg-main)' }}>
                    {['Tanggal, Bulan & Tahun','Nama Karyawan','Outlet','Jam Masuk','Jam Keluar','Jam Istirahat','Status Kehadiran','Durasi Kerja','Durasi Istirahat','Terlambat','Ikut Briefing?','Status Kirim','Aksi']
                      .map(h => <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, fontSize:'0.73rem', textTransform:'uppercase', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredRealtime
                    .map((log, idx) => {
                      const status = getAttendanceStatus(log);
                      const terlambat = getMenitTerlambat(log);
                      const statusColor = status.includes('Tepat') ? '#10b981' : status.includes('Terlambat') ? '#f59e0b' : status.includes('Setengah') ? '#a78bfa' : '#ef4444';
                      return (
                        <tr key={log.id||idx} style={{ borderTop:'1px solid var(--border-color)', background: idx%2===0?'transparent':'rgba(59,130,246,0.02)' }}>
                          <td style={{ padding:'10px 12px', fontWeight:600 }}>{formatDate(log.tanggal||log.date)}</td>
                          <td style={{ padding:'10px 12px', fontWeight:600 }}>{log.full_name||log.nama_karyawan||'-'}</td>
                          <td style={{ padding:'10px 12px' }}>{log.outlet||'-'}</td>
                          <td style={{ padding:'10px 12px' }}>{log.jam_masuk||log.clock_in||'-'}</td>
                          <td style={{ padding:'10px 12px' }}>{log.jam_keluar||log.clock_out||'-'}</td>
                          <td style={{ padding:'10px 12px' }}>
                            {(log.jam_mulai_istirahat && log.jam_akhir_istirahat) ? `${log.jam_mulai_istirahat} - ${log.jam_akhir_istirahat}` : (log.jadwal_mulai_istirahat && log.jadwal_selesai_istirahat) ? `${log.jadwal_mulai_istirahat} - ${log.jadwal_selesai_istirahat} (Jadwal)` : '-'}
                          </td>
                          <td style={{ padding:'10px 12px' }}>
                            <span style={{ padding:'3px 8px', borderRadius:'20px', fontSize:'0.72rem', fontWeight:700, background:`${statusColor}18`, color:statusColor, border:`1px solid ${statusColor}40` }}>{status}</span>
                          </td>
                          <td style={{ padding:'10px 12px' }}>{calculateWorkDuration(log.jam_masuk||log.clock_in, log.jam_keluar||log.clock_out, log.jam_mulai_istirahat, log.jam_akhir_istirahat)}</td>
                          <td style={{ padding:'10px 12px' }}>{getBreakDurationStr(log)}</td>
                          <td style={{ padding:'10px 12px', color: terlambat > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                            {terlambat > 0 ? `+${terlambat} menit` : '-'}
                          </td>
                          <td style={{ padding:'10px 12px' }}>
                            <span style={{ padding:'3px 8px', borderRadius:'20px', fontSize:'0.72rem', fontWeight:700,
                              background: log.ikut_briefing === 'Ya' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                              color: log.ikut_briefing === 'Ya' ? '#10b981' : '#ef4444',
                              border: `1px solid ${log.ikut_briefing === 'Ya' ? '#10b98140' : '#ef444440'}` }}>
                              {log.ikut_briefing || 'Tidak'}
                            </span>
                          </td>
                          <td style={{ padding:'10px 12px' }}>
                            <span style={{ padding:'3px 8px', borderRadius:'20px', fontSize:'0.71rem', fontWeight:600,
                              background: log.sent_status === 'sent' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
                              color: log.sent_status === 'sent' ? '#10b981' : '#64748b',
                              border: `1px solid ${log.sent_status === 'sent' ? '#10b98140' : '#64748b40'}` }}>
                              {log.sent_status === 'sent' ? '✅ Terkirim' : '⏳ Belum'}
                            </span>
                          </td>
                          <td style={{ padding:'10px 12px' }}>
                            <div style={{ display:'flex', gap:'6px' }}>
                              <button onClick={() => {
                                if (log._fromLeave) {
                                  showToast('error', '⚠️ Data cuti/izin yang disetujui hanya dapat diubah melalui tab Pusat Pengajuan.');
                                  return;
                                }
                                handleEditRealtime(log);
                              }} style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', color:'#3B82F6', borderRadius:'6px', padding:'4px 8px', fontSize:'0.72rem', cursor:'pointer', fontWeight:600 }}>Edit</button>
                              <button onClick={() => {
                                if (log._fromLeave) {
                                  showToast('error', '⚠️ Data cuti/izin yang disetujui hanya dapat dibatalkan/dihapus melalui tab Pusat Pengajuan.');
                                  return;
                                }
                                if (!window.confirm('Hapus data kehadiran ini?')) return;
                                const updated = realtimeLogs.filter(r => r.id !== log.id);
                                setRealtimeLogs(updated);
                                localStorage.setItem('hris_attendances_realtime', JSON.stringify(updated));
                                showToast('success', 'Data kehadiran dihapus.');
                              }} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:'6px', padding:'4px 8px', fontSize:'0.72rem', cursor:'pointer', fontWeight:600 }}>Hapus</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {filteredRealtime.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)', fontSize:'0.88rem' }}>📋 Belum ada data kehadiran.</div>
              )}
            </div>
          </div>

          {/* ── PAPAN INPUT MODAL ── */}
          {showInputBoard && (
            <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.55)', zIndex:9000,
              display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'30px 16px' }}>
              <div style={{ background:'var(--bg-surface)', border:'2px solid var(--accent-primary)', borderRadius:'18px',
                width:'100%', maxWidth:'800px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', animation:'scaleUp 0.3s ease' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'18px 24px', borderBottom:'1px solid var(--border-color)',
                  background:'linear-gradient(135deg,rgba(59,130,246,0.08),transparent)', borderRadius:'18px 18px 0 0' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <span style={{ fontSize:'1.3rem' }}>📋</span>
                    <div>
                      <h3 style={{ margin:0, fontSize:'1rem', fontWeight:800, color:'var(--text-main)' }}>Tambahkan Kehadiran Karyawan</h3>
                      <p style={{ margin:0, fontSize:'0.78rem', color:'var(--text-muted)' }}>Isi data kehadiran berdasarkan outlet dan tanggal</p>
                    </div>
                  </div>
                  <button onClick={() => setShowInputBoard(false)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'4px' }}><X size={20}/></button>
                </div>

                <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>
                  {/* Tanggal & Outlet */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                    <div>
                      <label style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:'6px' }}>📅 Tanggal Kehadiran</label>
                      <input type='date' value={inputBoardDate}
                        min='2020-01-01' max='2040-12-31'
                        onChange={e => setInputBoardDate(e.target.value)}
                        style={{ width:'100%', height:'40px', border:'1px solid var(--border-color)', borderRadius:'8px',
                          background:'var(--bg-main)', color:'var(--text-main)', padding:'0 12px', fontSize:'0.88rem' }}/>
                    </div>
                    <div>
                      <label style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:'6px' }}>🏪 Pilih Outlet</label>
                      <select value={inputBoardOutlet}
                        onChange={e => { setInputBoardOutlet(e.target.value); generateInputBoardRows(e.target.value); }}
                        style={{ width:'100%', height:'40px', border:'1px solid var(--border-color)', borderRadius:'8px',
                          background:'var(--bg-main)', color:'var(--text-main)', padding:'0 12px', fontSize:'0.88rem' }}>
                        <option value=''>-- Pilih Outlet --</option>
                        {availableOutlets.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Tabel Input Karyawan */}
                  {inputBoardRows.length > 0 ? (
                    <div style={{ border:'1px solid var(--border-color)', borderRadius:'10px', overflow:'hidden' }}>
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                          <thead>
                            <tr style={{ background:'rgba(59,130,246,0.08)' }}>
                              {['Nama Karyawan','Jabatan','Status','Jam Masuk','Jam Keluar','Ikut Briefing?'].map(h =>
                                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, fontSize:'0.73rem', textTransform:'uppercase', color:'#3B82F6', whiteSpace:'nowrap' }}>{h}</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {inputBoardRows.map((row, idx) => (
                              <tr key={idx} style={{ borderTop:'1px solid var(--border-color)' }}>
                                <td style={{ padding:'10px 12px', fontWeight:600 }}>{row.emp_name}</td>
                                <td style={{ padding:'10px 12px', color:'var(--text-muted)', fontSize:'0.78rem' }}>{row.jabatan||'-'}</td>
                                <td style={{ padding:'10px 12px' }}>
                                  <select value={row.status} onChange={e => updateInputRow(idx,'status',e.target.value)}
                                    style={{ height:'32px', border:'1px solid var(--border-color)', borderRadius:'6px',
                                      background:row.status==='hadir'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',
                                      color:row.status==='hadir'?'#10b981':'#ef4444', fontWeight:700, padding:'0 8px', fontSize:'0.8rem' }}>
                                    <option value='hadir'>Hadir</option>
                                    <option value='absen'>Absen</option>
                                  </select>
                                </td>
                                <td style={{ padding:'10px 12px' }}>
                                  {row.status === 'hadir' ? (
                                    <input type='time' value={row.jam_masuk} onChange={e => updateInputRow(idx,'jam_masuk',e.target.value)}
                                      style={{ height:'32px', border:'1px solid var(--border-color)', borderRadius:'6px', background:'var(--bg-main)', color:'var(--text-main)', padding:'0 8px', fontSize:'0.8rem' }}/>
                                  ) : <span style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>-</span>}
                                </td>
                                <td style={{ padding:'10px 12px' }}>
                                  {row.status === 'hadir' ? (
                                    <input type='time' value={row.jam_keluar} onChange={e => updateInputRow(idx,'jam_keluar',e.target.value)}
                                      style={{ height:'32px', border:'1px solid var(--border-color)', borderRadius:'6px', background:'var(--bg-main)', color:'var(--text-main)', padding:'0 8px', fontSize:'0.8rem' }}/>
                                  ) : <span style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>-</span>}
                                </td>
                                <td style={{ padding:'10px 12px' }}>
                                  {row.status === 'hadir' ? (
                                    <select value={row.ikut_briefing} onChange={e => updateInputRow(idx,'ikut_briefing',e.target.value)}
                                      style={{ height:'32px', border:'1px solid var(--border-color)', borderRadius:'6px',
                                        background:row.ikut_briefing==='Ya'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',
                                        color:row.ikut_briefing==='Ya'?'#10b981':'#ef4444', fontWeight:700, padding:'0 8px', fontSize:'0.8rem' }}>
                                      <option value='Tidak'>Tidak</option>
                                      <option value='Ya'>Ya</option>
                                    </select>
                                  ) : <span style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>-</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : inputBoardOutlet ? (
                    <div style={{ textAlign:'center', padding:'30px', color:'var(--text-muted)', fontSize:'0.88rem' }}>
                      ✅ Semua karyawan outlet ini sedang dalam status cuti/izin yang disetujui, atau tidak ada karyawan aktif.
                    </div>
                  ) : (
                    <div style={{ textAlign:'center', padding:'30px', color:'var(--text-muted)', fontSize:'0.88rem' }}>
                      👆 Pilih outlet untuk menampilkan daftar karyawan
                    </div>
                  )}

                  {/* Tombol Aksi */}
                  <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
                    <button onClick={() => setShowInputBoard(false)}
                      style={{ padding:'10px 20px', border:'1px solid var(--border-color)', borderRadius:'10px',
                        background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontWeight:600, fontSize:'0.85rem' }}>Batal</button>
                    <button onClick={handleSaveInputBoard}
                      style={{ padding:'10px 24px', background:'var(--primary-solid)', color:'#fff', border:'none',
                        borderRadius:'10px', fontWeight:700, fontSize:'0.85rem', cursor:'pointer',
                        boxShadow:'0 4px 12px rgba(59,130,246,0.3)', display:'flex', alignItems:'center', gap:'8px' }}>
                      <CheckCircle size={16}/> Simpan & Preview
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PREVIEW SEBELUM KIRIM ── */}
          {showAttPreview && (
            <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.65)', zIndex:9500,
              display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
              <div style={{ background:'var(--bg-surface)', border:'2px solid #10b981', borderRadius:'18px', width:'100%', maxWidth:'680px',
                boxShadow:'0 20px 60px rgba(0,0,0,0.4)', maxHeight:'80vh', overflow:'auto' }}>
                <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border-color)', background:'rgba(16,185,129,0.06)', borderRadius:'18px 18px 0 0' }}>
                  <h3 style={{ margin:0, fontSize:'1rem', fontWeight:800, color:'#10b981' }}>✅ Preview Data Kehadiran</h3>
                  <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>Periksa data sebelum menyimpan dan mengirim ke mobile APK karyawan</p>
                </div>
                <div style={{ padding:'20px 24px' }}>
                  <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'12px' }}>
                    📅 <strong>Tanggal:</strong> {inputBoardDate} &nbsp;|&nbsp;
                    🏪 <strong>Outlet:</strong> {inputBoardOutlet} &nbsp;|&nbsp;
                    👥 <strong>Total:</strong> {inputBoardRows.length} karyawan
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                    <thead>
                      <tr style={{ background:'rgba(16,185,129,0.08)' }}>
                        {['Nama','Status','Jam Masuk','Jam Keluar','Status Kehadiran','Briefing'].map(h =>
                          <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#10b981', fontSize:'0.73rem', textTransform:'uppercase' }}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {inputBoardRows.map((row,idx) => {
                        const fakeLog = { jam_masuk: row.jam_masuk, jam_keluar: row.jam_keluar, realtimeStatus: row.status, outlet: inputBoardOutlet };
                        const s = row.status === 'absen' ? 'Absen' : getAttendanceStatus(fakeLog);
                        const sColor = s.includes('Tepat') ? '#10b981' : s.includes('Terlambat') ? '#f59e0b' : s === 'Absen' ? '#ef4444' : '#a78bfa';
                        return (
                          <tr key={idx} style={{ borderTop:'1px solid var(--border-color)' }}>
                            <td style={{ padding:'8px 12px', fontWeight:600 }}>{row.emp_name}</td>
                            <td style={{ padding:'8px 12px' }}>
                              <span style={{ padding:'2px 8px', borderRadius:'20px', fontSize:'0.72rem', fontWeight:700,
                                background: row.status==='hadir'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',
                                color: row.status==='hadir'?'#10b981':'#ef4444' }}>
                                {row.status === 'hadir' ? 'Hadir' : 'Absen'}
                              </span>
                            </td>
                            <td style={{ padding:'8px 12px' }}>{row.status==='absen'?'-':row.jam_masuk||'-'}</td>
                            <td style={{ padding:'8px 12px' }}>{row.status==='absen'?'-':row.jam_keluar||'-'}</td>
                            <td style={{ padding:'8px 12px' }}>
                              <span style={{ padding:'2px 8px', borderRadius:'20px', fontSize:'0.72rem', fontWeight:700,
                                background:`${sColor}18`, color:sColor, border:`1px solid ${sColor}40` }}>{s}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding:'16px 24px', borderTop:'1px solid var(--border-color)', display:'flex', gap:'12px', justifyContent:'flex-end' }}>
                  <button onClick={() => setShowAttPreview(false)}
                    style={{ padding:'10px 20px', border:'1px solid var(--border-color)', borderRadius:'10px',
                      background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontWeight:600, fontSize:'0.85rem' }}>Edit Lagi</button>
                  <button onClick={handleConfirmInputBoard}
                    style={{ padding:'10px 24px', background:'#10b981', color:'#fff', border:'none',
                      borderRadius:'10px', fontWeight:700, fontSize:'0.85rem', cursor:'pointer',
                      boxShadow:'0 4px 12px rgba(16,185,129,0.35)', display:'flex', alignItems:'center', gap:'8px' }}>
                    <CheckCircle size={16}/> OK — Simpan & Kirim ke APK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 (LAMA): KEHADIRAN REAL TIME — tersimpan untuk backward compat
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'realtime' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

          {/* Summary Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'16px' }}>
            {[
              { label:'Total Log', value:rtTotal, color:'#94a3b8', icon:<Users size={20}/> },
              { label:'Hadir',     value:rtHadir, color:'#22c55e', icon:<CheckCircle size={20}/> },
              { label:'Terlambat', value:rtLate,  color:'#f59e0b', icon:<Clock size={20}/> },
              { label:'½ Hari',    value:rtHalfDay,color:'#3b82f6', icon:<AlertCircle size={20}/> },
              { label:'Absen',     value:rtAbsen, color:'#ef4444', icon:<XCircle size={20}/> },
            ].map((c,i) => (
              <div key={i} style={{ background:'var(--bg-card)', border:`1px solid ${c.color}25`, borderRadius:'14px', padding:'20px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:`0 4px 20px ${c.color}15` }}>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>{c.label}</div>
                  <div style={{ fontSize:'1.9rem', fontWeight:800, color:c.color }}>{c.value}</div>
                </div>
                <div style={{ width:'42px', height:'42px', borderRadius:'10px', background:`${c.color}15`, display:'flex', alignItems:'center', justifyContent:'center', color:c.color }}>{c.icon}</div>
              </div>
            ))}
          </div>

          {/* Table Card */}
          <div className="glass-card animate-fade-in" style={{ padding:'28px' }}>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div className="logo-icon" style={{ background:'var(--primary-glow)', width:'40px', height:'40px' }}><Clock size={18} color="var(--primary-solid)"/></div>
                <div>
                  <h3 style={{ fontSize:'1.1rem', fontWeight:800, color:'#fff', margin:0 }}>KEHADIRAN REAL TIME</h3>
                  <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:0 }}>Log kehadiran harian karyawan per outlet</p>
                </div>
              </div>
              <button className="btn-primary" onClick={()=>{ resetRealtimeForm(); setShowRealtimeModal(true); }} disabled={employees.length===0}>
                <Plus size={15}/><span>Tambah Kehadiran</span>
              </button>
            </div>

            {/* Filters */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', marginBottom:'20px' }}>
              <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ position:'relative' }}>
                  <Search size={15} color="var(--text-muted)" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)' }}/>
                  <input type="text" placeholder="Cari nama..." className="input-field" value={searchRealtime} onChange={e=>setSearchRealtime(e.target.value)} style={{ paddingLeft:'34px', height:'38px', width:'200px', fontSize:'0.82rem' }}/>
                </div>
                <FilterBar outlet={outletRealtime} setOutlet={setOutletRealtime} month={monthRealtime} setMonth={setMonthRealtime} year={yearRealtime} setYear={setYearRealtime} extra={
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <input type="date" className="input-field" value={startDateRealtime} onChange={e=>setStartDateRealtime(e.target.value)} style={{ height:'38px', fontSize:'0.82rem', width:'140px' }}/>
                    <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>s/d</span>
                    <input type="date" className="input-field" value={endDateRealtime} onChange={e=>setEndDateRealtime(e.target.value)} style={{ height:'38px', fontSize:'0.82rem', width:'140px' }}/>
                  </div>
                }/>
              </div>

              {/* Column filter */}
              <div style={{ position:'relative' }}>
                <button className="btn-secondary" onClick={()=>setShowColFilterRealtime(!showColFilterRealtime)} style={{ height:'38px', display:'flex', alignItems:'center', gap:'6px', padding:'0 14px', fontSize:'0.82rem' }}>
                  <Filter size={14}/><span>Kolom</span>
                </button>
                {showColFilterRealtime && (
                  <>
                    <div style={{ position:'fixed', inset:0, zIndex:40 }} onClick={()=>setShowColFilterRealtime(false)}/>
                    <div style={{ position:'absolute', right:0, top:'44px', zIndex:50, padding:'14px', minWidth:'200px', background:'rgba(10,15,30,0.97)', backdropFilter:'blur(16px)', border:'1px solid var(--border-color)', borderRadius:'12px', boxShadow:'0 10px 30px rgba(0,0,0,0.6)' }}>
                      <p style={{ fontSize:'0.72rem', fontWeight:800, color:'var(--primary-solid)', textTransform:'uppercase', marginBottom:'8px' }}>Tampilkan Kolom</p>
                      {Object.keys(visibleColumnsRealtime).map(col => (
                        <label key={col} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.82rem', color:'#fff', cursor:'pointer', padding:'3px 0' }}>
                          <input type="checkbox" checked={visibleColumnsRealtime[col]} onChange={()=>setVisibleColumnsRealtime(p=>({...p,[col]:!p[col]}))} style={{ accentColor:'var(--primary-solid)' }}/>
                          {colLabelMapRealtime[col]}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)' }}><Loader2 size={28} style={{ animation:'spin 1s linear infinite' }}/></div>
            ) : (
              <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid var(--border-color)' }}>
                <table className="data-table" style={{ fontSize:'12px', minWidth:'800px' }}>
                  <thead>
                    <tr>
                      {visibleColumnsRealtime.no && <th style={{width:'40px'}}>No</th>}
                      {visibleColumnsRealtime.name && <th>Nama Karyawan</th>}
                      {visibleColumnsRealtime.outlet && <th>Outlet</th>}
                      {visibleColumnsRealtime.tanggal && <th>Tanggal</th>}
                      {visibleColumnsRealtime.jam_masuk && <th>Jam Masuk</th>}
                      {visibleColumnsRealtime.jam_pulang && <th>Jam Pulang</th>}
                      {visibleColumnsRealtime.jam_mulai_istirahat && <th>Mulai Istirahat</th>}
                      {visibleColumnsRealtime.jam_akhir_istirahat && <th>Akhir Istirahat</th>}
                      {visibleColumnsRealtime.status && <th>Status</th>}
                      {visibleColumnsRealtime.durasi && <th>Durasi Kerja</th>}
                      {visibleColumnsRealtime.keterangan && <th>Keterangan</th>}
                      {visibleColumnsRealtime.actions && <th style={{width:'80px'}}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRealtime.length === 0 ? (
                      <tr><td colSpan={Object.values(visibleColumnsRealtime).filter(Boolean).length} style={{ textAlign:'center', color:'var(--text-muted)', padding:'40px' }}>Belum ada log kehadiran.</td></tr>
                  ) : filteredRealtime.map((log, i) => (
                      <tr key={log.id}>
                        {visibleColumnsRealtime.no && <td style={{fontWeight:600}}>{i+1}</td>}
                        {visibleColumnsRealtime.name && <td style={{color:'#fff',fontWeight:700}}>{toTitleCase(log.nama_karyawan)}</td>}
                        {visibleColumnsRealtime.outlet && <td style={{color:'var(--text-muted)'}}>{toTitleCase(log.outlet)}</td>}
                        {visibleColumnsRealtime.tanggal && <td style={{fontWeight:600}}>{formatDate(log.date)}</td>}
                        {visibleColumnsRealtime.jam_masuk && <td style={{color:'var(--primary-solid)',fontWeight:600}}>{log.jam_masuk}</td>}
                        {visibleColumnsRealtime.jam_pulang && <td style={{color:'var(--primary-solid)',fontWeight:600}}>{log.jam_pulang}</td>}
                        {visibleColumnsRealtime.jam_mulai_istirahat && <td style={{color:'var(--text-muted)'}}>{log.jam_mulai_istirahat||'-'}</td>}
                        {visibleColumnsRealtime.jam_akhir_istirahat && <td style={{color:'var(--text-muted)'}}>{log.jam_akhir_istirahat||'-'}</td>}
                        {visibleColumnsRealtime.status && <td><StatusBadge status={log.status}/></td>}
                        {visibleColumnsRealtime.durasi && <td style={{color:'#f59e0b',fontWeight:600}}>{log.durasi}</td>}
                        {visibleColumnsRealtime.selfie && (
                          <td>
                            {log.photo_in_url || log.photo_out_url || log.photo_break_start_url || log.photo_break_end_url || log.photo_in || log.photo_out || log.photo_break_start || log.photo_break_end ? (
                              <button type="button" onClick={() => handleViewSelfie(log)} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'20px', fontSize:'0.72rem', color:'#00ADB5', border:'1px solid rgba(0, 173, 181, 0.3)', background:'rgba(0,173,181,0.08)', fontWeight:600, cursor:'pointer' }}>
                                <Camera size={11}/> Lihat
                              </button>
                            ) : (
                              <span style={{ color:'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                        )}
                        {visibleColumnsRealtime.keterangan && <td style={{color:'var(--text-muted)',fontStyle:log.keterangan?'normal':'italic'}}>{log.keterangan||'-'}</td>}
                        {visibleColumnsRealtime.actions && (
                          <td>
                            <div style={{display:'flex',gap:'6px'}}>
                              <button onClick={()=>handleEditRealtime(log)} style={{background:'var(--primary-glow)',border:'none',color:'var(--primary-solid)',padding:'5px 7px',borderRadius:'6px',cursor:'pointer'}}><Edit2 size={13}/></button>
                              <button onClick={()=>handleDeleteRealtime(log.id)} style={{background:'var(--danger-glow)',border:'none',color:'var(--danger)',padding:'5px 7px',borderRadius:'6px',cursor:'pointer'}}><Trash2 size={13}/></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: RIWAYAT LENGKAP
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'history' && (
        <div className="glass-card animate-fade-in" style={{ padding:'28px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <div className="logo-icon" style={{ background:'rgba(34,197,94,0.1)', width:'40px', height:'40px' }}><Calendar size={18} color="#22c55e"/></div>
              <div>
                <h3 style={{ fontSize:'1.1rem', fontWeight:800, color:'#fff', margin:0 }}>RIWAYAT LENGKAP KEHADIRAN</h3>
                <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:0 }}>Arsip aktual dari APK mobile + input manual</p>
              </div>
            </div>
            <button className="btn-primary" onClick={()=>{ resetHistoryForm(); setShowHistoryModal(true); }} disabled={employees.length===0}>
              <Plus size={15}/><span>Tambah Riwayat</span>
            </button>
          </div>

          {/* Filters */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', marginBottom:'20px' }}>
            <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ position:'relative' }}>
                <Search size={15} color="var(--text-muted)" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)' }}/>
                <input type="text" placeholder="Cari nama / NIK..." className="input-field" value={searchHistory} onChange={e=>setSearchHistory(e.target.value)} style={{ paddingLeft:'34px', height:'38px', width:'200px', fontSize:'0.82rem' }}/>
              </div>
              <FilterBar outlet={outletHistory} setOutlet={setOutletHistory} month={monthHistory} setMonth={setMonthHistory} year={yearHistory} setYear={setYearHistory} extra={
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  <input type="date" className="input-field" value={startDateHistory} onChange={e=>setStartDateHistory(e.target.value)} style={{ height:'38px', fontSize:'0.82rem', width:'140px' }}/>
                  <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>s/d</span>
                  <input type="date" className="input-field" value={endDateHistory} onChange={e=>setEndDateHistory(e.target.value)} style={{ height:'38px', fontSize:'0.82rem', width:'140px' }}/>
                </div>
              }/>
            </div>
            <div style={{ position:'relative' }}>
              <button className="btn-secondary" onClick={()=>setShowColFilterHistory(!showColFilterHistory)} style={{ height:'38px', display:'flex', alignItems:'center', gap:'6px', padding:'0 14px', fontSize:'0.82rem' }}>
                <Filter size={14}/><span>Kolom</span>
              </button>
              {showColFilterHistory && (
                <>
                  <div style={{ position:'fixed', inset:0, zIndex:40 }} onClick={()=>setShowColFilterHistory(false)}/>
                  <div style={{ position:'absolute', right:0, top:'44px', zIndex:50, padding:'14px', minWidth:'200px', background:'rgba(10,15,30,0.97)', backdropFilter:'blur(16px)', border:'1px solid var(--border-color)', borderRadius:'12px', boxShadow:'0 10px 30px rgba(0,0,0,0.6)' }}>
                    <p style={{ fontSize:'0.72rem', fontWeight:800, color:'var(--primary-solid)', textTransform:'uppercase', marginBottom:'8px' }}>Tampilkan Kolom</p>
                    {Object.keys(visibleColumnsHistory).map(col=>(
                      <label key={col} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.82rem', color:'#fff', cursor:'pointer', padding:'3px 0' }}>
                        <input type="checkbox" checked={visibleColumnsHistory[col]} onChange={()=>setVisibleColumnsHistory(p=>({...p,[col]:!p[col]}))} style={{ accentColor:'var(--primary-solid)' }}/>
                        {colLabelMapHistory[col]}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)' }}><Loader2 size={28} style={{ animation:'spin 1s linear infinite' }}/></div>
          ) : (
            <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid var(--border-color)' }}>
              <table className="data-table" style={{ fontSize:'12px', minWidth:'900px' }}>
                <thead>
                  <tr>
                    {visibleColumnsHistory.date && <th>Tanggal</th>}
                    {visibleColumnsHistory.nik && <th>NIK</th>}
                    {visibleColumnsHistory.full_name && <th>Nama Lengkap</th>}
                    {visibleColumnsHistory.department && <th>Jabatan</th>}
                    {visibleColumnsHistory.outlet && <th>Outlet</th>}
                    {visibleColumnsHistory.clock_in && <th>Jam Masuk</th>}
                    {visibleColumnsHistory.clock_out && <th>Jam Keluar</th>}
                    {visibleColumnsHistory.break_time && <th>Waktu Istirahat</th>}
                    {visibleColumnsHistory.status_in && <th>Status</th>}
                    {visibleColumnsHistory.map && <th>Peta</th>}
                    {visibleColumnsHistory.notes && <th>Catatan</th>}
                    {visibleColumnsHistory.actions && <th style={{width:'80px'}}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={Object.values(visibleColumnsHistory).filter(Boolean).length} style={{ textAlign:'center', color:'var(--text-muted)', padding:'40px' }}>Belum ada riwayat kehadiran.</td></tr>
                  ) : filteredHistory.map(log => {
                    const displayOutlet = resolveOutlet(log);
                    const isLate = log.status_in === 'late' || (log.notes && /terlambat|late/i.test(log.notes));
                    const isAbsent = !log.clock_in;
                    const isHalf = checkIsHalfDay(log);
                    let statusLabel = 'Hadir';
                    if (isAbsent) statusLabel = 'Absen';
                    else if (isHalf) statusLabel = 'setengah hari';
                    else if (isLate) statusLabel = 'terlambat';
                    return (
                      <tr key={log.id}>
                        {visibleColumnsHistory.date && <td style={{fontWeight:600}}>{formatDate(log.date)}</td>}
                        {visibleColumnsHistory.nik && <td style={{fontFamily:'monospace',fontSize:'11px'}}>{log.nik||'-'}</td>}
                        {visibleColumnsHistory.full_name && <td style={{color:'#fff',fontWeight:700}}>{toTitleCase(log.full_name)}</td>}
                        {visibleColumnsHistory.department && <td style={{color:'var(--text-muted)'}}>{toTitleCase(log.department)}</td>}
                        {visibleColumnsHistory.outlet && <td>{displayOutlet ? <span style={{display:'inline-flex',alignItems:'center',gap:'4px',background:'rgba(99,102,241,0.15)',color:'#a5b4fc',padding:'3px 9px',borderRadius:'20px',fontSize:'0.75rem',fontWeight:600}}><Store size={10}/>{toTitleCase(displayOutlet)}</span> : <span style={{color:'var(--text-muted)'}}>-</span>}</td>}
                        {visibleColumnsHistory.clock_in && <td style={{color:'var(--primary-solid)',fontWeight:600}}>{log.clock_in||'--:--'}</td>}
                        {visibleColumnsHistory.clock_out && <td style={{color:'var(--text-muted)'}}>{log.clock_out||'--:--'}</td>}
                        {visibleColumnsHistory.break_time && <td style={{color:'var(--text-muted)',fontSize:'11px'}}>{log.jam_mulai_istirahat && log.jam_akhir_istirahat ? `${log.jam_mulai_istirahat}–${log.jam_akhir_istirahat}` : '-'}</td>}
                        {visibleColumnsHistory.status_in && <td><StatusBadge status={statusLabel}/></td>}
                        {visibleColumnsHistory.selfie && (
                          <td>
                            {log.photo_in_url || log.photo_out_url || log.photo_break_start_url || log.photo_break_end_url || log.photo_in || log.photo_out || log.photo_break_start || log.photo_break_end ? (
                              <button type="button" onClick={() => handleViewSelfie(log)} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'20px', fontSize:'0.72rem', color:'#00ADB5', border:'1px solid rgba(0, 173, 181, 0.3)', background:'rgba(0,173,181,0.08)', fontWeight:600, cursor:'pointer' }}>
                                <Camera size={11}/> Lihat
                              </button>
                            ) : (
                              <span style={{ color:'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                        )}
                        {visibleColumnsHistory.map && <td>{log.lat_in ? <a href={`https://www.google.com/maps?q=${log.lat_in},${log.lng_in}`} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'4px',color:'var(--primary-solid)',fontSize:'0.8rem',fontWeight:600,textDecoration:'none'}}><MapPin size={12}/>Lihat</a> : <span style={{color:'var(--text-muted)'}}>-</span>}</td>}
                        {visibleColumnsHistory.notes && <td style={{color:'var(--text-muted)',maxWidth:'150px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.notes||'-'}</td>}
                        {visibleColumnsHistory.actions && (
                          <td>
                            <div style={{display:'flex',gap:'6px'}}>
                              <button onClick={()=>handleEditHistory(log)} style={{background:'var(--primary-glow)',border:'none',color:'var(--primary-solid)',padding:'5px 7px',borderRadius:'6px',cursor:'pointer'}}><Edit2 size={13}/></button>
                              <button onClick={()=>handleDeleteHistory(log.id)} style={{background:'var(--danger-glow)',border:'none',color:'var(--danger)',padding:'5px 7px',borderRadius:'6px',cursor:'pointer'}}><Trash2 size={13}/></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: REKAPAN KEHADIRAN PER KARYAWAN
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'recap' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

          {/* Rekap Summary Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'16px' }}>
            {[
              { label:'Total Karyawan', value:recapData.length, color:'#94a3b8', icon:<Users size={20}/> },
              { label:'Total Log Digabung', value:realtimeLogs.length+historyLogs.length, color:'#a78bfa', icon:<BarChart2 size={20}/> },
              { label:'Rata-rata % Kehadiran', value:`${recapData.length>0?Math.round(recapData.reduce((s,r)=>s+r.pct,0)/recapData.length):0}%`, color:'#22c55e', icon:<TrendingDown size={20}/> },
              { label:'Total Absen (Semua)', value:recapData.reduce((s,r)=>s+r.absen,0), color:'#ef4444', icon:<XCircle size={20}/> },
            ].map((c,i)=>(
              <div key={i} style={{ background:'var(--bg-card)', border:`1px solid ${c.color}25`, borderRadius:'14px', padding:'18px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:`0 4px 20px ${c.color}15` }}>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px' }}>{c.label}</div>
                  <div style={{ fontSize:'1.7rem', fontWeight:800, color:c.color }}>{c.value}</div>
                </div>
                <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:`${c.color}15`, display:'flex', alignItems:'center', justifyContent:'center', color:c.color }}>{c.icon}</div>
              </div>
            ))}
          </div>

          {/* Table Card */}
          <div className="glass-card animate-fade-in" style={{ padding:'28px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div className="logo-icon" style={{ background:'rgba(167,139,250,0.1)', width:'40px', height:'40px' }}><BarChart2 size={18} color="#a78bfa"/></div>
                <div>
                  <h3 style={{ fontSize:'1.1rem', fontWeight:800, color:'#fff', margin:0 }}>REKAPAN KEHADIRAN KARYAWAN</h3>
                  <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:0 }}>Agregasi dari Real Time + Riwayat Kehadiran. Klik baris untuk detail.</p>
                </div>
              </div>
            </div>

            {/* Recap Filters */}
            <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap', marginBottom:'20px' }}>
              <div style={{ position:'relative' }}>
                <Search size={15} color="var(--text-muted)" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)' }}/>
                <input type="text" placeholder="Cari nama / NIK..." className="input-field" value={searchRecap} onChange={e=>setSearchRecap(e.target.value)} style={{ paddingLeft:'34px', height:'38px', width:'200px', fontSize:'0.82rem' }}/>
              </div>
              <FilterBar outlet={outletRecap} setOutlet={setOutletRecap} month={monthRecap} setMonth={setMonthRecap} year={yearRecap} setYear={setYearRecap}/>
            </div>

            {/* Table */}
            <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid var(--border-color)' }}>
              <table className="data-table" style={{ fontSize:'12px', minWidth:'900px' }}>
                <thead>
                  <tr>
                    <th style={{width:'30px'}}></th>
                    <th>No</th>
                    <th>Nama Karyawan</th>
                    <th>NIK</th>
                    <th>Jabatan</th>
                    <th>Outlet</th>
                    <th style={{textAlign:'center'}}>Hadir</th>
                    <th style={{textAlign:'center'}}>Terlambat</th>
                    <th style={{textAlign:'center'}}>½ Hari</th>
                    <th style={{textAlign:'center'}}>Absen</th>
                    <th style={{textAlign:'center'}}>% Kehadiran</th>
                    <th style={{textAlign:'center'}}>Total Jam Kerja</th>
                  </tr>
                </thead>
                <tbody>
                  {recapData.length === 0 ? (
                    <tr><td colSpan={12} style={{ textAlign:'center', color:'var(--text-muted)', padding:'48px' }}>Belum ada data untuk ditampilkan. Tambahkan kehadiran di tab Real Time atau Riwayat.</td></tr>
                  ) : recapData.map((r, i) => {
                    const isExpanded = expandedRecapRow === i;
                    const pctColor = r.pct >= 85 ? '#22c55e' : r.pct >= 60 ? '#f59e0b' : '#ef4444';
                    return (
                      <React.Fragment key={i}>
                        <tr onClick={()=>setExpandedRecapRow(isExpanded?null:i)} style={{ cursor:'pointer', transition:'background 0.15s' }}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{textAlign:'center', color:'var(--text-muted)'}}>
                            {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                          </td>
                          <td style={{fontWeight:600, color:'var(--text-muted)'}}>{i+1}</td>
                          <td style={{color:'#fff', fontWeight:700}}>{toTitleCase(r.name)}</td>
                          <td style={{fontFamily:'monospace', fontSize:'11px', color:'var(--text-muted)'}}>{r.nik}</td>
                          <td style={{color:'var(--text-muted)'}}>{toTitleCase(r.position)}</td>
                          <td>{r.outlet ? <span style={{display:'inline-flex',alignItems:'center',gap:'4px',background:'rgba(99,102,241,0.15)',color:'#a5b4fc',padding:'3px 9px',borderRadius:'20px',fontSize:'0.75rem',fontWeight:600}}><Store size={10}/>{toTitleCase(r.outlet)}</span> : '-'}</td>
                          <td style={{textAlign:'center',fontWeight:800,color:'#22c55e'}}>{r.hadir}</td>
                          <td style={{textAlign:'center',fontWeight:800,color:'#f59e0b'}}>{r.terlambat}</td>
                          <td style={{textAlign:'center',fontWeight:800,color:'#3b82f6'}}>{r.setengaHari}</td>
                          <td style={{textAlign:'center',fontWeight:800,color:'#ef4444'}}>{r.absen}</td>
                          <td style={{textAlign:'center'}}>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent:'center' }}>
                              <div style={{ width:'50px', height:'6px', borderRadius:'3px', background:'rgba(255,255,255,0.1)', overflow:'hidden' }}>
                                <div style={{ width:`${r.pct}%`, height:'100%', background:pctColor, borderRadius:'3px', transition:'width 0.4s' }}/>
                              </div>
                              <span style={{ fontWeight:800, color:pctColor, fontSize:'0.8rem' }}>{r.pct}%</span>
                            </div>
                          </td>
                          <td style={{textAlign:'center',fontWeight:700,color:'var(--primary-solid)'}}>{r.jamKerja}</td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={12} style={{ padding:'0', background:'rgba(167,139,250,0.04)', borderBottom:'1px solid var(--border-color)' }}>
                              <div style={{ padding:'16px 24px' }}>
                                <p style={{ fontSize:'0.75rem', fontWeight:800, color:'#a78bfa', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'10px' }}>Detail Log — {toTitleCase(r.name)}</p>
                                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11.5px' }}>
                                  <thead>
                                    <tr style={{ background:'rgba(255,255,255,0.04)', borderRadius:'6px' }}>
                                      {['Tanggal','Status','Jam Masuk','Jam Keluar','Keterangan','Sumber'].map(h=>(
                                        <th key={h} style={{ padding:'6px 12px', textAlign:'left', color:'var(--text-muted)', fontWeight:700, fontSize:'0.72rem', textTransform:'uppercase' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r.logs.map((l,li)=>(
                                      <tr key={li} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                                        <td style={{padding:'6px 12px', fontWeight:600}}>{formatDate(l.date)}</td>
                                        <td style={{padding:'6px 12px'}}><StatusBadge status={l.status}/></td>
                                        <td style={{padding:'6px 12px', color:'var(--primary-solid)', fontWeight:600}}>{l.clockIn}</td>
                                        <td style={{padding:'6px 12px', color:'var(--text-muted)'}}>{l.clockOut}</td>
                                        <td style={{padding:'6px 12px', color:'var(--text-muted)', fontStyle:l.keterangan==='-'?'italic':'normal'}}>{l.keterangan}</td>
                                        <td style={{padding:'6px 12px'}}>
                                          <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', borderRadius:'20px', fontSize:'0.7rem', fontWeight:700, background:l.source==='realtime'?'rgba(0,173,181,0.12)':'rgba(34,197,94,0.1)', color:l.source==='realtime'?'#00ADB5':'#22c55e', border:`1px solid ${l.source==='realtime'?'rgba(0,173,181,0.3)':'rgba(34,197,94,0.3)'}` }}>
                                            {l.source === 'realtime' ? '⚡ Real Time' : '📜 Riwayat'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 4: JADWAL ISTIRAHAT (MANUAL)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'break_schedule' && (() => {
        // computed
        const filteredBsTable = bsTableData.filter(row => {
          if (!bsTableSearch) return true;
          const q = bsTableSearch.toLowerCase();
          return (row.full_name||'').toLowerCase().includes(q) ||
                 (row.nik||'').toLowerCase().includes(q) ||
                 (row.position||'').toLowerCase().includes(q);
        });

        const duration = addFormOutlet ? getRestDurationForOutlet(addFormOutlet) : 3;
        const numSess = duration === 2 ? 3 : 2;
        const sesiBadge = {
          1: { label: duration===2 ? 'Sesi 1 (12:00–14:00)' : 'Sesi 1 (12:00–15:00)', color: '#06b6d4' },
          2: { label: duration===2 ? 'Sesi 2 (14:00–16:00)' : 'Sesi 2 (15:00–18:00)', color: '#8b5cf6' },
          3: { label: 'Sesi 3 (16:00–18:00)', color: '#f59e0b' },
        };
        const warnings = getScheduleWarnings(addFormRows, addFormOutlet);

        return (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

            {/* ── Header & Tombol Tambah ── */}
            <div className="glass-card animate-fade-in" style={{ padding:'22px 28px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'rgba(245,158,11,0.12)', display:'flex', alignItems:'center', justifyContent:'center', color:'#f59e0b', flexShrink:0 }}>
                    <Clock size={22}/>
                  </div>
                  <div>
                    <h3 style={{ fontSize:'1.1rem', fontWeight:800, color:'#fff', margin:0 }}>JADWAL ISTIRAHAT HARIAN</h3>
                    <p style={{ fontSize:'0.79rem', color:'var(--text-muted)', margin:'2px 0 0' }}>Kelola jadwal sesi istirahat karyawan per outlet per hari</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAddScheduleModal(true); setAddFormOutlet(''); setAddFormRows([]); setAddFormErrors({}); setAddFormGlobalError(''); }}
                  style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', background:'linear-gradient(135deg,#f59e0b,#d97706)', border:'none', borderRadius:'10px', color:'#fff', fontWeight:700, fontSize:'0.88rem', cursor:'pointer', boxShadow:'0 4px 15px rgba(245,158,11,0.3)', transition:'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
                >
                  <Plus size={16}/> Tambah Jadwal
                </button>
              </div>

              {/* Filter Bar */}
              <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginTop:'18px' }}>
                <div style={{ position:'relative' }}>
                  <Calendar size={14} color="var(--text-muted)" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                  <input type="date" className="input-field" value={bsTableDate} onChange={e => setBsTableDate(e.target.value)}
                    style={{ paddingLeft:'32px', height:'38px', fontSize:'0.82rem', background:'var(--bg-main)', color:'#fff', minWidth:'155px' }}/>
                </div>
                <div style={{ position:'relative' }}>
                  <MapPin size={14} color="var(--text-muted)" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                  <select className="input-field" value={bsTableOutlet} onChange={e => setBsTableOutlet(e.target.value)}
                    style={{ paddingLeft:'30px', height:'38px', fontSize:'0.82rem', minWidth:'180px', background:'var(--bg-main)', color:'#fff' }}>
                    <option value="">🏪 Semua Outlet</option>
                    {availableOutlets.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
                  <Search size={14} color="var(--text-muted)" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                  <input type="text" className="input-field" placeholder="Cari nama / NIK / jabatan..." value={bsTableSearch} onChange={e => setBsTableSearch(e.target.value)}
                    style={{ paddingLeft:'32px', height:'38px', fontSize:'0.82rem', background:'var(--bg-main)', color:'#fff', width:'100%' }}/>
                </div>
                <button onClick={() => fetchBsTableData(bsTableDate, bsTableOutlet)}
                  style={{ height:'38px', padding:'0 16px', background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'8px', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontSize:'0.82rem' }}>
                  <RefreshCw size={14}/> Refresh
                </button>
              </div>
            </div>

            {/* ── Tabel Rekap Jadwal ── */}
            <div className="glass-card animate-fade-in" style={{ padding:'0', overflow:'hidden' }}>
              {bsTableLoading ? (
                <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)', fontSize:'0.9rem' }}>
                  <div className="spinner" style={{ width:'32px', height:'32px', margin:'0 auto 12px' }}/>
                  Memuat data jadwal...
                </div>
              ) : filteredBsTable.length === 0 ? (
                <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)', fontSize:'0.88rem' }}>
                  <Clock size={40} style={{ opacity:0.25, marginBottom:'12px', display:'block', margin:'0 auto 12px' }}/>
                  <p style={{ margin:0 }}>Belum ada jadwal istirahat pada tanggal ini.</p>
                  <p style={{ margin:'4px 0 0', fontSize:'0.78rem' }}>Klik <strong style={{color:'#f59e0b'}}>+ Tambah Jadwal</strong> untuk membuat jadwal baru.</p>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.84rem' }}>
                    <thead>
                      <tr style={{ background:'rgba(255,255,255,0.03)', borderBottom:'1px solid var(--border-color)' }}>
                        {['NO','NAMA KARYAWAN','NIK','JABATAN','SESI','JAM MULAI','JAM SELESAI','DURASI','AKSI'].map(h => (
                          <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBsTable.map((row, i) => {
                        const sesiLabel = row.sesi === 1 ? (duration===2 ? '12:00–14:00' : '12:00–15:00') : row.sesi === 2 ? (duration===2 ? '14:00–16:00' : '15:00–18:00') : '16:00–18:00';
                        const sesiColor = row.sesi === 1 ? '#06b6d4' : row.sesi === 2 ? '#8b5cf6' : '#f59e0b';
                        const durMins = (() => { try { const s=row.jam_mulai.split(':'), e=row.jam_selesai.split(':'); const sm=parseInt(s[0])*60+parseInt(s[1]), em=parseInt(e[0])*60+parseInt(e[1]); return em-sm; } catch{return 0;} })();
                        return (
                          <tr key={row.id || i} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'11px 14px', color:'var(--text-muted)', fontSize:'0.75rem' }}>{i+1}</td>
                            <td style={{ padding:'11px 14px', fontWeight:600, color:'#fff' }}>{toTitleCase(row.full_name||'-')}</td>
                            <td style={{ padding:'11px 14px', color:'var(--text-muted)', fontFamily:'monospace', fontSize:'0.8rem' }}>{row.nik||'-'}</td>
                            <td style={{ padding:'11px 14px', color:'var(--text-muted)' }}>{row.position||'-'}</td>
                            <td style={{ padding:'11px 14px' }}>
                              <span style={{ padding:'3px 10px', borderRadius:'20px', background:`${sesiColor}22`, color:sesiColor, fontSize:'0.73rem', fontWeight:700, border:`1px solid ${sesiColor}44` }}>
                                Sesi {row.sesi}
                              </span>
                            </td>
                            <td style={{ padding:'11px 14px', color:'#6ee7b7', fontWeight:600 }}>{row.jam_mulai||'-'}</td>
                            <td style={{ padding:'11px 14px', color:'#fca5a5', fontWeight:600 }}>{row.jam_selesai||'-'}</td>
                            <td style={{ padding:'11px 14px', color:'var(--text-muted)' }}>{durMins > 0 ? `${durMins} menit` : '-'}</td>
                            <td style={{ padding:'11px 14px' }}>
                              <button onClick={() => handleDeleteBsRow(row.id)}
                                style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', padding:'5px 9px', borderRadius:'7px', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px', fontSize:'0.75rem', transition:'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.2)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; }}>
                                <Trash2 size={12}/> Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border-color)', color:'var(--text-muted)', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
                    <span>Total: <strong style={{color:'#fff'}}>{filteredBsTable.length}</strong> karyawan terjadwal</span>
                    {[1,2,3].filter(s => filteredBsTable.some(r => r.sesi===s)).map(s => (
                      <span key={s} style={{ color:[,'#06b6d4','#8b5cf6','#f59e0b'][s] }}>
                        Sesi {s}: <strong>{filteredBsTable.filter(r=>r.sesi===s).length}</strong> orang
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════
                MODAL: TAMBAH JADWAL MANUAL
            ═══════════════════════════════════════════════════════ */}
            {showAddScheduleModal && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
                onClick={e => { if(e.target===e.currentTarget){ setShowAddScheduleModal(false); setShowReviewModal(false); } }}>
                <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'18px', width:'100%', maxWidth:'820px', maxHeight:'90vh', overflowY:'auto', padding:'28px', position:'relative' }}>

                  {!showReviewModal ? (
                    <>
                      {/* Header Form */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'rgba(245,158,11,0.12)', display:'flex', alignItems:'center', justifyContent:'center', color:'#f59e0b' }}><Plus size={18}/></div>
                          <div>
                            <h3 style={{ margin:0, fontSize:'1rem', fontWeight:800, color:'#fff' }}>Tambah Jadwal Istirahat</h3>
                            <p style={{ margin:0, fontSize:'0.76rem', color:'var(--text-muted)' }}>Pilih tanggal & outlet, lalu atur sesi setiap karyawan</p>
                          </div>
                        </div>
                        <button onClick={() => { setShowAddScheduleModal(false); setShowReviewModal(false); }}
                          style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px', borderRadius:'6px' }}>
                          <X size={20}/>
                        </button>
                      </div>

                      {/* Tanggal & Outlet */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'20px' }}>
                        <div>
                          <label style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontWeight:600, display:'block', marginBottom:'6px' }}>Tanggal <span style={{color:'#ef4444'}}>*</span></label>
                          <input type="date" className="input-field" value={addFormDate} onChange={e => handleAddFormDateChange(e.target.value)}
                            style={{ width:'100%', height:'40px', fontSize:'0.85rem', background:'var(--bg-main)', color:'#fff' }}/>
                        </div>
                        <div>
                          <label style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontWeight:600, display:'block', marginBottom:'6px' }}>Outlet <span style={{color:'#ef4444'}}>*</span></label>
                          <select className="input-field" value={addFormOutlet} onChange={e => handleAddFormOutletChange(e.target.value)}
                            style={{ width:'100%', height:'40px', fontSize:'0.85rem', background:'var(--bg-main)', color:'#fff' }}>
                            <option value="">— Pilih Outlet —</option>
                            {availableOutlets.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Info Kebijakan Sesi */}
                      {addFormOutlet && (
                        <div style={{ background:'rgba(6,182,212,0.07)', border:'1px solid rgba(6,182,212,0.2)', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', display:'flex', gap:'16px', flexWrap:'wrap' }}>
                          <span style={{ fontSize:'0.79rem', color:'#67e8f9' }}>⏱ Durasi Outlet: <strong>{duration} Jam</strong> → <strong>{numSess} Sesi</strong></span>
                          {[1,2,3].slice(0,numSess).map(s => (
                            <span key={s} style={{ fontSize:'0.79rem', color:sesiBadge[s].color }}>
                              🕐 {sesiBadge[s].label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Loading karyawan */}
                      {addFormOutletLoading && (
                        <div style={{ textAlign:'center', padding:'30px', color:'var(--text-muted)', fontSize:'0.85rem' }}>
                          <div className="spinner" style={{ width:'24px', height:'24px', margin:'0 auto 8px' }}/>
                          Memuat daftar karyawan...
                        </div>
                      )}

                      {/* Global Error */}
                      {addFormGlobalError && (
                        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'8px', padding:'10px 14px', marginBottom:'14px', color:'#fca5a5', fontSize:'0.82rem', display:'flex', alignItems:'center', gap:'8px' }}>
                          <AlertCircle size={15}/> {addFormGlobalError}
                        </div>
                      )}

                      {/* Warnings */}
                      {warnings.length > 0 && (
                        <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:'10px', padding:'12px 16px', marginBottom:'14px' }}>
                          <p style={{ margin:'0 0 6px', fontSize:'0.78rem', fontWeight:700, color:'#fbbf24' }}>⚠️ Peringatan Distribusi Sesi:</p>
                          {warnings.map((w,i) => <p key={i} style={{ margin:'3px 0 0', fontSize:'0.78rem', color:'#fbbf24' }}>{w}</p>)}
                        </div>
                      )}

                      {/* Tabel Karyawan */}
                      {!addFormOutletLoading && addFormRows.length > 0 && (
                        <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid var(--border-color)' }}>
                          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                            <thead>
                              <tr style={{ background:'rgba(255,255,255,0.04)', borderBottom:'1px solid var(--border-color)' }}>
                                {['NO','NAMA KARYAWAN','NIK','JABATAN','GENDER','SESI ISTIRAHAT'].map(h => (
                                  <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {addFormRows.map((r, idx) => (
                                <tr key={r.employee_id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', background: addFormErrors[r.employee_id] ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                                  <td style={{ padding:'9px 12px', color:'var(--text-muted)', fontSize:'0.75rem' }}>{idx+1}</td>
                                  <td style={{ padding:'9px 12px', fontWeight:600, color:'#fff' }}>{toTitleCase(r.full_name||'-')}</td>
                                  <td style={{ padding:'9px 12px', color:'var(--text-muted)', fontFamily:'monospace', fontSize:'0.78rem' }}>{r.nik||'-'}</td>
                                  <td style={{ padding:'9px 12px', color:'var(--text-muted)', fontSize:'0.78rem' }}>{r.position||'-'}</td>
                                  <td style={{ padding:'9px 12px' }}>
                                    <span style={{ fontSize:'0.72rem', padding:'2px 8px', borderRadius:'20px',
                                      background: (r.gender||'').toLowerCase()==='wanita' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)',
                                      color: (r.gender||'').toLowerCase()==='wanita' ? '#f9a8d4' : '#93c5fd',
                                      border: `1px solid ${(r.gender||'').toLowerCase()==='wanita' ? 'rgba(236,72,153,0.3)' : 'rgba(59,130,246,0.3)'}` }}>
                                      {(r.gender||'').toLowerCase()==='wanita' ? '♀ Wanita' : '♂ Pria'}
                                    </span>
                                  </td>
                                  <td style={{ padding:'9px 12px' }}>
                                    <select value={r.sesi}
                                      onChange={e => handleAddFormSesiChange(r.employee_id, parseInt(e.target.value,10))}
                                      style={{ height:'34px', padding:'0 10px', borderRadius:'7px', border:`1px solid ${addFormErrors[r.employee_id] ? '#ef4444' : 'var(--border-color)'}`, background:'var(--bg-main)', color:'#fff', fontSize:'0.82rem', cursor:'pointer', outline:'none' }}>
                                      {[1,2,3].slice(0,numSess).map(s => (
                                        <option key={s} value={s}>{sesiBadge[s].label}</option>
                                      ))}
                                    </select>
                                    {addFormErrors[r.employee_id] && (
                                      <p style={{ margin:'2px 0 0', fontSize:'0.7rem', color:'#ef4444' }}>{addFormErrors[r.employee_id]}</p>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tombol Lanjut Review */}
                      {!addFormOutletLoading && addFormRows.length > 0 && (
                        <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'20px' }}>
                          <button onClick={() => { setShowAddScheduleModal(false); setShowReviewModal(false); }}
                            style={{ padding:'10px 20px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'9px', color:'var(--text-muted)', cursor:'pointer', fontSize:'0.84rem' }}>
                            Batal
                          </button>
                          <button onClick={handleSubmitAddForm}
                            style={{ padding:'10px 24px', background:'linear-gradient(135deg,#f59e0b,#d97706)', border:'none', borderRadius:'9px', color:'#fff', fontWeight:700, fontSize:'0.86rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', boxShadow:'0 4px 14px rgba(245,158,11,0.3)' }}>
                            <Eye size={15}/> Review Jadwal
                          </button>
                        </div>
                      )}

                      {!addFormOutletLoading && !addFormOutlet && (
                        <div style={{ textAlign:'center', padding:'30px', color:'var(--text-muted)', fontSize:'0.84rem' }}>
                          Pilih outlet terlebih dahulu untuk memuat daftar karyawan.
                        </div>
                      )}
                    </>

                  ) : (
                    /* ─── REVIEW SCREEN ─── */
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'rgba(34,197,94,0.12)', display:'flex', alignItems:'center', justifyContent:'center', color:'#22c55e' }}><CheckCircle size={18}/></div>
                          <div>
                            <h3 style={{ margin:0, fontSize:'1rem', fontWeight:800, color:'#fff' }}>Review Jadwal Istirahat</h3>
                            <p style={{ margin:0, fontSize:'0.76rem', color:'var(--text-muted)' }}>Periksa kembali sebelum dikirim ke server</p>
                          </div>
                        </div>
                        <button onClick={() => setShowReviewModal(false)}
                          style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px', borderRadius:'6px' }}>
                          <ChevronLeft size={20}/>
                        </button>
                      </div>

                      {/* Info Summary */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px', marginBottom:'18px' }}>
                        {[
                          { label:'Tanggal', value: addFormDate, color:'#06b6d4' },
                          { label:'Outlet', value: addFormOutlet, color:'#f59e0b' },
                          { label:'Total Karyawan', value: `${addFormRows.length} orang`, color:'#22c55e' },
                          { label:'Durasi Sesi', value: `${duration} jam / sesi`, color:'#8b5cf6' },
                        ].map(card => (
                          <div key={card.label} style={{ background:'var(--bg-main)', border:`1px solid ${card.color}33`, borderRadius:'10px', padding:'12px 14px' }}>
                            <p style={{ margin:0, fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:600 }}>{card.label}</p>
                            <p style={{ margin:'4px 0 0', fontSize:'0.9rem', color:card.color, fontWeight:700 }}>{card.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Warnings sebelum kirim */}
                      {warnings.length > 0 && (
                        <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:'10px', padding:'12px 16px', marginBottom:'14px' }}>
                          <p style={{ margin:'0 0 6px', fontSize:'0.78rem', fontWeight:700, color:'#fbbf24' }}>⚠️ Peringatan — Jadwal tetap bisa dikirim:</p>
                          {warnings.map((w,i) => <p key={i} style={{ margin:'3px 0 0', fontSize:'0.78rem', color:'#fbbf24' }}>{w}</p>)}
                        </div>
                      )}

                      {/* Preview per sesi */}
                      {[1,2,3].slice(0,numSess).map(s => {
                        const group = addFormRows.filter(r => r.sesi === s);
                        if (group.length === 0) return null;
                        return (
                          <div key={s} style={{ marginBottom:'14px', background:'var(--bg-main)', border:`1px solid ${sesiBadge[s].color}33`, borderRadius:'12px', overflow:'hidden' }}>
                            <div style={{ padding:'10px 16px', background:`${sesiBadge[s].color}11`, borderBottom:`1px solid ${sesiBadge[s].color}22`, display:'flex', alignItems:'center', gap:'10px' }}>
                              <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:sesiBadge[s].color, display:'inline-block' }}/>
                              <span style={{ fontSize:'0.82rem', fontWeight:700, color:sesiBadge[s].color }}>{sesiBadge[s].label} — {group.length} karyawan</span>
                            </div>
                            <div style={{ padding:'10px 16px', display:'flex', flexWrap:'wrap', gap:'8px' }}>
                              {group.map(r => (
                                <span key={r.employee_id} style={{ padding:'4px 10px', background:'rgba(255,255,255,0.06)', border:'1px solid var(--border-color)', borderRadius:'20px', fontSize:'0.78rem', color:'#fff' }}>
                                  {toTitleCase(r.full_name)} {(r.gender||'').toLowerCase()==='wanita' ? '♀' : '♂'}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Tombol Kirim */}
                      <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'20px' }}>
                        <button onClick={() => setShowReviewModal(false)}
                          style={{ padding:'10px 20px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'9px', color:'var(--text-muted)', cursor:'pointer', fontSize:'0.84rem' }}>
                          ← Kembali Edit
                        </button>
                        <button onClick={handleConfirmSend} disabled={isSyncingSchedule}
                          style={{ padding:'10px 28px', background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', borderRadius:'9px', color:'#fff', fontWeight:700, fontSize:'0.86rem', cursor: isSyncingSchedule ? 'not-allowed':'pointer', display:'flex', alignItems:'center', gap:'8px', opacity: isSyncingSchedule ? 0.7 : 1, boxShadow:'0 4px 14px rgba(34,197,94,0.3)' }}>
                          {isSyncingSchedule ? <><div className="spinner" style={{width:'15px',height:'15px',borderTopColor:'#fff'}}/> Mengirim...</> : <><CheckCircle size={15}/> Kirim Jadwal</>}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {activeSubTab === 'break_eval' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

          {/* Eval Summary Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'16px' }}>
            {[
              { label:'Total Dievaluasi', value:breakSummary.length, color:'#94a3b8', icon:<Users size={20}/> },
              { label:'Kena Denda', value:kenaDedan, color:'#ef4444', icon:<AlertTriangle size={20}/> },
              { label:'Bebas Denda', value:breakSummary.length-kenaDedan, color:'#22c55e', icon:<CheckCircle size={20}/> },
              { label:'Total Estimasi Denda', value:`Rp ${totalDenda.toLocaleString('id-ID')}`, color:'#f59e0b', icon:<TrendingDown size={20}/> },
            ].map((c,i)=>(
              <div key={i} style={{ background:'var(--bg-card)', border:`1px solid ${c.color}25`, borderRadius:'14px', padding:'20px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:`0 4px 20px ${c.color}15` }}>
                <div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px' }}>{c.label}</div>
                  <div style={{ fontSize:i===3?'1.1rem':'1.7rem', fontWeight:800, color:c.color }}>{c.value}</div>
                </div>
                <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:`${c.color}15`, display:'flex', alignItems:'center', justifyContent:'center', color:c.color }}>{c.icon}</div>
              </div>
            ))}
          </div>

          {/* Eval Table Card */}
          <div className="glass-card animate-fade-in" style={{ padding:'28px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'42px', height:'42px', borderRadius:'10px', background:'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#ef4444' }}><TrendingDown size={20}/></div>
                <div>
                  <h3 style={{ fontSize:'1.1rem', fontWeight:800, color:'#fff', margin:0 }}>EVALUASI & DENDA ISTIRAHAT</h3>
                  <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:0 }}>Toleransi: 15 Poin | Denda: Rp 1.000/Poin kelebihan</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <div style={{ display:'flex', gap:'8px', borderBottom:'1px solid var(--border-color)', paddingBottom:'0', alignItems:'flex-end' }}>
                  {['summary','detail'].map(t=>(
                    <button key={t} onClick={()=>setBreakTab(t)} style={{ padding:'8px 16px', background:breakTab===t?'var(--primary-glow)':'transparent', border:`1px solid ${breakTab===t?'var(--primary-solid)':'var(--border-color)'}`, borderRadius:'8px', color:breakTab===t?'var(--primary-solid)':'var(--text-muted)', fontWeight:breakTab===t?800:500, fontSize:'0.82rem', cursor:'pointer' }}>
                      {t==='summary'?'📋 Ringkasan Denda':'📄 Detail Log'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Eval Filters */}
            <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap', marginBottom:'20px' }}>
              <FilterBar 
                outlet={outletEval} 
                setOutlet={setOutletEval} 
                month={monthEval} 
                setMonth={setMonthEval} 
                year={yearEval} 
                setYear={setYearEval}
                extra={
                  <div style={{ position:'relative' }}>
                    <Users size={14} color="var(--text-muted)" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
                    <select className="input-field" value={empEvalFilter} onChange={e=>setEmpEvalFilter(e.target.value)}
                      style={{ paddingLeft:'30px', height:'38px', fontSize:'0.82rem', minWidth:'180px', background:'var(--bg-main)', color:'#fff' }}>
                      <option value="">👤 Semua Karyawan</option>
                      {filteredEmployeesForEval.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                  </div>
                }
              />
            </div>

            {breakTab === 'summary' ? (
              <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid var(--border-color)' }}>
                <table className="data-table" style={{ fontSize:'12px', minWidth:'800px' }}>
                  <thead>
                    <tr>
                      <th>No</th><th>Nama Karyawan</th><th>NIK</th><th>Outlet</th>
                      <th style={{textAlign:'center'}}>Hari Dicatat</th>
                      <th style={{textAlign:'center'}}>Total Poin</th>
                      <th style={{textAlign:'center'}}>Toleransi</th>
                      <th style={{textAlign:'center'}}>Poin Kena Denda</th>
                      <th style={{textAlign:'center'}}>Estimasi Denda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakSummary.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--text-muted)', padding:'48px' }}>Tidak ada data istirahat di periode & outlet yang dipilih.</td></tr>
                    ) : breakSummary.map((item,idx)=>(
                      <tr key={idx} style={{ background:item.denda>0?'rgba(239,68,68,0.04)':'transparent' }}>
                        <td>{idx+1}</td>
                        <td style={{color:'#fff',fontWeight:700}}>{toTitleCase(item.name)}</td>
                        <td style={{fontFamily:'monospace',fontSize:'11px'}}>{item.nik}</td>
                        <td style={{color:'var(--text-muted)'}}>{toTitleCase(item.outlet)}</td>
                        <td style={{textAlign:'center'}}>{item.totalDays} hari</td>
                        <td style={{textAlign:'center',fontWeight:700,color:item.totalPoints>15?'#f59e0b':'var(--text-muted)'}}>{item.totalPoints} poin</td>
                        <td style={{textAlign:'center',color:'#22c55e',fontWeight:600}}>15 poin</td>
                        <td style={{textAlign:'center',fontWeight:800,color:item.excessPoints>0?'#ef4444':'var(--text-muted)'}}>{item.excessPoints} poin</td>
                        <td style={{textAlign:'center',fontWeight:800,color:item.denda>0?'#ef4444':'var(--text-muted)'}}>
                          {item.denda>0 ? <span style={{ padding:'3px 10px', borderRadius:'20px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', fontSize:'0.8rem' }}>Rp {item.denda.toLocaleString('id-ID')}</span> : 'Rp 0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid var(--border-color)' }}>
                <table className="data-table" style={{ fontSize:'12px', minWidth:'850px' }}>
                  <thead>
                    <tr>
                      <th>No</th><th>Tanggal</th><th>Nama Karyawan</th><th>Outlet</th>
                      <th>Istirahat Riil</th><th style={{textAlign:'center'}}>Durasi Riil</th>
                      <th style={{textAlign:'center'}}>Kebijakan</th>
                      <th style={{textAlign:'center'}}>Poin (Menit Lebih)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEval.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--text-muted)', padding:'48px' }}>Tidak ada log istirahat di periode & outlet ini.</td></tr>
                    ) : filteredEval.map((log,idx)=>{
                      const overage = calculateBreakOverage(log);
                      const displayOutlet = resolveOutlet(log);
                      const officialMin = getOfficialBreakDuration(displayOutlet);
                      let s = parseToMinutes(log.jam_mulai_istirahat), e = parseToMinutes(log.jam_akhir_istirahat);
                      if (e<s) e+=1440;
                      const actualMin = e-s;
                      return (
                        <tr key={idx} style={{ background:overage>0?'rgba(239,68,68,0.03)':'transparent' }}>
                          <td>{idx+1}</td>
                          <td style={{fontWeight:600}}>{formatDate(log.date)}</td>
                          <td style={{color:'#fff',fontWeight:700}}>{toTitleCase(log.full_name||log.nama_karyawan)}</td>
                          <td style={{color:'var(--text-muted)'}}>{toTitleCase(displayOutlet)}</td>
                          <td style={{color:'var(--primary-solid)',fontWeight:600,fontFamily:'monospace'}}>{log.jam_mulai_istirahat} – {log.jam_akhir_istirahat}</td>
                          <td style={{textAlign:'center'}}><span style={{color:actualMin>officialMin?'#f59e0b':'var(--text-muted)',fontWeight:600}}>{actualMin}m ({Math.floor(actualMin/60)}j {actualMin%60}m)</span></td>
                          <td style={{textAlign:'center',color:'#22c55e'}}>{officialMin}m ({officialMin/60}j)</td>
                          <td style={{textAlign:'center',fontWeight:800,color:overage>0?'#ef4444':'var(--text-muted)'}}>
                            {overage>0?<span style={{padding:'2px 10px',borderRadius:'20px',background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.3)'}}>+{overage} poin</span>:'0 poin'}
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
      )}
      {/* ══════════════════════════════════════════════════════════════════════
          TAB 6: MASTER HARI SIBUK (PEAK DAY)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'peak_days' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          {/* Peak Days Table Card */}
          <div className="glass-card animate-fade-in" style={{ padding:'28px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'42px', height:'42px', borderRadius:'10px', background:'rgba(165,180,252,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#818cf8' }}><Calendar size={20}/></div>
                <div>
                  <h3 style={{ fontSize:'1.1rem', fontWeight:800, color:'#fff', margin:0 }}>MASTER HARI SIBUK (PEAK DAY)</h3>
                  <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:0 }}>Daftar tanggal sibuk nasional dengan tarif denda libur khusus Rp250.000.</p>
                </div>
              </div>
              <button
                onClick={() => setShowPeakDayModal(true)}
                className="btn-primary"
                style={{
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 16px',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}
              >
                <Plus size={16}/><span>Tambah Hari Sibuk</span>
              </button>
            </div>

            <div style={{ overflowX:'auto', borderRadius:'10px', border:'1px solid var(--border-color)' }}>
              <table className="data-table" style={{ fontSize:'12px', minWidth:'800px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                    <th>Tanggal Peak Day</th>
                    <th>Nama Hari Sibuk / Deskripsi</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody style={{
                  opacity: peakDayTransition ? 0 : 1,
                  transform: peakDayTransition ? 'scale(0.99)' : 'scale(1)',
                  transition: 'opacity 0.4s ease-in-out, transform 0.3s ease'
                }}>
                  {(() => {
                    const limit = 10;
                    const offset = (peakDayPage - 1) * limit;
                    const pageRows = peakDays.slice(offset, offset + limit);

                    if (peakDays.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            📭 Belum ada tanggal Peak Day yang didaftarkan.
                          </td>
                        </tr>
                      );
                    }

                    return pageRows.map((p, idx) => {
                      const displayDate = `${p.tanggal.toString().padStart(2, '0')}/${p.bulan.toString().padStart(2, '0')}/${p.tahun}`;
                      return (
                        <tr key={p.id || idx}>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                            {offset + idx + 1}
                          </td>
                          <td style={{ fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                            {displayDate}
                          </td>
                          <td style={{ color: '#fff' }}>
                            {p.nama_peak_day}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => handleDeletePeakDay(p.id)}
                              style={{
                                background: 'rgba(239,68,68,0.15)',
                                color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = '#ef4444';
                                e.currentTarget.style.color = '#fff';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                                e.currentTarget.style.color = '#ef4444';
                              }}
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {peakDays.length > 10 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                gap: '16px',
                flexWrap: 'wrap',
                marginTop: '16px'
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Menampilkan {((peakDayPage - 1) * 10) + 1}-{Math.min(peakDayPage * 10, peakDays.length)} dari {peakDays.length} Peak Day
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPeakDayTransition(true);
                      setTimeout(() => {
                        setPeakDayPage(p => Math.max(p - 1, 1));
                        setPeakDayTransition(false);
                      }, 150);
                    }}
                    disabled={peakDayPage === 1}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: peakDayPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: peakDayPage === 1 ? 0.4 : 1,
                      fontSize: '0.85rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    Sebelumnya
                  </button>
                  {Array.from({ length: Math.ceil(peakDays.length / 10) }, (_, i) => i + 1).map(p => {
                    const isActive = p === peakDayPage;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPeakDayTransition(true);
                          setTimeout(() => {
                            setPeakDayPage(p);
                            setPeakDayTransition(false);
                          }, 150);
                        }}
                        style={{
                          background: isActive ? 'var(--text-main)' : 'transparent',
                          color: isActive ? 'var(--bg-surface)' : 'var(--text-main)',
                          border: `1px solid ${isActive ? 'var(--text-main)' : 'var(--border-color)'}`,
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: isActive ? '700' : '500',
                          fontSize: '0.85rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setPeakDayTransition(true);
                      setTimeout(() => {
                        setPeakDayPage(p => Math.min(p + 1, Math.ceil(peakDays.length / 10)));
                        setPeakDayTransition(false);
                      }, 150);
                    }}
                    disabled={peakDayPage === Math.ceil(peakDays.length / 10)}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: peakDayPage === Math.ceil(peakDays.length / 10) ? 'not-allowed' : 'pointer',
                      opacity: peakDayPage === Math.ceil(peakDays.length / 10) ? 0.4 : 1,
                      fontSize: '0.85rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Realtime Form Modal */}
      {showRealtimeModal && (
        <div className="modal-backdrop">
          <div className="glass-card modal-content animate-fade-in" style={{ maxWidth:'580px', width:'92%' }}>
            <div className="modal-header">
              <h2>{editingRealtimeId?'Ubah Kehadiran Real Time':'Tambahkan Kehadiran Real Time'}</h2>
              <button onClick={()=>setShowRealtimeModal(false)} style={{ background:'transparent', border:'none', color:'#fff', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleRealtimeSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px', textAlign:'left' }}>
              <div className="input-group">
                <label>Pilih Karyawan</label>
                <select className="input-field" value={selectedEmpIdRealtime} onChange={e=>setSelectedEmpIdRealtime(e.target.value)} required disabled={!!editingRealtimeId} style={{ background:'var(--bg-main)', color:'#fff' }}>
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.full_name} ({e.nik||'-'} - {e.outlet||'-'})</option>)}
                </select>
              </div>
              <div className="input-group">
                <label style={{ display:'flex', alignItems:'center', gap:'6px' }}><MapPin size={13} color="#ff62bc"/>Nama Outlet <span style={{color:'#f43f5e'}}>*</span></label>
                <div style={{ position:'relative' }}>
                  <Store size={14} color={realtimeOutlet?'var(--primary-solid)':'var(--text-muted)'} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                  <select className="input-field" value={realtimeOutlet} onChange={e=>setRealtimeOutlet(e.target.value)} style={{ paddingLeft:'32px', background:'var(--bg-main)', color:realtimeOutlet?'#fff':'var(--text-muted)', border:!realtimeOutlet?'1px solid rgba(244,63,94,0.55)':'1px solid var(--border-color)' }}>
                    <option value="" disabled>🏪 -- Pilih Outlet --</option>
                    {availableOutlets.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {selectedEmpIdRealtime && (() => { const ef=employees.find(e=>String(e.id)===String(selectedEmpIdRealtime)); if(ef?.outlet && ef.outlet.trim().toUpperCase()!==realtimeOutlet) return <button type="button" onClick={()=>setRealtimeOutlet(ef.outlet.trim().toUpperCase())} style={{ marginTop:'6px', background:'rgba(255,98,188,0.1)', border:'1px solid rgba(255,98,188,0.3)', color:'#ff62bc', borderRadius:'6px', padding:'4px 12px', fontSize:'0.72rem', cursor:'pointer', fontWeight:700 }}>⚡ Gunakan outlet karyawan: {ef.outlet}</button>; return null; })()}
              </div>
              <div className="input-group">
                <label>Tanggal</label>
                <input type="date" className="input-field" value={realtimeDate} onChange={e=>setRealtimeDate(e.target.value)} required/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div className="input-group"><label>Jam Masuk</label><input type="text" className="input-field" value={realtimeCustomIn} onChange={e=>setRealtimeCustomIn(e.target.value)} placeholder="10:00" required/></div>
                <div className="input-group"><label>Jam Pulang</label><input type="text" className="input-field" value={realtimeCustomOut} onChange={e=>setRealtimeCustomOut(e.target.value)} placeholder="22:30" required/></div>
                <div className="input-group"><label>Mulai Istirahat</label><input type="text" className="input-field" value={realtimeCustomStartBreak} onChange={e=>setRealtimeCustomStartBreak(e.target.value)} placeholder="15:00"/></div>
                <div className="input-group"><label>Akhir Istirahat</label><input type="text" className="input-field" value={realtimeCustomEndBreak} onChange={e=>setRealtimeCustomEndBreak(e.target.value)} placeholder="17:00"/></div>
              </div>
              <div className="input-group">
                <label>Status Kehadiran</label>
                <select className="input-field" value={realtimeStatus} onChange={e=>setRealtimeStatus(e.target.value)} style={{ background:'var(--bg-main)', color:'#fff' }}>
                  <option value="hadir">Hadir</option>
                  <option value="terlambat">Terlambat</option>
                  <option value="setengah hari">Setengah Hari</option>
                  <option value="absen">Absen</option>
                </select>
              </div>
              <div className="input-group">
                <label>Ikut Briefing?</label>
                <select className="input-field" value={realtimeBriefing} onChange={e=>setRealtimeBriefing(e.target.value)} style={{ background:'var(--bg-main)', color:'#fff' }}>
                  <option value="Tidak">Tidak</option>
                  <option value="Ya">Ya</option>
                </select>
              </div>
              <div className="input-group"><label>Keterangan</label><textarea className="input-field" rows="2" value={realtimeNotes} onChange={e=>setRealtimeNotes(e.target.value)} placeholder="Opsional..."/></div>
              <div style={{ display:'flex', gap:'10px', marginTop:'6px' }}>
                <button type="submit" className="btn-primary" style={{ flex:1, justifyContent:'center' }}>Simpan Kehadiran</button>
                <button type="button" className="btn-secondary" onClick={()=>setShowRealtimeModal(false)} style={{ flex:1 }}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Form Modal */}
      {showHistoryModal && (
        <div className="modal-backdrop">
          <div className="glass-card modal-content animate-fade-in" style={{ maxWidth:'520px', width:'90%' }}>
            <div className="modal-header">
              <h2>{editingHistoryId?'Ubah Riwayat Kehadiran':'Tambahkan Riwayat Kehadiran'}</h2>
              <button onClick={()=>setShowHistoryModal(false)} style={{ background:'transparent', border:'none', color:'#fff', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleHistorySubmit} style={{ display:'flex', flexDirection:'column', gap:'14px', textAlign:'left' }}>
              <div className="input-group">
                <label>Pilih Karyawan</label>
                <select className="input-field" value={selectedEmpIdHistory} onChange={e=>setSelectedEmpIdHistory(e.target.value)} required disabled={!!editingHistoryId} style={{ background:'var(--bg-main)', color:'#fff' }}>
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.full_name} ({e.nik||'-'} - {e.position||'-'})</option>)}
                </select>
              </div>
              <div className="input-group">
                <label style={{ display:'flex', alignItems:'center', gap:'6px' }}><Store size={13} color="#a5b4fc"/>Outlet <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginLeft:'auto' }}>Opsional</span></label>
                <div style={{ position:'relative' }}>
                  <MapPin size={14} color="var(--text-muted)" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                  <select className="input-field" value={historyOutletForm} onChange={e=>setHistoryOutletForm(e.target.value)} style={{ paddingLeft:'32px', background:'var(--bg-main)', color:'#fff' }}>
                    <option value="">🏪 -- Pilih Outlet (Opsional) --</option>
                    {availableOutlets.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {selectedEmpIdHistory && (() => { const ef=employees.find(e=>String(e.id)===String(selectedEmpIdHistory)); if(ef?.outlet && ef.outlet.trim().toUpperCase()!==historyOutletForm) return <button type="button" onClick={()=>setHistoryOutletForm(ef.outlet.trim().toUpperCase())} style={{ marginTop:'6px', background:'rgba(165,180,252,0.1)', border:'1px solid rgba(165,180,252,0.3)', color:'#a5b4fc', borderRadius:'6px', padding:'4px 12px', fontSize:'0.72rem', cursor:'pointer', fontWeight:700 }}>⚡ Gunakan outlet karyawan: {ef.outlet}</button>; return null; })()}
              </div>
              <div className="input-group"><label>Tanggal</label><input type="date" className="input-field" value={historyDate} onChange={e=>setHistoryDate(e.target.value)} required/></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div className="input-group"><label>Jam Masuk</label><input type="text" className="input-field" value={historyClockIn} onChange={e=>setHistoryClockIn(e.target.value)} placeholder="08:00:00" required/></div>
                <div className="input-group"><label>Jam Keluar</label><input type="text" className="input-field" value={historyClockOut} onChange={e=>setHistoryClockOut(e.target.value)} placeholder="17:00:00" required/></div>
                <div className="input-group"><label>Mulai Istirahat</label><input type="text" className="input-field" value={historyStartBreak} onChange={e=>setHistoryStartBreak(e.target.value)} placeholder="12:00"/></div>
                <div className="input-group"><label>Akhir Istirahat</label><input type="text" className="input-field" value={historyEndBreak} onChange={e=>setHistoryEndBreak(e.target.value)} placeholder="14:00"/></div>
              </div>
              <div className="input-group">
                <label>Status Masuk</label>
                <select className="input-field" value={historyStatusIn} onChange={e=>setHistoryStatusIn(e.target.value)} style={{ background:'var(--bg-main)', color:'#fff' }}>
                  <option value="ontime">Tepat Waktu</option>
                  <option value="late">Terlambat</option>
                </select>
              </div>
              <div className="input-group">
                <label>Ikut Briefing?</label>
                <select className="input-field" value={historyBriefing} onChange={e=>setHistoryBriefing(e.target.value)} style={{ background:'var(--bg-main)', color:'#fff' }}>
                  <option value="Tidak">Tidak</option>
                  <option value="Ya">Ya</option>
                </select>
              </div>
              <div className="input-group"><label>Catatan</label><textarea className="input-field" rows="2" value={historyNotes} onChange={e=>setHistoryNotes(e.target.value)} placeholder="Opsional..."/></div>
              <div style={{ display:'flex', gap:'10px', marginTop:'6px' }}>
                <button type="submit" className="btn-primary" style={{ flex:1, justifyContent:'center' }}>Simpan Riwayat</button>
                <button type="button" className="btn-secondary" onClick={()=>setShowHistoryModal(false)} style={{ flex:1 }}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Input Peak Day Baru ── */}
      {showPeakDayModal && (
        <div className="modal-backdrop">
          <div className="glass-card modal-content animate-fade-in" style={{ maxWidth:'450px', width:'92%' }}>
            <div className="modal-header">
              <h2>➕ Tambah Hari Sibuk (Peak Day)</h2>
              <button onClick={()=>setShowPeakDayModal(false)} style={{ background:'transparent', border:'none', color:'#fff', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddPeakDay} style={{ display:'flex', flexDirection:'column', gap:'14px', textAlign:'left' }}>
              <div className="input-group">
                <label>Tanggal <span style={{color:'#f43f5e'}}>*</span></label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Contoh: 17"
                  className="input-field"
                  value={newPeakDay.tanggal}
                  onChange={e => setNewPeakDay(p => ({ ...p, tanggal: e.target.value }))}
                  required
                />
              </div>

              <div className="input-group">
                <label>Bulan <span style={{color:'#f43f5e'}}>*</span></label>
                <select
                  className="input-field"
                  value={newPeakDay.bulan}
                  onChange={e => setNewPeakDay(p => ({ ...p, bulan: e.target.value }))}
                  required
                  style={{ background: 'var(--bg-main)', color: '#fff' }}
                >
                  <option value="">-- Pilih Bulan --</option>
                  {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label>Tahun <span style={{color:'#f43f5e'}}>*</span></label>
                <select
                  className="input-field"
                  value={newPeakDay.tahun}
                  onChange={e => setNewPeakDay(p => ({ ...p, tahun: e.target.value }))}
                  required
                  style={{ background: 'var(--bg-main)', color: '#fff' }}
                >
                  <option value="">-- Pilih Tahun --</option>
                  {TAHUN.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label>Nama Hari Sibuk <span style={{color:'#f43f5e'}}>*</span></label>
                <input
                  type="text"
                  placeholder="Contoh: Idul Fitri / Libur Lebaran"
                  className="input-field"
                  value={newPeakDay.nama_peak_day}
                  onChange={e => setNewPeakDay(p => ({ ...p, nama_peak_day: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Simpan Peak Day</button>
                <button type="button" className="btn-secondary" onClick={() => setShowPeakDayModal(false)} style={{ flex: 1 }}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selfie Preview Modal */}
      {selfiePreviewData && (
        <div className="modal-backdrop">
          <div className="glass-card modal-content animate-fade-in" style={{ maxWidth: '640px', width: '95%' }}>
            <div className="modal-header">
              <h2>Foto Selfie Kehadiran</h2>
              <button onClick={() => setSelfiePreviewData(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ textAlign: 'left', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{toTitleCase(selfiePreviewData.name)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tanggal: {formatDate(selfiePreviewData.date)}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', maxHeight: '420px', overflowY: 'auto', padding: '4px' }}>
              {selfiePreviewData.photos.map((photo, idx) => {
                const photoSrc = photo.url.startsWith('http') || photo.url.startsWith('data:')
                  ? photo.url
                  : `${API_URL}${photo.url.startsWith('/') ? '' : '/'}${photo.url}`;
                
                return (
                  <div key={idx} style={{ background: 'var(--bg-main)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-solid)', textTransform: 'uppercase' }}>{photo.label}</span>
                    <div style={{ width: '100%', height: '140px', background: '#222831', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {photo.url === 'ARCHIVED_PDF' ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', padding: '10px', textAlign: 'center' }}>📷 Diarsipkan dalam PDF Mingguan</div>
                      ) : (
                        <img 
                          src={photoSrc} 
                          alt={photo.label} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/150x150/222831/FFFFFF?text=Foto+Hilang';
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button className="btn-secondary" onClick={() => setSelfiePreviewData(null)} style={{ padding: '8px 20px', cursor:'pointer' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="confirm-overlay">
          <div className="confirm-card">
            <h3 className="confirm-title">{confirmModal.title}</h3>
            <p className="confirm-message">{confirmModal.message}</p>
            <div className="confirm-actions">
              <button className="btn-confirm-yes" onClick={()=>{ confirmModal.onConfirm(); setConfirmModal(p=>({...p,isOpen:false})); }}>{confirmModal.confirmText}</button>
              <button className="btn-confirm-cancel" onClick={()=>setConfirmModal(p=>({...p,isOpen:false}))}>{confirmModal.cancelText}</button>
            </div>
          </div>
        </div>
      )}

      {showSessionExpiredModal && (
        <div className="confirm-overlay" style={{ zIndex: 9999 }}>
          <div className="confirm-card" style={{ maxWidth: '420px', textAlign: 'center', padding: '30px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
            <h3 className="confirm-title" style={{ color: 'var(--danger)', fontSize: '1.4rem', marginBottom: '12px' }}>Sesi Login Kedaluwarsa</h3>
            <p className="confirm-message" style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px', color: 'var(--text-main)' }}>
              Demi keamanan data, sesi login Anda di server Barokah Grup telah berakhir (batas 24 jam). Silakan klik tombol di bawah untuk keluar sesi dan masuk kembali.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="btn-confirm-yes" 
                onClick={() => {
                  sessionStorage.removeItem('token');
                  sessionStorage.removeItem('user');
                  window.location.reload();
                }}
                style={{ width: '100%', padding: '12px', background: '#E05C5C', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Keluar Sesi & Login Ulang
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
