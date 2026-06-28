import React, { useState, useEffect } from 'react';
import { Plus, BarChart2, Trash2, Eye, X, Send, Users, ClipboardList, Check } from 'lucide-react';
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

  // Load surveys & responses from localStorage
  const [surveys, setSurveys] = useState(() => {
    try {
      const stored = localStorage.getItem('hris_surveys_manual');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [surveyResponses, setSurveyResponses] = useState(() => {
    try {
      const stored = localStorage.getItem('hris_survey_responses_manual');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync back to localStorage when states change
  useEffect(() => {
    localStorage.setItem('hris_surveys_manual', JSON.stringify(surveys));
    // Trigger storage event for mobile sync simulator
    window.dispatchEvent(new CustomEvent('local_storage_sync', { detail: { key: 'hris_surveys_manual' } }));
  }, [surveys]);

  useEffect(() => {
    localStorage.setItem('hris_survey_responses_manual', JSON.stringify(surveyResponses));
    window.dispatchEvent(new CustomEvent('local_storage_sync', { detail: { key: 'hris_survey_responses_manual' } }));
  }, [surveyResponses]);

  // Form states for creating/editing survey
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSurveyId, setEditingSurveyId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formOutlets, setFormOutlets] = useState([]);
  const [formQuestions, setFormQuestions] = useState(
    Array(10).fill(null).map((_, i) => ({
      id: `q${i}`,
      text: '',
      options: { a: '', b: '', c: '', d: '' }
    }))
  );

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
      if (stored) {
        const parsed = JSON.parse(stored);
        setOutletsList(parsed.map(o => o.nama_tablet || o.nama_outlet).filter(Boolean));
      }
    } catch {}
  }, []);

  const handleOpenAddSurvey = () => {
    setEditingSurveyId(null);
    setFormTitle('');
    const today = new Date().toISOString().split('T')[0];
    setFormStartDate(today);
    setFormEndDate('');
    setFormOutlets([]);
    setFormQuestions(
      Array(10).fill(null).map((_, i) => ({
        id: `q${i}`,
        text: '',
        options: { a: '', b: '', c: '', d: '' }
      }))
    );
    setShowAddModal(true);
  };

  const handleSaveSurvey = () => {
    if (!formTitle.trim()) {
      alert('Judul angket wajib diisi!');
      return;
    }
    if (!formStartDate || !formEndDate) {
      alert('Tanggal Mulai dan Tanggal Akhir wajib diisi!');
      return;
    }
    const emptyQ = formQuestions.some(
      q => !q.text.trim() || !q.options.a.trim() || !q.options.b.trim() || !q.options.c.trim() || !q.options.d.trim()
    );
    if (emptyQ) {
      alert('Harap isi semua 10 pertanyaan beserta 4 opsi jawaban (A, B, C, D) dengan lengkap!');
      return;
    }

    const surveyObj = {
      id: editingSurveyId || uid(),
      title: formTitle.trim(),
      startDate: formStartDate,
      endDate: formEndDate,
      outlets: formOutlets.length > 0 ? formOutlets : outletsList,
      questions: formQuestions,
      status: 'aktif',
      created_at: new Date().toISOString()
    };

    if (editingSurveyId) {
      setSurveys(surveys.map(s => s.id === editingSurveyId ? surveyObj : s));
    } else {
      setSurveys([...surveys, surveyObj]);
    }
    setShowAddModal(false);
  };

  const handleDeleteSurvey = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus angket ini? Semua jawaban terkait akan ikut terhapus.')) {
      setSurveys(surveys.filter(s => s.id !== id));
      setSurveyResponses(surveyResponses.filter(r => r.surveyId !== id));
      if (selectedSurveyForResult?.id === id) {
        setSelectedSurveyForResult(null);
      }
    }
  };

  const handleAddResponse = (surveyId) => {
    setResponseEmpId('');
    setResponseAnswers({});
    setShowInputResponseModal(true);
  };

  const handleSaveResponse = () => {
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

    setSurveyResponses([...surveyResponses, newResp]);
    setShowInputResponseModal(false);
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

  return (
    <div style={{ padding: '24px', boxSizing: 'border-box', color: C.text, fontFamily: 'sans-serif' }}>
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
            Buat dan kelola kuesioner manual 10 soal pilihan ganda untuk umpan balik dan jajak pendapat staf outlet.
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
                              <span style={{ width: '140px', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.options[opt]}</span>
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
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: C.cyan }}>Responden</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: C.cyan }}>Periode Aktif</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: C.cyan }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: C.cyan }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((srv) => {
                    const resCount = surveyResponses.filter(r => r.surveyId === srv.id).length;
                    return (
                      <tr key={srv.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '14px 16px', fontWeight: 700 }}>{srv.title}</td>
                        <td style={{ padding: '14px 16px', color: C.muted, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {srv.outlets.join(', ')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ background: C.cyanDim, color: C.cyan, padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {resCount} Respon
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: C.muted, fontSize: '0.75rem' }}>
                          {srv.startDate} s/d {srv.endDate}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{
                            background: srv.status === 'aktif' ? 'rgba(78,205,196,0.12)' : 'rgba(224,92,92,0.12)',
                            color: srv.status === 'aktif' ? C.success : C.danger,
                            padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800
                          }}>
                            {srv.status === 'aktif' ? 'Aktif' : 'Selesai'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => setSelectedSurveyForResult(srv)}
                              style={{ background: 'rgba(78,205,196,0.12)', border: 'none', color: C.success, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <BarChart2 size={13} /> Analisis
                            </button>
                            <button
                              onClick={() => handleDeleteSurvey(srv.id)}
                              style={{ background: 'rgba(224,92,92,0.12)', border: 'none', color: C.danger, padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <Trash2 size={13} />
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

      {/* ── ADD SURVEY MODAL ── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 20px', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '24px', width: '800px', maxWidth: '95vw', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: C.cyan }}>📋 Buat Angket Baru Karyawan</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>Judul Angket</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Contoh: Angket Kinerja Restoran & Loyalitas Staf" style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px', color: C.text, outline: 'none' }} />
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

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '8px' }}>Target Outlet Terpilih</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {outletsList.map(name => {
                    const isChecked = formOutlets.includes(name);
                    return (
                      <label key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isChecked ? C.cyanDim : 'transparent', border: `1px solid ${isChecked ? C.cyan : C.border}`, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
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
                          style={{ display: 'none' }}
                        />
                        {isChecked && <Check size={12} style={{ color: C.cyan }} />}
                        <span>{name.replace('AYAM PECAK 2001 SEAFOOD ', '').replace('PECEL LELE ', '')}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: C.cyan, marginBottom: '12px' }}>Daftar Soal & Opsi Jawaban (10 Pertanyaan)</label>
                <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '8px' }}>
                  {formQuestions.map((q, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                <button onClick={handleSaveSurvey} style={{ background: C.cyan, border: 'none', borderRadius: '8px', padding: '10px 24px', color: C.bg, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>Simpan Angket</button>
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
