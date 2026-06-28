import React, { useState, useEffect } from 'react';
import { Plus, BarChart2, Trash2, Eye, X, Send, Users, ClipboardList, Check, Edit2, Play } from 'lucide-react';
import { useHRIS } from '../context/HRISContext';

const C = {
  bg: '#222831',
  surface: '#393E46',
  cyan: '#00ADB5',
  cyanDim: 'rgba(0, 173, 181, 0.12)',
  cyanBorder: 'rgba(0, 173, 181, 0.3)',
  text: '#EEEEEE',
  muted: '#9EA8B3',
  border: 'rgba(238, 238, 238, 0.1)',
  danger: '#E05C5C',
  success: '#4ECDC4',
  warn: '#F5A623',
};

const uid = () => `angket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function AngketKaryawan({ token, API_URL, userPermissions }) {
  const { activeEmployees } = useHRIS();

  // Load surveys & responses from localStorage/backend
  const [surveys, setSurveys] = useState([]);
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch all from backend on mount
  useEffect(() => {
    const fetchAll = async () => {
      if (!token) return;
      setIsSyncing(true);
      try {
        const res = await fetch(`${API_URL}/angket/admin/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success') {
            setSurveys(json.surveys || []);
            setSurveyResponses(json.responses || []);
            localStorage.setItem('hris_surveys_manual', JSON.stringify(json.surveys || []));
            localStorage.setItem('hris_survey_responses_manual', JSON.stringify(json.responses || []));
          }
        }
      } catch (err) {
        console.error('Error fetching surveys from server:', err);
        // Fallback to localStorage
        try {
          const storedSrv = localStorage.getItem('hris_surveys_manual');
          const storedResp = localStorage.getItem('hris_survey_responses_manual');
          if (storedSrv) setSurveys(JSON.parse(storedSrv));
          if (storedResp) setSurveyResponses(JSON.parse(storedResp));
        } catch {}
      } finally {
        setIsSyncing(false);
      }
    };
    fetchAll();
  }, [token, API_URL]);

  // Form states for creating/editing survey
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSurveyId, setEditingSurveyId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formOutlets, setFormOutlets] = useState([]);
  const [formJabatans, setFormJabatans] = useState([]);
  const [formQuestions, setFormQuestions] = useState(
    Array(10).fill(null).map((_, i) => ({
      id: `q${i}`,
      text: '',
      options: { a: '', b: '', c: '', d: '' }
    }))
  );

  // Dropdown visibility states
  const [showOutletDropdown, setShowOutletDropdown] = useState(false);
  const [showJabatanDropdown, setShowJabatanDropdown] = useState(false);

  // Preview before saving modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSurveyData, setPreviewSurveyData] = useState(null);

  // Quick Preview modal (read-only)
  const [showQuickPreviewModal, setShowQuickPreviewModal] = useState(false);
  const [quickPreviewData, setQuickPreviewData] = useState(null);

  // Hover preview tooltip state
  const [hoveredSurveyPreview, setHoveredSurveyPreview] = useState(null);
  const [hoveredSurveyPos, setHoveredSurveyPos] = useState({ x: 0, y: 0 });

  // Stats / Results view states
  const [selectedSurveyForResult, setSelectedSurveyForResult] = useState(null);
  const [showInputResponseModal, setShowInputResponseModal] = useState(false);
  const [responseEmpId, setResponseEmpId] = useState('');
  const [responseAnswers, setResponseAnswers] = useState({});

  // List of outlets
  const [outletsList, setOutletsList] = useState([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('outlet_cabang_data');
      let list = [];
      if (stored) {
        const parsed = JSON.parse(stored);
        list = parsed.map(o => o.nama_tablet || o.nama_outlet).filter(Boolean);
      }
      if (list.length === 0) {
        list = [...new Set(activeEmployees.map(e => e.outlet).filter(Boolean))].sort();
      }
      setOutletsList(list);
    } catch {}
  }, [activeEmployees]);

  // List of jabatans
  const [jabatansList, setJabatansList] = useState([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('organizational_roles');
      let list = [];
      if (stored) {
        const parsed = JSON.parse(stored);
        list = [...new Set(parsed.map(r => r.jabatan).filter(Boolean))].sort();
      }
      if (list.length === 0) {
        list = [...new Set(activeEmployees.map(e => e.position || e.jabatan).filter(Boolean))].sort();
      }
      if (list.length === 0) {
        list = ['Kasir', 'Koki', 'Waiter', 'Kepala Outlet', 'Owner', 'Admin'];
      }
      setJabatansList(list);
    } catch {
      setJabatansList(['Kasir', 'Koki', 'Waiter', 'Kepala Outlet', 'Owner', 'Admin']);
    }
  }, [activeEmployees]);

  const handleOpenAddSurvey = () => {
    setEditingSurveyId(null);
    setFormTitle('');
    const today = new Date().toISOString().split('T')[0];
    setFormStartDate(today);
    setFormEndDate('');
    setFormOutlets([...outletsList]); // Default select all
    setFormJabatans([...jabatansList]); // Default select all
    setShowOutletDropdown(false);
    setShowJabatanDropdown(false);
    setFormQuestions(
      Array(10).fill(null).map((_, i) => ({
        id: `q${i}`,
        text: '',
        options: { a: '', b: '', c: '', d: '' }
      }))
    );
    setShowAddModal(true);
  };

  const handleEditSurvey = (srv) => {
    setEditingSurveyId(srv.id);
    setFormTitle(srv.title);
    setFormStartDate(srv.startDate);
    setFormEndDate(srv.endDate);
    setFormOutlets(srv.outlets || []);
    setFormJabatans(srv.jabatans || []);
    setShowOutletDropdown(false);
    setShowJabatanDropdown(false);
    setFormQuestions(srv.questions.map(q => ({
      id: q.id,
      text: q.text,
      options: { ...q.options }
    })));
    setShowAddModal(true);
  };

  const handleInitiateSave = () => {
    if (!formTitle.trim()) {
      alert('Judul angket wajib diisi!');
      return;
    }
    if (!formStartDate || !formEndDate) {
      alert('Tanggal Mulai dan Tanggal Akhir wajib diisi!');
      return;
    }
    if (formOutlets.length === 0) {
      alert('Pilih minimal satu target outlet!');
      return;
    }
    if (formJabatans.length === 0) {
      alert('Pilih minimal satu target jabatan!');
      return;
    }
    const emptyQ = formQuestions.some(
      q => !q.text.trim() || !q.options.a.trim() || !q.options.b.trim() || !q.options.c.trim() || !q.options.d.trim()
    );
    if (emptyQ) {
      alert('Harap isi semua 10 pertanyaan beserta 4 opsi jawaban (A, B, C, D) dengan lengkap!');
      return;
    }

    const targetStatus = editingSurveyId ? (surveys.find(s => s.id === editingSurveyId)?.status || 'draft') : 'draft';

    const surveyObj = {
      id: editingSurveyId || uid(),
      title: formTitle.trim(),
      startDate: formStartDate,
      endDate: formEndDate,
      outlets: formOutlets,
      jabatans: formJabatans,
      questions: formQuestions,
      status: targetStatus,
      created_at: new Date().toISOString()
    };

    setPreviewSurveyData(surveyObj);
    setShowPreviewModal(true);
  };

  const handleConfirmSaveSurvey = async () => {
    if (!previewSurveyData) return;
    
    let newSurveys;
    if (editingSurveyId) {
      newSurveys = surveys.map(s => s.id === editingSurveyId ? previewSurveyData : s);
    } else {
      newSurveys = [...surveys, previewSurveyData];
    }
    
    setSurveys(newSurveys);
    localStorage.setItem('hris_surveys_manual', JSON.stringify(newSurveys));
    
    setShowPreviewModal(false);
    setShowAddModal(false);
    setPreviewSurveyData(null);

    // Sync to backend
    try {
      await fetch(`${API_URL}/angket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ surveys: newSurveys })
      });
    } catch (err) {
      console.error('Failed to sync surveys with backend:', err);
    }
  };

  const handleSendSurvey = async (id) => {
    if (window.confirm('Kirim dan aktifkan angket ini ke seluruh target karyawan?')) {
      const newSurveys = surveys.map(s => s.id === id ? { ...s, status: 'aktif' } : s);
      setSurveys(newSurveys);
      localStorage.setItem('hris_surveys_manual', JSON.stringify(newSurveys));

      try {
        await fetch(`${API_URL}/angket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ surveys: newSurveys })
        });
        alert('Angket berhasil dikirim/diaktifkan!');
      } catch (err) {
        console.error('Failed to send survey to backend:', err);
      }
    }
  };

  const handleDeleteSurvey = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus angket ini? Semua jawaban terkait akan ikut terhapus.')) {
      const newSurveys = surveys.filter(s => s.id !== id);
      const newResponses = surveyResponses.filter(r => r.surveyId !== id);
      
      setSurveys(newSurveys);
      setSurveyResponses(newResponses);
      localStorage.setItem('hris_surveys_manual', JSON.stringify(newSurveys));
      localStorage.setItem('hris_survey_responses_manual', JSON.stringify(newResponses));
      
      if (selectedSurveyForResult?.id === id) {
        setSelectedSurveyForResult(null);
      }

      try {
        await fetch(`${API_URL}/angket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ surveys: newSurveys })
        });
        await fetch(`${API_URL}/angket/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ responses: newResponses })
        });
      } catch (err) {
        console.error('Failed to delete survey on backend:', err);
      }
    }
  };

  const handleAddResponse = (surveyId) => {
    setResponseEmpId('');
    setResponseAnswers({});
    setShowInputResponseModal(true);
  };

  const handleSaveResponse = async () => {
    if (!responseEmpId) {
      alert('Harap pilih karyawan terlebih dahulu!');
      return;
    }
    const targetSurvey = selectedSurveyForResult;
    if (!targetSurvey) return;

    const unanswered = targetSurvey.questions.filter((_, i) => !responseAnswers[`q${i}`]);
    if (unanswered.length > 0) {
      alert(`Harap jawab semua ${targetSurvey.questions.length} pertanyaan!`);
      return;
    }

    const emp = activeEmployees.find(e => String(e.id) === String(responseEmpId));
    const newResp = {
      id: `resp-${Date.now()}`,
      surveyId: targetSurvey.id,
      employeeId: responseEmpId,
      employeeName: emp?.full_name || emp?.nama || 'Karyawan',
      outlet: emp?.outlet || '',
      answers: { ...responseAnswers },
      submittedAt: new Date().toISOString()
    };

    const newResponses = [...surveyResponses, newResp];
    setSurveyResponses(newResponses);
    localStorage.setItem('hris_survey_responses_manual', JSON.stringify(newResponses));
    
    setShowInputResponseModal(false);

    try {
      await fetch(`${API_URL}/angket/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ responses: newResponses })
      });
    } catch (err) {
      console.error('Failed to save manual response to backend:', err);
    }
  };

  const getSurveyStats = (survey) => {
    const resps = surveyResponses.filter(r => r.surveyId === survey.id);
    const totalResponses = resps.length;

    const stats = survey.questions.map((q, qIdx) => {
      const counts = { a: 0, b: 0, c: 0, d: 0 };
      resps.forEach(r => {
        const ans = r.answers?.[`q${qIdx}`];
        if (ans && counts.hasOwnProperty(ans)) {
          counts[ans]++;
        }
      });
      const pct = {};
      Object.keys(counts).forEach(k => {
        pct[k] = totalResponses > 0 ? Math.round((counts[k] / totalResponses) * 100) : 0;
      });
      return { qText: q.text, options: q.options, counts, pct };
    });

    return { stats, totalResponses, responses: resps };
  };

  const getSurveyTargetEmployeesCount = (survey) => {
    const outlets = survey.outlets || [];
    const jabatans = survey.jabatans || [];
    return activeEmployees.filter(emp => 
      outlets.includes(emp.outlet) && 
      jabatans.includes(emp.position || emp.jabatan)
    ).length;
  };

  const getSurveyProgressText = (survey) => {
    const resCount = surveyResponses.filter(r => r.surveyId === survey.id).length;
    const targetCount = getSurveyTargetEmployeesCount(survey);
    const pct = targetCount > 0 ? Math.round((resCount / targetCount) * 100) : 0;
    return `${resCount} / ${targetCount} (${pct}%)`;
  };

  const handleShowHoverPreview = (e, srv) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredSurveyPreview(srv);
    setHoveredSurveyPos({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY });
  };

  const handleHideHoverPreview = () => {
    setHoveredSurveyPreview(null);
  };

  const handleOpenQuickPreview = (srv) => {
    setQuickPreviewData(srv);
    setShowQuickPreviewModal(true);
  };

  return (
    <div style={{ padding: '24px', boxSizing: 'border-box', color: C.text, fontFamily: 'sans-serif', position: 'relative' }}>
      {/* Syncing Overlay */}
      {isSyncing && (
        <div style={{ position: 'fixed', top: 12, right: 12, background: C.cyan, color: C.bg, padding: '6px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, boxShadow: '0 2px 10px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 99999 }}>
          <div style={{ width: '10px', height: '10px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span>Sinkronisasi Data...</span>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: C.surface,
        padding: '24px 30px',
        borderRadius: '16px',
        border: `1px solid ${C.cyanBorder}`,
        marginBottom: '28px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#fff' }}>📝 MODUL ANGKET KARYAWAN</h2>
          <p style={{ color: C.muted, fontSize: '0.82rem', marginTop: '4px' }}>
            Buat kuesioner umpan balik, filter target outlet dan jabatan, serta tinjau hasil analisis responden secara real-time.
          </p>
        </div>
        <button
          onClick={handleOpenAddSurvey}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: C.cyan, color: C.bg, border: 'none',
            borderRadius: '10px', padding: '10px 20px',
            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={16} />
          <span>BUAT ANGKET BARU</span>
        </button>
      </div>

      {selectedSurveyForResult ? (() => {
        const { stats, totalResponses, responses } = getSurveyStats(selectedSurveyForResult);
        return (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
            {/* Results Title Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${C.border}`, paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <button
                  onClick={() => setSelectedSurveyForResult(null)}
                  style={{ background: 'transparent', border: 'none', color: C.cyan, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', padding: 0, marginBottom: '6px' }}
                >
                  ← Kembali ke Daftar Angket
                </button>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>📊 Analisis Jawaban Angket</h3>
                <p style={{ color: C.muted, fontSize: '0.8rem', marginTop: '4px' }}>
                  {selectedSurveyForResult.title} (Target: {selectedSurveyForResult.outlets.join(', ')} · Total: {totalResponses} Responden)
                </p>
              </div>
              <button
                onClick={() => handleAddResponse(selectedSurveyForResult.id)}
                style={{
                  background: 'rgba(78,205,196,0.15)', border: `1px solid ${C.success}`, color: C.success,
                  padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                + Input Respon Manual
              </button>
            </div>

            {totalResponses === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: C.bg, borderRadius: '12px', border: `1px dashed ${C.border}` }}>
                <p style={{ color: C.muted, fontSize: '0.9rem', margin: 0 }}>Belum ada karyawan yang mengisi angket ini.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* Questions statistics chart */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {stats.map((q, idx) => (
                    <div key={idx} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px 20px' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', marginBottom: '12px' }}>
                        {idx + 1}. {q.qText}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {['a', 'b', 'c', 'd'].map(opt => {
                          const barColor = opt === 'a' ? C.cyan : opt === 'b' ? C.success : opt === 'c' ? C.warn : C.danger;
                          return (
                            <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem' }}>
                              <span style={{ width: '18px', fontWeight: 800, color: barColor, textTransform: 'uppercase' }}>{opt}</span>
                              <span style={{ width: '140px', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.options[opt]}</span>
                              <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${q.pct[opt]}%`, height: '100%', background: barColor, borderRadius: '4px' }} />
                              </div>
                              <span style={{ width: '80px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>{q.pct[opt]}% ({q.counts[opt]} org)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Respondents table */}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '20px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginBottom: '14px' }}>📋 Daftar Responden Angket</h4>
                  <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: C.bg }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', color: C.cyan }}>Nama Karyawan</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', color: C.cyan }}>Outlet</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', color: C.cyan }}>Jawaban Q1-Q10</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', color: C.cyan }}>Waktu Pengisian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responses.map((resp) => (
                          <tr key={resp.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>{resp.employeeName}</td>
                            <td style={{ padding: '10px 14px', color: C.muted }}>{resp.outlet}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.85rem', color: C.success }}>
                              {selectedSurveyForResult.questions.map((_, i) => (resp.answers[`q${i}`] || '-').toUpperCase()).join(' | ')}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: C.muted, fontSize: '0.72rem' }}>
                              {new Date(resp.submittedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })() : (
        /* Angket Table List */
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
          {surveys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Belum ada angket aktif. Silakan buat angket baru untuk karyawan.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: `1px solid ${C.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: C.cyan }}>Judul Angket</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: C.cyan }}>Target Outlet</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: C.cyan }}>Target Jabatan</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: C.cyan }}>Pengerjaan (Progress)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: C.cyan }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: C.cyan }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((srv) => {
                    const isDraft = srv.status === 'draft';
                    const targetOutletText = srv.outlets.length === outletsList.length ? 'Semua Outlet' : srv.outlets.map(o => o.replace('AYAM PECAK 2001 SEAFOOD ', '').replace('PECEL LELE ', '')).join(', ');
                    const targetJabatanText = srv.jabatans.length === jabatansList.length ? 'Semua Jabatan' : srv.jabatans.join(', ');

                    return (
                      <tr key={srv.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                          <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); handleOpenQuickPreview(srv); }}
                            onMouseEnter={(e) => handleShowHoverPreview(e, srv)}
                            onMouseLeave={handleHideHoverPreview}
                            style={{ color: C.cyan, textDecoration: 'underline', cursor: 'pointer' }}
                          >
                            {srv.title}
                          </a>
                        </td>
                        <td style={{ padding: '14px 16px', color: C.text, fontSize: '0.78rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={srv.outlets.join(', ')}>
                          {targetOutletText}
                        </td>
                        <td style={{ padding: '14px 16px', color: C.text, fontSize: '0.78rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={srv.jabatans.join(', ')}>
                          {targetJabatanText}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 'bold', color: C.success }}>
                          {getSurveyProgressText(srv)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{
                            background: srv.status === 'aktif' ? 'rgba(78,205,196,0.12)' : 'rgba(245,166,35,0.12)',
                            color: srv.status === 'aktif' ? C.success : C.warn,
                            padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800
                          }}>
                            {srv.status === 'aktif' ? 'Aktif / Sent' : 'Draft'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {isDraft && (
                              <button
                                onClick={() => handleSendSurvey(srv.id)}
                                style={{ background: 'rgba(0,173,181,0.15)', border: `1px solid ${C.cyan}`, color: C.cyan, padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Send size={11} /> Kirim
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedSurveyForResult(srv)}
                              style={{ background: 'rgba(78,205,196,0.12)', border: 'none', color: C.success, padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              <BarChart2 size={11} /> Hasil
                            </button>
                            <button
                              onClick={() => handleEditSurvey(srv)}
                              style={{ background: 'rgba(245,166,35,0.12)', border: 'none', color: C.warn, padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              title="Edit Angket"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              onClick={() => handleDeleteSurvey(srv.id)}
                              style={{ background: 'rgba(224,92,92,0.12)', border: 'none', color: C.danger, padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              title="Hapus Angket"
                            >
                              <Trash2 size={11} />
                            </button>
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
      )}

      {/* ── HOVER PREVIEW TOOLTIP ── */}
      {hoveredSurveyPreview && (
        <div style={{
          position: 'absolute',
          top: hoveredSurveyPos.y - 120,
          left: hoveredSurveyPos.x + 30,
          width: '340px',
          backgroundColor: '#1E222B',
          border: `1.5px solid ${C.cyan}`,
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          zIndex: 99999,
          pointerEvents: 'none',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: C.cyan, margin: '0 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
            📋 Pratinjau Pertanyaan ({hoveredSurveyPreview.title}):
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
            {hoveredSurveyPreview.questions.map((q, idx) => (
              <div key={idx} style={{ fontSize: '0.74rem', color: '#fff', lineHeight: '1.4' }}>
                <span style={{ color: C.cyan, fontWeight: 'bold' }}>{idx + 1}.</span> {q.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── QUICK PREVIEW MODAL (ON CLICK TITLE) ── */}
      {showQuickPreviewModal && quickPreviewData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: C.surface, border: `1.5px solid ${C.cyanBorder}`, borderRadius: '18px', padding: '28px', width: '700px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.cyan, margin: 0 }}>📋 Detail Soal Angket</h3>
              <button onClick={() => setShowQuickPreviewModal(false)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={22} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: C.bg, padding: '14px 18px', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#fff' }}>{quickPreviewData.title}</h4>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.78rem', color: C.muted, marginTop: '8px', flexWrap: 'wrap' }}>
                  <span>Periode: <strong>{quickPreviewData.startDate} s/d {quickPreviewData.endDate}</strong></span>
                  <span>Target Outlet: <strong>{quickPreviewData.outlets.length === outletsList.length ? 'Semua' : quickPreviewData.outlets.length} Terpilih</strong></span>
                  <span>Target Jabatan: <strong>{quickPreviewData.jabatans.length === jabatansList.length ? 'Semua' : quickPreviewData.jabatans.length} Terpilih</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {quickPreviewData.questions.map((q, idx) => (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.84rem', color: '#fff', margin: '0 0 10px 0' }}>
                      {idx + 1}. {q.text}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingLeft: '16px' }}>
                      {['a', 'b', 'c', 'd'].map(opt => (
                        <div key={opt} style={{ fontSize: '0.76rem', color: C.muted }}>
                          <span style={{ fontWeight: 800, color: C.cyan, marginRight: '4px' }}>{opt.toUpperCase()}:</span> {q.options[opt]}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button onClick={() => setShowQuickPreviewModal(false)} style={{ background: C.cyan, border: 'none', borderRadius: '8px', padding: '10px 24px', color: C.bg, fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>Tutup Pratinjau</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT SURVEY MODAL ── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 20px', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '24px', width: '800px', maxWidth: '95vw', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: C.cyan }}>
                {editingSurveyId ? '📝 Edit Angket Karyawan' : '📋 Buat Angket Baru Karyawan'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>Judul Angket</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Contoh: Angket Umpan Balik Kinerja Outlet & Loyalitas Staf" style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px', color: C.text, outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>Tanggal Mulai</label>
                  <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px', color: C.text, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>Tanggal Selesai</label>
                  <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px', color: C.text, outline: 'none' }} />
                </div>
              </div>

              {/* OUTLET MULTI SELECT DROPDOWN */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>Target Outlet Terpilih (Dropdown)</label>
                <button
                  type="button"
                  onClick={() => { setShowOutletDropdown(!showOutletDropdown); setShowJabatanDropdown(false); }}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px',
                    color: C.text, fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', outline: 'none'
                  }}
                >
                  <span>{formOutlets.length === 0 ? 'Pilih Target Outlet...' : formOutlets.length === outletsList.length ? 'Semua Outlet Terpilih' : `${formOutlets.length} Outlet Terpilih`}</span>
                  <span style={{ fontSize: '0.7rem', color: C.cyan }}>▼</span>
                </button>
                
                {showOutletDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: C.surface, border: `1.5px solid ${C.cyan}`, borderRadius: '8px',
                    marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', padding: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                      <button type="button" onClick={() => setFormOutlets([...outletsList])} style={{ background: 'transparent', border: 'none', color: C.cyan, fontSize: '0.72rem', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>Pilih Semua</button>
                      <button type="button" onClick={() => setFormOutlets([])} style={{ background: 'transparent', border: 'none', color: C.danger, fontSize: '0.72rem', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>Bersihkan</button>
                    </div>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {outletsList.map(name => {
                        const isChecked = formOutlets.includes(name);
                        return (
                          <label key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.74rem', background: isChecked ? C.cyanDim : 'transparent', border: `1px solid ${isChecked ? 'rgba(0, 173, 181, 0.3)' : 'transparent'}` }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormOutlets([...formOutlets, name]);
                                } else {
                                  setFormOutlets(formOutlets.filter(item => item !== name));
                                }
                              }}
                            />
                            <span>{name.replace('AYAM PECAK 2001 SEAFOOD ', '').replace('PECEL LELE ', '')}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* JABATAN MULTI SELECT DROPDOWN */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>Target Jabatan Terpilih (Dropdown)</label>
                <button
                  type="button"
                  onClick={() => { setShowJabatanDropdown(!showJabatanDropdown); setShowOutletDropdown(false); }}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px',
                    color: C.text, fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', outline: 'none'
                  }}
                >
                  <span>{formJabatans.length === 0 ? 'Pilih Target Jabatan...' : formJabatans.length === jabatansList.length ? 'Semua Jabatan Terpilih' : `${formJabatans.length} Jabatan Terpilih`}</span>
                  <span style={{ fontSize: '0.7rem', color: C.cyan }}>▼</span>
                </button>
                
                {showJabatanDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: C.surface, border: `1.5px solid ${C.cyan}`, borderRadius: '8px',
                    marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', padding: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
                      <button type="button" onClick={() => setFormJabatans([...jabatansList])} style={{ background: 'transparent', border: 'none', color: C.cyan, fontSize: '0.72rem', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>Pilih Semua</button>
                      <button type="button" onClick={() => setFormJabatans([])} style={{ background: 'transparent', border: 'none', color: C.danger, fontSize: '0.72rem', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>Bersihkan</button>
                    </div>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {jabatansList.map(role => {
                        const isChecked = formJabatans.includes(role);
                        return (
                          <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.74rem', background: isChecked ? C.cyanDim : 'transparent', border: `1px solid ${isChecked ? 'rgba(0, 173, 181, 0.3)' : 'transparent'}` }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormJabatans([...formJabatans, role]);
                                } else {
                                  setFormJabatans(formJabatans.filter(item => item !== role));
                                }
                              }}
                            />
                            <span>{role}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* QUESTIONS LIST */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: C.cyan, marginBottom: '12px' }}>Daftar Soal & Opsi Jawaban (10 Pertanyaan)</label>
                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px' }}>
                  {formQuestions.map((q, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: C.cyan, width: '25px' }}>#{idx + 1}</span>
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => {
                            const newQs = [...formQuestions];
                            newQs[idx].text = e.target.value;
                            setFormQuestions(newQs);
                          }}
                          placeholder={`Pertanyaan kuesioner ke-${idx + 1}...`}
                          style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '8px 12px', color: C.text, fontSize: '0.8rem', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingLeft: '35px' }}>
                        {['a', 'b', 'c', 'd'].map(opt => (
                          <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: C.muted, textTransform: 'uppercase' }}>{opt}:</span>
                            <input
                              type="text"
                              value={q.options[opt]}
                              onChange={(e) => {
                                const newQs = [...formQuestions];
                                newQs[idx].options[opt] = e.target.value;
                                setFormQuestions(newQs);
                              }}
                              placeholder={`Pilihan ${opt.toUpperCase()}...`}
                              style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '6px 10px', color: C.text, fontSize: '0.75rem', outline: 'none' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', borderTop: `1px solid ${C.border}`, paddingTop: '16px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 20px', color: C.text, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Batal</button>
                <button onClick={handleInitiateSave} style={{ background: C.cyan, border: 'none', borderRadius: '8px', padding: '10px 24px', color: C.bg, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>Tinjau & Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW BEFORE SAVE MODAL ── */}
      {showPreviewModal && previewSurveyData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: C.surface, border: `1.5px solid ${C.cyan}`, borderRadius: '18px', padding: '28px', width: '740px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1.5px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.cyan, margin: 0 }}>👀 Pratinjau Sebelum Disimpan</h3>
              <button onClick={() => setShowPreviewModal(false)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={22} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ background: C.bg, padding: '16px', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>📋 {previewSurveyData.title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.78rem', color: C.muted }}>
                  <div>Periode Aktif: <strong>{previewSurveyData.startDate} s/d {previewSurveyData.endDate}</strong></div>
                  <div>Status Awal: <strong style={{ color: C.warn }}>DRAFT (Perlu klik "Kirim" untuk rilis)</strong></div>
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.78rem', color: C.text, borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                  Target Outlet ({previewSurveyData.outlets.length}): <strong>{previewSurveyData.outlets.map(o => o.replace('AYAM PECAK 2001 SEAFOOD ', '').replace('PECEL LELE ', '')).join(', ')}</strong>
                </div>
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: C.text }}>
                  Target Jabatan ({previewSurveyData.jabatans.length}): <strong>{previewSurveyData.jabatans.join(', ')}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.88rem', color: C.cyan, fontWeight: 'bold' }}>Daftar 10 Soal Angket:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '6px' }}>
                  {previewSurveyData.questions.map((q, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.12)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                        {idx + 1}. {q.text}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingLeft: '16px' }}>
                        {['a', 'b', 'c', 'd'].map(opt => (
                          <div key={opt} style={{ fontSize: '0.74rem', color: C.muted }}>
                            <span style={{ fontWeight: 800, color: C.cyan, marginRight: '4px' }}>{opt.toUpperCase()}:</span> {q.options[opt]}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', borderTop: `1px solid ${C.border}`, paddingTop: '16px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowPreviewModal(false)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 20px', color: C.text, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Edit Kembali</button>
                <button onClick={handleConfirmSaveSurvey} style={{ background: C.success, border: 'none', borderRadius: '8px', padding: '10px 24px', color: C.bg, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>Konfirmasi & Simpan Permanen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MANUAL INPUT RESPONSE MODAL ── */}
      {showInputResponseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', width: '560px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: C.cyan }}>✍️ Input Respon Survey Karyawan</h3>
              <button onClick={() => setShowInputResponseModal(false)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>Pilih Karyawan</label>
                <select
                  value={responseEmpId}
                  onChange={e => setResponseEmpId(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  <option value="">-- Pilih Anggota Staf --</option>
                  {activeEmployees.map(e => (
                    <option key={e.id} value={e.id}>{e.full_name || e.nama} ({e.outlet || 'Tanpa Outlet'})</option>
                  ))}
                </select>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: C.muted, marginBottom: '8px' }}>Daftar Pertanyaan & Jawaban</label>
                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
                  {selectedSurveyForResult?.questions.map((q, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '8px' }}>{idx + 1}. {q.text}</p>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {['a', 'b', 'c', 'd'].map(opt => (
                          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name={`radio-q-${idx}`}
                              checked={responseAnswers[`q${idx}`] === opt}
                              onChange={() => setResponseAnswers({ ...responseAnswers, [`q${idx}`]: opt })}
                              style={{ accentColor: C.cyan }}
                            />
                            <span style={{ fontWeight: 600 }}>{opt.toUpperCase()}:</span>
                            <span style={{ color: C.muted }}>{q.options[opt]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', borderTop: `1px solid ${C.border}`, paddingTop: '14px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowInputResponseModal(false)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '8px 16px', color: C.text, fontSize: '0.78rem', cursor: 'pointer' }}>Batal</button>
                <button onClick={handleSaveResponse} style={{ background: C.cyan, border: 'none', borderRadius: '6px', padding: '8px 20px', color: C.bg, fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>Simpan Jawaban</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
