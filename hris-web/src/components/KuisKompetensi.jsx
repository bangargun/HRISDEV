/**
 * KuisKompetensi.jsx — Autonomous Quiz Competency & Performance Analytics Engine
 * ================================================================================
 * Modul Kuis HRIS Barokah Grup
 * Palet: #222831 (bg) | #393E46 (surface) | #00ADB5 (cyan) | #EEEEEE (text)
 * Aturan Teks: Capital Each Word
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Plus, Send, Download, Eye, Trash2, Upload,
  X, CheckCircle, Clock, AlertTriangle, Users, FileText,
  ChevronDown, Filter, RefreshCw, Bell, BarChart2,
  CheckSquare, Square, ZoomIn, Award, Inbox
} from 'lucide-react';
import { useHRIS } from '../context/HRISContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─── Palet Warna Resmi ────────────────────────────────────────────────────────
const C = {
  bg:      '#222831',
  surface: '#393E46',
  cyan:    '#00ADB5',
  cyanDim: 'rgba(0,173,181,0.12)',
  cyanBorder: 'rgba(0,173,181,0.3)',
  text:    '#EEEEEE',
  muted:   '#9EA8B3',
  border:  'rgba(238,238,238,0.1)',
  card:    '#2D333B',
  danger:  '#E05C5C',
  success: '#4ECDC4',
  warn:    '#F5A623',
};

// ─── Utilitas ─────────────────────────────────────────────────────────────────
const capitalEachWord = (str = '') =>
  String(str).replace(/\b\w/g, c => c.toUpperCase());

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const lsGet = (key, fallback = []) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};

const lsSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error('[Kuis] lsSet error:', key, e); }
};

// ─── Komponen Kecil ───────────────────────────────────────────────────────────
const Badge = ({ label, color = C.cyan, bg = C.cyanDim }) => (
  <span style={{
    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
    color, background: bg, border: `1px solid ${color}44`,
  }}>{label}</span>
);

const Btn = ({ children, onClick, variant = 'primary', disabled = false, style = {}, type='button' }) => {
  const base = {
    display: 'flex', alignItems: 'center', gap: '7px',
    padding: '9px 18px', borderRadius: '10px', border: 'none',
    fontWeight: 700, fontSize: '0.84rem', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, transition: 'all 0.2s ease',
  };
  const variants = {
    primary:   { background: C.cyan, color: C.bg },
    secondary: { background: 'transparent', color: C.text, border: `1px solid ${C.border}` },
    danger:    { background: 'rgba(224,92,92,0.12)', color: C.danger, border: `1px solid rgba(224,92,92,0.3)` },
    ghost:     { background: C.cyanDim, color: C.cyan, border: `1px solid ${C.cyanBorder}` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, type = 'text', required, placeholder, style = {} }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {label && <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.muted }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>}
    <input
      type={type} value={value} onChange={onChange} required={required} placeholder={placeholder}
      style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px',
        padding: '9px 12px', color: C.text, fontSize: '0.88rem', outline: 'none',
        transition: 'border-color 0.2s',
        ...style
      }}
      onFocus={e => e.target.style.borderColor = C.cyan}
      onBlur={e => e.target.style.borderColor = 'rgba(238,238,238,0.1)'}
    />
  </div>
);

const Select = ({ label, value, onChange, options = [], style = {} }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {label && <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.muted }}>{label}</label>}
    <select value={value} onChange={onChange}
      style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px',
        padding: '9px 12px', color: C.text, fontSize: '0.88rem', cursor: 'pointer',
        ...style
      }}>
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o} style={{ background: C.bg }}>
          {o.label ?? o}
        </option>
      ))}
    </select>
  </div>
);

// ─── MODAL KONFIRMASI UMUM ────────────────────────────────────────────────────
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Konfirmasi', danger = false }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: C.surface, borderRadius: '16px', border: `1px solid ${C.border}`,
        padding: '32px', width: '440px', maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      }}>
        <h3 style={{ color: danger ? C.danger : C.cyan, marginBottom: '12px', fontSize: '1.1rem' }}>{title}</h3>
        <p style={{ color: C.muted, marginBottom: '28px', lineHeight: '1.6', fontSize: '0.9rem' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onCancel}>Batal</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL PREVIEW EXCEL (Interceptor Guard) ──────────────────────────────────
const PreviewModal = ({ isOpen, quizMeta, parsedSoal, onUpload, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: '40px 20px', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: C.surface, borderRadius: '20px', border: `1.5px solid ${C.cyanBorder}`,
        padding: '32px', width: '900px', maxWidth: '96vw',
        boxShadow: `0 0 60px rgba(0,173,181,0.2)`,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: C.cyan, fontSize: '1.25rem', marginBottom: '4px' }}>
              📋 Interceptor Guard — Pratinjau Soal
            </h2>
            <p style={{ color: C.muted, fontSize: '0.83rem' }}>
              Pastikan data soal sudah benar sebelum diupload ke bank soal kuis.
            </p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>

        {/* Meta Summary */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px'
        }}>
          {[
            { label: 'Nama Kuis', val: quizMeta.nama_kuis || '-' },
            { label: 'Divisi / Jabatan', val: quizMeta.divisi || 'Semua' },
            { label: 'Durasi', val: quizMeta.durasi_menit ? `${quizMeta.durasi_menit} Menit` : '-' },
          ].map(({ label, val }) => (
            <div key={label} style={{
              background: C.bg, borderRadius: '10px', padding: '14px',
              border: `1px solid ${C.border}`,
            }}>
              <p style={{ color: C.muted, fontSize: '0.75rem', marginBottom: '4px' }}>{label}</p>
              <p style={{ color: C.text, fontWeight: 700, fontSize: '0.9rem' }}>{val}</p>
            </div>
          ))}
        </div>

        {/* Soal Table */}
        <p style={{ color: C.cyan, fontWeight: 700, marginBottom: '10px', fontSize: '0.85rem' }}>
          {parsedSoal.length} Soal Ditemukan
        </p>
        <div style={{ maxHeight: '380px', overflowY: 'auto', borderRadius: '10px', border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: C.bg, position: 'sticky', top: 0 }}>
                {['#', 'Pertanyaan', 'A', 'B', 'C', 'D', 'E', 'Kunci'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', color: C.cyan, fontWeight: 700, textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedSoal.map((s, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : 'rgba(238,238,238,0.02)' }}>
                  <td style={{ padding: '8px 12px', color: C.muted }}>{i + 1}</td>
                  <td style={{ padding: '8px 12px', color: C.text, maxWidth: '260px' }}>{s.soal}</td>
                  {['A', 'B', 'C', 'D', 'E'].map(p => (
                    <td key={p} style={{ padding: '8px 12px', color: s.kunci === p ? C.cyan : C.muted, fontWeight: s.kunci === p ? 700 : 400 }}>
                      {s.pilihan[p] || '-'}
                    </td>
                  ))}
                  <td style={{ padding: '8px 12px' }}>
                    <Badge label={s.kunci} color={C.cyan} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Btn variant="danger" onClick={onCancel}>
            <X size={16} /> Batalkan & Hapus File
          </Btn>
          <Btn variant="primary" onClick={onUpload}>
            <Upload size={16} /> Upload ke Bank Soal
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL GENERATE KUIS DARI MATERI ──────────────────────────────────────────
const GenerateQuizModal = ({ isOpen, onClose, onGenerate, allOutlets, divisiOptions }) => {
  const [selectedOutlets, setSelectedOutlets] = useState([]);
  const [selectedJabatans, setSelectedJabatans] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [duration, setDuration] = useState('15');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [materials, setMaterials] = useState(() => lsGet('hris_training_materials', []));

  useEffect(() => {
    if (isOpen) {
      setMaterials(lsGet('hris_training_materials', []));
      setSelectedOutlets([]);
      setSelectedJabatans([]);
      setSelectedMaterialId('');
      setDuration('15');
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectAllOutlets = () => setSelectedOutlets(allOutlets);
  const handleClearOutlets = () => setSelectedOutlets([]);

  const handleSelectAllJabatans = () => setSelectedJabatans(divisiOptions);
  const handleClearJabatans = () => setSelectedJabatans([]);

  const handleOutletToggle = (outlet) => {
    setSelectedOutlets(prev =>
      prev.includes(outlet) ? prev.filter(o => o !== outlet) : [...prev, outlet]
    );
  };

  const handleJabatanToggle = (jabatan) => {
    setSelectedJabatans(prev =>
      prev.includes(jabatan) ? prev.filter(j => j !== jabatan) : [...prev, jabatan]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedMaterialId) {
      alert('Harap pilih materi training.');
      return;
    }
    if (selectedOutlets.length === 0) {
      alert('Harap pilih minimal satu outlet target.');
      return;
    }
    if (selectedJabatans.length === 0) {
      alert('Harap pilih minimal satu jabatan target.');
      return;
    }
    if (!endDate) {
      alert('Harap tentukan tanggal akhir periode aktif.');
      return;
    }

    const material = materials.find(m => String(m.id) === String(selectedMaterialId));
    if (!material) {
      alert('Materi training tidak ditemukan.');
      return;
    }

    onGenerate({
      material,
      outlets: selectedOutlets,
      jabatans: selectedJabatans,
      duration: parseInt(duration) || 15,
      startDate,
      endDate
    });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        background: C.surface, width: '100%', maxWidth: '640px',
        borderRadius: '16px', border: `1px solid ${C.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', display: 'flex',
        flexDirection: 'column', maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: `1px solid ${C.border}`
        }}>
          <h3 style={{ color: C.cyan, fontWeight: 700, margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={18} /> Generate Kuis dari Materi Training
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', color: C.text, fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
              Pilih Materi Training <span style={{ color: C.danger }}>*</span>
            </label>
            {materials.length === 0 ? (
              <p style={{ color: C.danger, fontSize: '0.8rem', margin: 0, fontStyle: 'italic' }}>
                Belum ada materi training diunggah. Silakan unggah materi di Program Pelatihan &gt; Materi Training terlebih dahulu.
              </p>
            ) : (
              <select
                value={selectedMaterialId}
                onChange={e => setSelectedMaterialId(e.target.value)}
                required
                style={{
                  width: '100%', background: C.bg, color: C.text,
                  border: `1px solid ${C.border}`, borderRadius: '10px',
                  padding: '10px 14px', fontSize: '0.85rem', outline: 'none'
                }}
              >
                <option value="">-- Pilih Materi Training --</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>
                    {capitalEachWord(m.title)} ({m.type || 'Dokumen'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ color: C.text, fontSize: '0.85rem', fontWeight: 600 }}>
                Target Outlet <span style={{ color: C.danger }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={handleSelectAllOutlets} style={{ background: 'none', border: 'none', color: C.cyan, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Pilih Semua</button>
                <span style={{ color: C.border }}>|</span>
                <button type="button" onClick={handleClearOutlets} style={{ background: 'none', border: 'none', color: C.muted, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Bersihkan</button>
              </div>
            </div>
            <div style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px',
              padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '8px', maxHeight: '120px', overflowY: 'auto'
            }}>
              {allOutlets.map(o => (
                <label key={o} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: C.text, fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedOutlets.includes(o)}
                    onChange={() => handleOutletToggle(o)}
                    style={{ accentColor: C.cyan }}
                  />
                  <span>{capitalEachWord(o)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ color: C.text, fontSize: '0.85rem', fontWeight: 600 }}>
                Target Jabatan <span style={{ color: C.danger }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={handleSelectAllJabatans} style={{ background: 'none', border: 'none', color: C.cyan, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Pilih Semua</button>
                <span style={{ color: C.border }}>|</span>
                <button type="button" onClick={handleClearJabatans} style={{ background: 'none', border: 'none', color: C.muted, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Bersihkan</button>
              </div>
            </div>
            <div style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px',
              padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '8px', maxHeight: '120px', overflowY: 'auto'
            }}>
              {divisiOptions.map(j => (
                <label key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: C.text, fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedJabatans.includes(j)}
                    onChange={() => handleJabatanToggle(j)}
                    style={{ accentColor: C.cyan }}
                  />
                  <span>{capitalEachWord(j)}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', color: C.text, fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Durasi (Menit)</label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                min="5"
                required
                style={{
                  width: '100%', background: C.bg, color: C.text,
                  border: `1px solid ${C.border}`, borderRadius: '10px',
                  padding: '10px 12px', fontSize: '0.85rem', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: C.text, fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                style={{
                  width: '100%', background: C.bg, color: C.text,
                  border: `1px solid ${C.border}`, borderRadius: '10px',
                  padding: '10px 12px', fontSize: '0.85rem', outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: C.text, fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
                style={{
                  width: '100%', background: C.bg, color: C.text,
                  border: `1px solid ${C.border}`, borderRadius: '10px',
                  padding: '10px 12px', fontSize: '0.85rem', outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent', color: C.muted, border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '10px 20px', fontWeight: 600,
                fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={materials.length === 0}
              style={{
                background: C.cyan, color: C.bg, border: 'none',
                borderRadius: '10px', padding: '10px 20px', fontWeight: 700,
                fontSize: '0.85rem', cursor: 'pointer', opacity: materials.length === 0 ? 0.5 : 1
              }}
            >
              Generate & Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── MODAL TAMBAH KUIS ────────────────────────────────────────────────────────
const TambahKuisModal = ({ isOpen, onClose, onPreview, divisiOptions }) => {
  const fileRef = useRef(null);
  const dropRef = useRef(null);
  const [meta, setMeta] = useState({
    nama_kuis: '', divisi: 'Semua', durasi_menit: 30,
    periode_aktif_start: '', periode_aktif_end: '',
  });
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [parsedSoal, setParsedSoal] = useState([]);

  const reset = () => {
    setMeta({ nama_kuis: '', divisi: 'Semua', durasi_menit: 30, periode_aktif_start: '', periode_aktif_end: '' });
    setFileName('');
    setParseError('');
    setParsedSoal([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => { reset(); onClose(); };

  const parseFile = (file) => {
    if (!file) return;
    setParseError('');
    setParsedSoal([]);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rows.length) { setParseError('File kosong atau format tidak dikenali.'); return; }

        const soal = rows.map((row, idx) => {
          // Flexible header mapping
          const getVal = (...keys) => {
            for (const k of keys) {
              const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
              if (found && row[found] !== '') return String(row[found]).trim();
            }
            return '';
          };
          return {
            no: idx + 1,
            soal: getVal('Soal', 'soal', 'pertanyaan', 'question'),
            pilihan: {
              A: getVal('Jawaban A', 'jawaban_a', 'a', 'pilihan_a'),
              B: getVal('Jawaban B', 'jawaban_b', 'b', 'pilihan_b'),
              C: getVal('Jawaban C', 'jawaban_c', 'c', 'pilihan_c'),
              D: getVal('Jawaban D', 'jawaban_d', 'd', 'pilihan_d'),
              E: getVal('Jawaban E', 'jawaban_e', 'e', 'pilihan_e'),
            },
            kunci: getVal('Kunci Jawaban', 'kunci_jawaban', 'kunci', 'answer').toUpperCase(),
          };
        }).filter(s => s.soal);

        if (!soal.length) { setParseError('Tidak ditemukan baris soal yang valid. Pastikan format kolom sesuai template.'); return; }
        setParsedSoal(soal);
      } catch (err) {
        setParseError('Gagal membaca file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handlePreview = () => {
    if (!meta.nama_kuis.trim()) { setParseError('Nama kuis wajib diisi.'); return; }
    if (!parsedSoal.length) { setParseError('Upload file Excel terlebih dahulu.'); return; }
    setParseError('');
    onPreview({ meta: { ...meta, nama_kuis: capitalEachWord(meta.nama_kuis) }, soal: parsedSoal });
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: C.surface, borderRadius: '20px', border: `1.5px solid ${C.cyanBorder}`,
        padding: '36px', width: '580px', maxWidth: '95vw',
        boxShadow: `0 0 60px rgba(0,173,181,0.15)`,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{ color: C.cyan, fontSize: '1.2rem' }}>➕ Tambahkan Kuis Baru</h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Input label="Nama Kuis" required value={meta.nama_kuis}
            onChange={e => setMeta(p => ({ ...p, nama_kuis: e.target.value }))}
            placeholder="Contoh: Kuis Higiene Makanan Dan Minuman" />

          <Select label="Target Divisi / Jabatan" value={meta.divisi}
            onChange={e => setMeta(p => ({ ...p, divisi: e.target.value }))}
            options={['Semua', ...divisiOptions].map(d => ({ value: d, label: capitalEachWord(d) }))} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Input label="Durasi (Menit)" type="number" value={meta.durasi_menit}
              onChange={e => setMeta(p => ({ ...p, durasi_menit: Number(e.target.value) }))} />
            <Input label="Periode Mulai" type="date" value={meta.periode_aktif_start}
              onChange={e => setMeta(p => ({ ...p, periode_aktif_start: e.target.value }))} />
            <Input label="Periode Selesai" type="date" value={meta.periode_aktif_end}
              onChange={e => setMeta(p => ({ ...p, periode_aktif_end: e.target.value }))} />
          </div>

          {/* Drop Zone */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.muted, display: 'block', marginBottom: '8px' }}>
              File Excel Soal <span style={{ color: C.danger }}>*</span>
              <span style={{ color: C.cyan, fontWeight: 400, marginLeft: '8px' }}>
                (Format: No | Soal | Jawaban A-E | Kunci Jawaban)
              </span>
            </label>
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? C.cyan : C.border}`,
                borderRadius: '14px', padding: '36px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s ease',
                background: dragOver ? C.cyanDim : C.bg,
              }}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]); }}
              />
              <Upload size={32} color={dragOver ? C.cyan : C.muted} style={{ marginBottom: '10px' }} />
              {fileName ? (
                <p style={{ color: C.cyan, fontWeight: 700 }}>✅ {fileName} ({parsedSoal.length} soal terbaca)</p>
              ) : (
                <>
                  <p style={{ color: C.text, fontWeight: 600, marginBottom: '4px' }}>Drag & Drop file Excel di sini</p>
                  <p style={{ color: C.muted, fontSize: '0.8rem' }}>atau klik untuk pilih file (.xlsx / .xls / .csv)</p>
                </>
              )}
            </div>
          </div>

          {parseError && (
            <div style={{ background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.4)', borderRadius: '8px', padding: '12px', color: C.danger, fontSize: '0.84rem' }}>
              ⚠️ {parseError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Btn variant="secondary" onClick={handleClose}>Batal</Btn>
            <Btn variant="primary" onClick={handlePreview} disabled={!parsedSoal.length || !meta.nama_kuis.trim()}>
              <Eye size={16} /> Pratinjau Soal
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL INTERAKTIF KERJAKAN KUIS ─────────────────────────────────────────
const KerjakanKuisModal = ({ isOpen, quiz, employee, onClose, onSubmit }) => {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) { setAnswers({}); setResult(null); }
  }, [isOpen, quiz?.id]);

  if (!isOpen || !quiz || !employee) return null;

  const soalList = quiz.soal || [];
  const totalSoal = soalList.length;
  const allAnswered = Object.keys(answers).length === totalSoal;

  const handleSubmit = () => {
    let correct = 0;
    soalList.forEach((s, i) => { if (answers[i] === s.kunci) correct++; });
    const score = Math.round((correct / (totalSoal || 10)) * 100);
    const lulus = score >= 80;
    setResult({ correct, score, lulus });
    onSubmit({ score, lulus, correct, total: totalSoal });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
      zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: '30px 16px', backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        background: '#222831', borderRadius: '20px',
        border: `1.5px solid rgba(0,173,181,0.35)`,
        width: '760px', maxWidth: '98vw',
        boxShadow: '0 0 80px rgba(0,173,181,0.15)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#393E46,#2D333B)',
          borderRadius: '20px 20px 0 0', padding: '22px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(0,173,181,0.2)',
        }}>
          <div>
            <h2 style={{ color: '#00ADB5', fontSize: '1.1rem', fontWeight: 800 }}>
              📝 {capitalEachWord(quiz.nama_kuis)}
            </h2>
            <p style={{ color: '#9EA8B3', fontSize: '0.8rem', marginTop: '3px' }}>
              Karyawan: <strong style={{ color: '#EEEEEE' }}>{capitalEachWord(employee.full_name || employee.nama || '')}</strong>
              &nbsp;·&nbsp;{capitalEachWord(employee.outlet || '')} · {totalSoal} Soal
            </p>
          </div>
          {!result && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9EA8B3', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          )}
        </div>

        <div style={{ padding: '24px 28px' }}>
          {!result ? (
            <>
              {/* Soal List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                {soalList.map((s, idx) => (
                  <div key={idx} style={{
                    background: '#393E46', borderRadius: '12px', padding: '18px 20px',
                    border: `1px solid ${answers[idx] ? 'rgba(0,173,181,0.35)' : 'rgba(238,238,238,0.08)'}`,
                    transition: 'border-color 0.2s',
                  }}>
                    <p style={{ color: '#EEEEEE', fontWeight: 700, marginBottom: '14px', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      <span style={{ color: '#00ADB5', marginRight: '8px' }}>{idx + 1}.</span>
                      {s.soal}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {['A','B','C','D','E'].map(opt => {
                        const chosen = answers[idx] === opt;
                        return (
                          <button key={opt} onClick={() => setAnswers(p => ({ ...p, [idx]: opt }))}
                            style={{
                              background: chosen ? 'rgba(0,173,181,0.18)' : 'rgba(238,238,238,0.04)',
                              border: `1.5px solid ${chosen ? '#00ADB5' : 'rgba(238,238,238,0.1)'}`,
                              borderRadius: '9px', padding: '10px 14px',
                              color: chosen ? '#00ADB5' : '#EEEEEE',
                              textAlign: 'left', cursor: 'pointer', fontWeight: chosen ? 700 : 400,
                              fontSize: '0.85rem', transition: 'all 0.15s',
                              display: 'flex', alignItems: 'center', gap: '10px',
                            }}>
                            <span style={{
                              minWidth: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex',
                              alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800,
                              background: chosen ? '#00ADB5' : 'rgba(238,238,238,0.1)',
                              color: chosen ? '#222831' : '#9EA8B3',
                            }}>{opt}</span>
                            {s.pilihan[opt] || '—'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.78rem', color: '#9EA8B3' }}>
                  <span>Progress</span>
                  <span>{Object.keys(answers).length}/{totalSoal} Dijawab</span>
                </div>
                <div style={{ background: 'rgba(238,238,238,0.08)', borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '6px',
                    background: 'linear-gradient(90deg,#00ADB5,#4ECDC4)',
                    width: `${(Object.keys(answers).length / totalSoal) * 100}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Btn variant="secondary" onClick={onClose}>Batal</Btn>
                <Btn variant="primary" onClick={handleSubmit} disabled={!allAnswered}>
                  <CheckCircle size={15} /> Kumpulkan Jawaban
                </Btn>
              </div>
            </>
          ) : (
            /* Hasil / Result Screen */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '100px', height: '100px', borderRadius: '50%',
                background: result.lulus ? 'rgba(78,205,196,0.15)' : 'rgba(224,92,92,0.12)',
                border: `3px solid ${result.lulus ? '#4ECDC4' : '#E05C5C'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
                fontSize: '2.5rem',
              }}>
                {result.lulus ? '🏆' : '📚'}
              </div>

              <div style={{
                display: 'inline-block', padding: '6px 20px', borderRadius: '30px', fontWeight: 800,
                fontSize: '0.9rem', marginBottom: '14px',
                background: result.lulus ? 'rgba(78,205,196,0.18)' : 'rgba(224,92,92,0.12)',
                border: `1.5px solid ${result.lulus ? '#4ECDC4' : '#E05C5C'}`,
                color: result.lulus ? '#4ECDC4' : '#E05C5C',
              }}>
                {result.lulus ? '✅ LULUS — Kompetensi Terverifikasi' : '🔁 REMEDIAL — Perlu Pengulangan'}
              </div>

              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: result.lulus ? '#4ECDC4' : '#E05C5C', marginBottom: '6px' }}>
                {result.score}
              </div>
              <p style={{ color: '#9EA8B3', marginBottom: '20px', fontSize: '0.88rem' }}>
                {result.correct} Benar dari {result.total} Soal &nbsp;·&nbsp;
                Formula: ({result.correct}/{result.total}) × 100
              </p>

              {/* Pembahasan Soal */}
              <div style={{ textAlign: 'left', maxHeight: '320px', overflowY: 'auto', marginBottom: '20px' }}>
                <p style={{ color: '#00ADB5', fontWeight: 700, marginBottom: '12px', fontSize: '0.82rem' }}>📖 Pembahasan & Kunci Jawaban:</p>
                {soalList.map((s, idx) => {
                  const userAns = answers[idx];
                  const isCorrect = userAns === s.kunci;
                  return (
                    <div key={idx} style={{
                      background: isCorrect ? 'rgba(78,205,196,0.08)' : 'rgba(224,92,92,0.07)',
                      border: `1px solid ${isCorrect ? 'rgba(78,205,196,0.25)' : 'rgba(224,92,92,0.25)'}`,
                      borderRadius: '10px', padding: '12px 14px', marginBottom: '8px',
                    }}>
                      <p style={{ color: '#EEEEEE', fontWeight: 600, fontSize: '0.82rem', marginBottom: '6px' }}>
                        {idx+1}. {s.soal}
                      </p>
                      <p style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                        <span style={{ color: '#9EA8B3' }}>Jawaban Anda: </span>
                        <span style={{ color: isCorrect ? '#4ECDC4' : '#E05C5C', fontWeight: 700 }}>
                          {userAns || '—'} — {s.pilihan[userAns] || 'Tidak Dijawab'}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                          <span style={{ color: '#9EA8B3' }}>Kunci Benar: </span>
                          <span style={{ color: '#4ECDC4', fontWeight: 700 }}>{s.kunci} — {s.pilihan[s.kunci]}</span>
                        </p>
                      )}
                      {s.rasional && (
                        <p style={{ fontSize: '0.76rem', color: '#9EA8B3', marginTop: '4px', lineHeight: 1.5, fontStyle: 'italic' }}>
                          💡 {s.rasional}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <Btn variant="primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
                <CheckCircle size={15} /> Selesai
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function KuisKompetensi() {
  const { activeEmployees, dispatch: hrisDispatch } = useHRIS();
  const [isSendingEvent, setIsSendingEvent] = useState(false);

  // ── State utama
  const [activeTab, setActiveTab] = useState('kelola');
  // Merge quiz_bank + quiz_bank_generated on mount
  const [quizBank, setQuizBank] = useState(() => {
    const main = lsGet('quiz_bank', []);
    const gen  = lsGet('quiz_bank_generated', []);
    if (gen.length === 0) return main;
    const merged = [...main, ...gen];
    try { localStorage.setItem('quiz_bank', JSON.stringify(merged)); } catch {}
    try { localStorage.removeItem('quiz_bank_generated'); } catch {}
    return merged;
  });
  const [quizResults, setQuizResults] = useState(() => lsGet('quiz_results', []));
  const [notifications, setNotifications] = useState(() => lsGet('hris_notifications', []));


  // ── Pagination
  const QUIZ_PAGE_SIZE = 10;
  const [hasilPage, setHasilPage] = useState(1);

  // ── Kerjakan Kuis Interaktif
  const [showKerjakanModal, setShowKerjakanModal] = useState(false);
  const [kerjakanQuizId, setKerjakanQuizId] = useState('');
  const [kerjakanEmpId, setKerjakanEmpId] = useState('');

  // ── Filter
  const allOutlets = [...new Set(activeEmployees.map(e => e.outlet).filter(Boolean))].sort();
  const [selectedOutlets, setSelectedOutlets] = useState([]);
  const [showOutletDropdown, setShowOutletDropdown] = useState(false);

  // ── Modal state
  const [showTambahModal, setShowTambahModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, danger: false });

  // ── State untuk Generate Kuis dari Materi
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [trainingMaterials, setTrainingMaterials] = useState(() => lsGet('hris_training_materials', []));

  // ── AI Mock Quiz Generator — 10 Title-Cased MCQ per materi
  const generateMockQuiz = useCallback((matTitle, matDesc) => {
    const t = capitalEachWord(matTitle || 'Materi Pelatihan');
    const topik = t.replace(/Modul |Materi |Panduan |Sop |Standar /gi, '').trim() || 'Operasional Restoran';

    const templates = [
      {
        soal: `Apa Yang Dimaksud Dengan ${topik} Dalam Standar Operasional Perusahaan?`,
        pilihan: {
          A: `Prosedur Baku Yang Wajib Diikuti Seluruh Karyawan`,
          B: `Panduan Opsional Yang Dapat Diabaikan`,
          C: `Aturan Khusus Hanya Untuk Manajer`,
          D: `Kebijakan Yang Berlaku Satu Kali Saja`,
          E: `Instruksi Verbal Tanpa Dokumen Tertulis`,
        },
        kunci: 'A',
        rasional: `Standar Operasional Dalam ${topik} Adalah Prosedur Baku Yang Wajib Dipatuhi Semua Karyawan Untuk Menjaga Konsistensi Dan Kualitas Layanan.`,
      },
      {
        soal: `Mengapa ${topik} Penting Diterapkan Di Setiap Cabang Barokah Grup?`,
        pilihan: {
          A: `Hanya Untuk Memenuhi Persyaratan Audit Eksternal`,
          B: `Untuk Menjaga Standar Kualitas Dan Konsistensi Layanan Di Semua Outlet`,
          C: `Supaya Karyawan Tidak Perlu Dilatih Lagi`,
          D: `Agar Pelanggan Tidak Mengeluh`,
          E: `Karena Diwajibkan Oleh Pemerintah Daerah`,
        },
        kunci: 'B',
        rasional: `${topik} Diterapkan Untuk Memastikan Konsistensi Kualitas Dan Standar Layanan Di Seluruh Cabang Barokah Grup Secara Menyeluruh.`,
      },
      {
        soal: `Siapa Yang Bertanggung Jawab Memastikan ${topik} Berjalan Sesuai Standar Di Outlet?`,
        pilihan: {
          A: `Hanya Direktur Utama Perusahaan`,
          B: `Tim HRD Pusat Saja`,
          C: `Kepala Cabang Beserta Seluruh Tim Di Outlet`,
          D: `Karyawan Baru Yang Baru Bergabung`,
          E: `Auditor Eksternal Perusahaan`,
        },
        kunci: 'C',
        rasional: `Tanggung Jawab Penerapan ${topik} Ada Pada Kepala Cabang Dan Seluruh Tim Di Outlet, Bukan Hanya Satu Pihak Saja.`,
      },
      {
        soal: `Apa Konsekuensi Jika Karyawan Tidak Mematuhi Prosedur ${topik}?`,
        pilihan: {
          A: `Tidak Ada Konsekuensi Karena Bersifat Saran`,
          B: `Mendapat Penghargaan Khusus Dari Manajemen`,
          C: `Dipindahkan Ke Outlet Lain Secara Otomatis`,
          D: `Dapat Dikenai Sanksi Sesuai Peraturan Perusahaan`,
          E: `Gajinya Langsung Dipotong Penuh Satu Bulan`,
        },
        kunci: 'D',
        rasional: `Ketidakpatuhan Terhadap Prosedur ${topik} Dapat Berujung Pada Sanksi Sesuai Peraturan Perusahaan Yang Berlaku.`,
      },
      {
        soal: `Bagaimana Cara Yang Benar Melaporkan Temuan Masalah Terkait ${topik}?`,
        pilihan: {
          A: `Langsung Menyampaikan Ke Media Sosial`,
          B: `Diam Dan Tidak Melakukan Apa-Apa`,
          C: `Melaporkan Ke Atasan Langsung Dan Mendokumentasikannya`,
          D: `Menunggu Audit Dari HRD Pusat`,
          E: `Hanya Memberitahu Rekan Kerja Saja`,
        },
        kunci: 'C',
        rasional: `Temuan Masalah ${topik} Harus Segera Dilaporkan Ke Atasan Dan Didokumentasikan Agar Dapat Ditindaklanjuti Dengan Cepat Dan Tepat.`,
      },
      {
        soal: `Kapan Evaluasi Penerapan ${topik} Sebaiknya Dilakukan Secara Berkala?`,
        pilihan: {
          A: `Hanya Saat Ada Inspeksi Mendadak`,
          B: `Setiap Hari Tanpa Pengecualian`,
          C: `Minimal Sekali Dalam Setahun`,
          D: `Sesuai Jadwal Yang Telah Ditetapkan Manajemen`,
          E: `Tidak Perlu Dievaluasi Jika Tidak Ada Masalah`,
        },
        kunci: 'D',
        rasional: `Evaluasi ${topik} Dilakukan Sesuai Jadwal Resmi Yang Ditetapkan Manajemen Untuk Memastikan Standar Selalu Terjaga Dan Diperbarui Tepat Waktu.`,
      },
      {
        soal: `Dokumen Apa Yang Harus Dipahami Karyawan Sebelum Menerapkan ${topik}?`,
        pilihan: {
          A: `Dokumen Keuangan Perusahaan`,
          B: `Laporan Tahunan Pemegang Saham`,
          C: `Standar Operasional Prosedur (SOP) Yang Berlaku`,
          D: `Daftar Gaji Karyawan Outlet`,
          E: `Kontrak Kerja Karyawan Lain`,
        },
        kunci: 'C',
        rasional: `Sebelum Menerapkan ${topik}, Karyawan Wajib Memahami Dan Mengikuti Standar Operasional Prosedur (SOP) Resmi Yang Telah Ditetapkan Perusahaan.`,
      },
      {
        soal: `Apa Manfaat Utama Penerapan ${topik} Secara Konsisten Bagi Pelanggan?`,
        pilihan: {
          A: `Membuat Harga Produk Menjadi Lebih Mahal`,
          B: `Memperlambat Proses Pelayanan`,
          C: `Mengurangi Pilihan Menu Yang Tersedia`,
          D: `Memberikan Pengalaman Layanan Yang Konsisten Dan Memuaskan`,
          E: `Membatasi Kreatifitas Karyawan Dalam Bekerja`,
        },
        kunci: 'D',
        rasional: `Penerapan ${topik} Secara Konsisten Memberikan Pengalaman Layanan Yang Seragam Dan Memuaskan Bagi Setiap Pelanggan Di Semua Outlet.`,
      },
      {
        soal: `Apa Langkah Pertama Yang Harus Dilakukan Saat Menerima Materi ${topik} Baru?`,
        pilihan: {
          A: `Langsung Mempraktikkannya Tanpa Membaca`,
          B: `Menyimpan Dokumen Dan Tidak Membacanya`,
          C: `Membaca, Memahami, Dan Bertanya Jika Ada Yang Tidak Jelas`,
          D: `Menyerahkan Ke Rekan Kerja Untuk Dibaca`,
          E: `Menunggu Perintah Atasan Untuk Membaca`,
        },
        kunci: 'C',
        rasional: `Saat Menerima Materi ${topik} Baru, Karyawan Harus Membaca Dengan Seksama, Memahaminya, Dan Bertanya Jika Ada Hal Yang Masih Belum Dipahami.`,
      },
      {
        soal: `Bagaimana Sikap Profesional Yang Tepat Saat Menghadapi Tantangan Dalam ${topik}?`,
        pilihan: {
          A: `Menghindari Tugas Yang Berhubungan Dengan Masalah Tersebut`,
          B: `Mencari Kambing Hitam Atas Setiap Kegagalan`,
          C: `Menganalisis Masalah, Berkoordinasi, Dan Mencari Solusi Terbaik`,
          D: `Langsung Mengundurkan Diri Dari Pekerjaan`,
          E: `Mengeluh Ke Seluruh Rekan Kerja Di Outlet`,
        },
        kunci: 'C',
        rasional: `Sikap Profesional Dalam Menghadapi Tantangan ${topik} Adalah Menganalisis Masalah Secara Objektif, Berkoordinasi Dengan Tim, Dan Mencari Solusi Terbaik Bersama.`,
      },
    ];

    return {
      id: uid(),
      nama_kuis: capitalEachWord(`Kuis Kompetensi — ${t}`),
      divisi: 'Semua',
      durasi_menit: 15,
      periode_aktif_start: new Date().toISOString().slice(0, 10),
      periode_aktif_end: '',
      soal: templates,
      created_at: new Date().toISOString(),
      status: 'draft',
      generated_from_material: true,
    };
  }, []);

  const handleGenerateQuiz = (payload) => {
    const { material, outlets, jabatans, duration, startDate, endDate } = payload;
    const generated = generateMockQuiz(material.title, material.desc);
    const finalQuiz = {
      ...generated,
      nama_kuis: capitalEachWord(`Kuis Kompetensi — ${material.title}`),
      outlet: outlets,
      divisi: jabatans,
      durasi_menit: duration,
      periode_aktif_start: startDate,
      periode_aktif_end: endDate,
      status: 'draft',
    };
    saveQuizBank([...quizBank, finalQuiz]);
    setShowGenerateModal(false);
    alert('Kuis berhasil digenerate dari materi dan disimpan ke daftar draf!');
  };

  // ── Derived
  const divisiOptions = (() => {
    try {
      const roles = JSON.parse(localStorage.getItem('organizational_roles') || '[]');
      if (roles && roles.length > 0) {
        return [...new Set(roles.map(r => r.jabatan).filter(Boolean))].sort();
      }
    } catch (e) {}
    return [...new Set(activeEmployees.map(e => e.position).filter(Boolean))].sort();
  })();

  const filteredEmployees = selectedOutlets.length
    ? activeEmployees.filter(e => selectedOutlets.includes(e.outlet))
    : activeEmployees;

  // Persist changes
  const saveQuizBank = useCallback((data) => {
    setQuizBank(data);
    lsSet('quiz_bank', data);
    hrisDispatch('QUIZ_CHANGED');
  }, [hrisDispatch]);

  const saveQuizResults = useCallback((data) => {
    setQuizResults(data);
    lsSet('quiz_results', data);
    hrisDispatch('QUIZ_SENT');
  }, [hrisDispatch]);

  const saveNotifications = useCallback((data) => {
    setNotifications(data);
    lsSet('hris_notifications', data);
  }, []);

  // Listen to storage changes from simulator or mobile
  useEffect(() => {
    const h = (e) => {
      if (e.detail?.key === 'quiz_results') setQuizResults(lsGet('quiz_results', []));
      if (e.detail?.key === 'hris_notifications') setNotifications(lsGet('hris_notifications', []));
      if (e.detail?.key === 'quiz_bank') setQuizBank(lsGet('quiz_bank', []));
      if (e.detail?.key === 'hris_training_materials') setTrainingMaterials(lsGet('hris_training_materials', []));
      if (e.detail?.key === 'quiz_bank_generated') {
        // Merge generated quizzes into main bank
        const gen = lsGet('quiz_bank_generated', []);
        if (gen.length > 0) {
          setQuizBank(prev => {
            const existingIds = new Set(prev.map(q => q.id));
            const newOnes = gen.filter(q => !existingIds.has(q.id));
            const merged = [...prev, ...newOnes];
            try { localStorage.setItem('quiz_bank', JSON.stringify(merged)); } catch {}
            try { localStorage.removeItem('quiz_bank_generated'); } catch {}
            return merged;
          });
        }
      }
    };
    window.addEventListener('hris:storage', h);
    return () => window.removeEventListener('hris:storage', h);
  }, []);

  // ── Upload ke bank soal setelah pratinjau
  const handleUpload = () => {
    if (!previewData) return;
    const newQuiz = {
      id: uid(),
      nama_kuis: previewData.meta.nama_kuis,
      divisi: previewData.meta.divisi,
      durasi_menit: previewData.meta.durasi_menit,
      periode_aktif_start: previewData.meta.periode_aktif_start,
      periode_aktif_end: previewData.meta.periode_aktif_end,
      soal: previewData.soal,
      created_at: new Date().toISOString(),
      status: 'draft',
    };
    saveQuizBank([...quizBank, newQuiz]);
    setShowPreviewModal(false);
    setPreviewData(null);
  };

  const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('barokahgroupindonesia.tech')) {
      return 'https://api.barokahgroupindonesia.tech/api';
    }
    return `${window.location.protocol}//${window.location.host}/api`;
  };


  // ── Kirim Kuis ke Karyawan
  const handleSendQuiz = (quiz) => {
    const targetEmps = activeEmployees.filter(e => {
      const matchesOutlet = !quiz.outlet || quiz.outlet.length === 0 || 
        (Array.isArray(quiz.outlet) ? quiz.outlet.includes(e.outlet) : (quiz.outlet === 'Semua Outlet' || e.outlet === quiz.outlet));
      const matchesJabatan = !quiz.divisi || quiz.divisi.length === 0 || 
        (Array.isArray(quiz.divisi) ? quiz.divisi.includes(e.position) : (quiz.divisi === 'Semua' || e.position === quiz.divisi));
      return matchesOutlet && matchesJabatan;
    });

    if (!targetEmps.length) {
      alert('Tidak ada karyawan aktif yang sesuai dengan target kuis ini.');
      return;
    }

    const outletLabel = Array.isArray(quiz.outlet) ? quiz.outlet.join(', ') : (quiz.outlet || 'Semua Outlet');
    const jabatanLabel = Array.isArray(quiz.divisi) ? quiz.divisi.join(', ') : (quiz.divisi || 'Semua');

    setConfirmModal({
      isOpen: true,
      title: '🚀 Konfirmasi Pengiriman Kuis',
      message: `Kuis "${quiz.nama_kuis}" akan dikirim ke ${targetEmps.length} karyawan aktif (Outlet: ${outletLabel}, Jabatan: ${jabatanLabel}). Lanjutkan?`,
      danger: false,
      onConfirm: async () => {
        setConfirmModal(p => ({ ...p, isOpen: false }));
        setIsSendingEvent(true);

        const performLocalFallback = () => {
          hrisDispatch('QUIZ_SENT');

          // Push notifikasi ke semua target karyawan
          const now = new Date().toISOString();
          const newNotifs = targetEmps.map(emp => ({
            id: uid(),
            quiz_id: quiz.id,
            quiz_nama: quiz.nama_kuis,
            employee_id: emp.id,
            employee_name: capitalEachWord(emp.full_name || emp.nama || ''),
            outlet: capitalEachWord(emp.outlet || ''),
            status: 'unread',
            sent_at: now,
            read_at: null,
          }));

          const allNotifs = [...notifications.filter(n => n.quiz_id !== quiz.id), ...newNotifs];
          saveNotifications(allNotifs);

          // Tandai kuis sebagai terkirim
          const updated = quizBank.map(q => q.id === quiz.id ? { ...q, status: 'terkirim', sent_at: now } : q);
          saveQuizBank(updated);
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        try {
          const response = await fetch(`${getApiUrl()}/v1/dispatch-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'quiz',
              targetOutlet: outletLabel,
              targetJabatan: jabatanLabel === 'Semua' ? 'Semua Jabatan' : jabatanLabel,
              messageTitle: `Kuis Kompetensi: ${capitalEachWord(quiz.nama_kuis)}`,
              content: `Silakan kerjakan kuis kompetensi "${capitalEachWord(quiz.nama_kuis)}" di handphone Anda sebelum periode berakhir.`
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            performLocalFallback();
          } else {
            throw new Error('Server returned error status');
          }
        } catch (err) {
          console.warn('Real-time dispatcher failed or timed out. Falling back to local storage sync.', err);
          performLocalFallback();
        } finally {
          setIsSendingEvent(false);
        }
      }
    });
  };

  // ── Hapus Kuis
  const handleDeleteQuiz = (quizId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Kuis',
      message: 'Yakin ingin menghapus kuis ini dari bank soal? Semua hasil dan notifikasi terkait juga akan dihapus.',
      danger: true,
      onConfirm: () => {
        setConfirmModal(p => ({ ...p, isOpen: false }));
        saveQuizBank(quizBank.filter(q => q.id !== quizId));
        saveQuizResults(quizResults.filter(r => r.quiz_id !== quizId));
        saveNotifications(notifications.filter(n => n.quiz_id !== quizId));
      }
    });
  };

  // ── PDF Export Hasil
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Black cover
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 297, 210, 'F');

    // Title
    doc.setTextColor(0, 173, 181);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN HASIL KUIS KOMPETENSI', 148.5, 18, { align: 'center' });

    doc.setTextColor(238, 238, 238);
    doc.setFontSize(10);
    doc.text('HRIS Barokah Grup — Autonomous Quiz Competency Engine', 148.5, 25, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(158, 168, 179);
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 148.5, 30, { align: 'center' });

    const tableData = getHasilRows().map(r => [
      capitalEachWord(r.employee_name),
      capitalEachWord(r.outlet),
      capitalEachWord(r.quiz_nama),
      r.skor !== null ? r.skor : '-',
      r.skor !== null ? (r.skor > 80 ? 'LULUS ✓' : 'TIDAK LULUS ✗') : 'Belum Mengerjakan',
      r.read_status === 'read' ? 'Telah Dibaca' : 'Belum Dibaca',
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['Nama Karyawan', 'Outlet', 'Nama Kuis', 'Skor', 'Status Kelulusan', 'Status Baca']],
      body: tableData,
      theme: 'grid',
      styles: { fillColor: [0, 0, 0], textColor: [238, 238, 238], fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [0, 40, 42], textColor: [0, 173, 181], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [18, 22, 26] },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
      }
    });

    doc.save(`Laporan_Kuis_Kompetensi_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // ── Data Gabungan Tab Hasil
  const getHasilRows = () => {
    const rows = [];
    notifications.forEach(notif => {
      const quiz = quizBank.find(q => q.id === notif.quiz_id);
      const result = quizResults.find(r => r.quiz_id === notif.quiz_id && r.employee_id === notif.employee_id);
      if (!quiz) return;

      // Filter outlet
      if (selectedOutlets.length && !selectedOutlets.includes(notif.outlet)) return;

      rows.push({
        id: notif.id,
        employee_id: notif.employee_id,
        employee_name: notif.employee_name,
        outlet: notif.outlet,
        quiz_id: notif.quiz_id,
        quiz_nama: quiz.nama_kuis,
        skor: result ? result.skor : null,
        status_lulus: result ? result.skor > 80 : null,
        tanggal_selesai: result?.tanggal_selesai || null,
        read_status: notif.status,
        sent_at: notif.sent_at,
      });
    });
    return rows.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  };


  // ── Kerjakan Kuis Interaktif — submit handler
  const handleKerjakanSubmit = ({ score, lulus, correct, total }) => {
    if (!kerjakanQuizId || !kerjakanEmpId) return;
    // Mark notification as read
    const updNotifs = notifications.map(n =>
      n.quiz_id === kerjakanQuizId && n.employee_id === kerjakanEmpId
        ? { ...n, status: 'read', read_at: new Date().toISOString() }
        : n
    );
    saveNotifications(updNotifs);

    // Save result
    const existing = quizResults.filter(
      r => !(r.quiz_id === kerjakanQuizId && r.employee_id === kerjakanEmpId)
    );
    const emp = activeEmployees.find(e => e.id === kerjakanEmpId);
    const newResult = {
      id: uid(),
      quiz_id: kerjakanQuizId,
      employee_id: kerjakanEmpId,
      employee_name: capitalEachWord(emp?.full_name || emp?.nama || ''),
      outlet: capitalEachWord(emp?.outlet || ''),
      skor: score,
      status_lulus: lulus,
      tanggal_selesai: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
    };
    saveQuizResults([...existing, newResult]);
    hrisDispatch('QUIZ_SENT');
  };

  // ── Stats
  const totalKuis = quizBank.length;
  const totalTerkirim = quizBank.filter(q => q.status === 'terkirim').length;
  const totalHasil = quizResults.length;
  const totalLulus = quizResults.filter(r => r.skor > 80).length;
  const hasilRows = getHasilRows();
  const totalBelumBaca = notifications.filter(n => n.status === 'unread').length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', color: C.text }}>
      {/* Injeksi font + keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes marchingAnts {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -40; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 12px rgba(0,173,181,0.3); }
          50%      { box-shadow: 0 0 28px rgba(0,173,181,0.55); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .kuis-card { animation: fadeSlideIn 0.3s ease forwards; }
        .kuis-row:hover { background: rgba(0,173,181,0.05) !important; }
        .tab-btn-kuis { transition: all 0.2s ease; }
        .tab-btn-kuis:hover { color: #00ADB5 !important; }
        .outlet-chip { transition: all 0.15s ease; cursor: pointer; }
        .outlet-chip:hover { border-color: #00ADB5 !important; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #393E46; border-radius: 4px; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.surface} 0%, ${C.bg} 100%)`,
        borderBottom: `1px solid ${C.border}`,
        padding: '28px 32px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,173,181,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: `linear-gradient(135deg, ${C.cyan}, #007a80)`,
              borderRadius: '14px', width: '52px', height: '52px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,173,181,0.4)',
              animation: 'pulseGlow 3s ease infinite',
            }}>
              <BookOpen size={26} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
                Kuis Kompetensi
              </h1>
              <p style={{ color: C.muted, fontSize: '0.85rem', marginTop: '3px' }}>
                Autonomous Quiz & Performance Analytics Engine — Barokah Grup
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { icon: <FileText size={16} />, label: 'Total Kuis', val: totalKuis, color: C.cyan },
              { icon: <Send size={16} />, label: 'Terkirim', val: totalTerkirim, color: C.success },
              { icon: <Award size={16} />, label: 'Lulus', val: totalLulus, color: '#F5A623' },
              { icon: <Bell size={16} />, label: 'Belum Baca', val: totalBelumBaca, color: C.danger },
            ].map(s => (
              <div key={s.label} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: '12px', padding: '12px 18px',
                display: 'flex', alignItems: 'center', gap: '10px',
                minWidth: '110px',
              }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <div>
                  <p style={{ color: C.muted, fontSize: '0.7rem', marginBottom: '1px' }}>{s.label}</p>
                  <p style={{ color: s.color, fontWeight: 800, fontSize: '1.1rem' }}>{s.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FILTER MULTI-SELECT OUTLET ── */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowOutletDropdown(p => !p)}
              style={{
                background: C.surface, border: `1px solid ${selectedOutlets.length ? C.cyan : C.border}`,
                borderRadius: '10px', padding: '8px 14px', color: C.text,
                display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600,
              }}
            >
              <Filter size={15} color={selectedOutlets.length ? C.cyan : C.muted} />
              {selectedOutlets.length ? `${selectedOutlets.length} Outlet Dipilih` : 'Filter Outlet'}
              <ChevronDown size={14} />
            </button>
            {showOutletDropdown && (
              <div style={{
                position: 'absolute', top: '42px', left: 0, zIndex: 200,
                background: C.surface, border: `1px solid ${C.cyanBorder}`,
                borderRadius: '12px', minWidth: '220px', overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              }}>
                <div style={{ padding: '10px', borderBottom: `1px solid ${C.border}` }}>
                  <button onClick={() => setSelectedOutlets([])}
                    style={{ background: 'none', border: 'none', color: C.cyan, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                    Reset Semua
                  </button>
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '8px' }}>
                  {allOutlets.length === 0 && (
                    <p style={{ color: C.muted, fontSize: '0.82rem', padding: '8px' }}>Tidak ada outlet ditemukan.</p>
                  )}
                  {allOutlets.map(o => {
                    const checked = selectedOutlets.includes(o);
                    return (
                      <div key={o} className="outlet-chip"
                        onClick={() => setSelectedOutlets(p => checked ? p.filter(x => x !== o) : [...p, o])}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                          background: checked ? C.cyanDim : 'transparent',
                        }}>
                        {checked ? <CheckSquare size={15} color={C.cyan} /> : <Square size={15} color={C.muted} />}
                        <span style={{ color: checked ? C.cyan : C.text, fontSize: '0.84rem' }}>
                          {capitalEachWord(o)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Selected chips */}
          {selectedOutlets.map(o => (
            <div key={o} className="outlet-chip" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: C.cyanDim, border: `1px solid ${C.cyanBorder}`,
              borderRadius: '20px', padding: '4px 12px',
              fontSize: '0.78rem', color: C.cyan, fontWeight: 600,
            }}>
              {capitalEachWord(o)}
              <X size={12} style={{ cursor: 'pointer' }}
                onClick={() => setSelectedOutlets(p => p.filter(x => x !== o))} />
            </div>
          ))}
        </div>
      </div>

      {/* ── TAB SWITCHER ── */}
      <div style={{
        display: 'flex', gap: '4px', padding: '16px 32px 0',
        borderBottom: `1px solid ${C.border}`, background: C.surface,
      }}>
        {[
          { id: 'kelola', label: '📚 Kelola & Buat Kuis' },
          { id: 'hasil', label: '📊 Hasil Kompetensi Karyawan' },
        ].map(t => (
          <button key={t.id} className="tab-btn-kuis"
            onClick={() => setActiveTab(t.id)}
            style={{
              background: activeTab === t.id ? C.bg : 'transparent',
              border: 'none', borderRadius: '10px 10px 0 0',
              color: activeTab === t.id ? C.cyan : C.muted,
              padding: '12px 22px', fontWeight: 700, fontSize: '0.88rem',
              cursor: 'pointer', borderBottom: activeTab === t.id ? `3px solid ${C.cyan}` : '3px solid transparent',
            }}>{t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '28px 32px' }}>
        {/* ──────── TAB 1: KELOLA KUIS ──────── */}
        {activeTab === 'kelola' && (
          <div className="kuis-card">
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text }}>Bank Soal Kuis Aktif</h2>
                <p style={{ color: C.muted, fontSize: '0.82rem', marginTop: '2px' }}>
                  {quizBank.length} kuis tersimpan — {totalTerkirim} telah dikirim
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Btn variant="cyan" onClick={() => setShowGenerateModal(true)}>
                  <RefreshCw size={16} /> Generate Kuis dari Materi
                </Btn>
                <Btn variant="primary" onClick={() => setShowTambahModal(true)}>
                  <Plus size={16} /> Tambahkan Soal
                </Btn>
              </div>
            </div>

            {/* Table */}
            {quizBank.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '80px 20px',
                background: C.surface, borderRadius: '16px', border: `1px dashed ${C.border}`,
              }}>
                <Inbox size={48} color={C.muted} style={{ marginBottom: '16px' }} />
                <p style={{ color: C.text, fontWeight: 700, marginBottom: '6px' }}>Bank Soal Masih Kosong</p>
                <p style={{ color: C.muted, fontSize: '0.84rem' }}>Klik "Tambahkan Soal" atau "Generate Kuis dari Materi" untuk memulai.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '14px', border: `1px solid ${C.border}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: C.surface }}>
                      {['Nama Kuis', 'Target Outlet', 'Target Jabatan', 'Jumlah Soal', 'Durasi', 'Periode Aktif', 'Status', 'Aksi'].map(h => (
                        <th key={h} style={{ padding: '13px 16px', color: C.cyan, fontWeight: 700, textAlign: 'left', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quizBank.map((quiz, i) => (
                      <tr key={quiz.id} className="kuis-row"
                        style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}>
                        <td style={{ padding: '14px 16px', color: C.text, fontWeight: 600 }}>
                          {capitalEachWord(quiz.nama_kuis)}
                        </td>
                        <td style={{ padding: '14px 16px', color: C.muted }}>
                          {Array.isArray(quiz.outlet) ? quiz.outlet.join(', ') : (quiz.outlet || 'Semua Outlet')}
                        </td>
                        <td style={{ padding: '14px 16px', color: C.muted }}>
                          {Array.isArray(quiz.divisi) ? quiz.divisi.join(', ') : (quiz.divisi || 'Semua')}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <Badge label={`${quiz.soal?.length || 0} Soal`} />
                        </td>
                        <td style={{ padding: '14px 16px', color: C.muted }}>
                          {quiz.durasi_menit} menit
                        </td>
                        <td style={{ padding: '14px 16px', color: C.muted, fontSize: '0.78rem' }}>
                          {quiz.periode_aktif_start && quiz.periode_aktif_end
                            ? `${quiz.periode_aktif_start} s/d ${quiz.periode_aktif_end}`
                            : '-'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {quiz.status === 'terkirim'
                            ? <Badge label="✅ Terkirim" color={C.success} bg="rgba(78,205,196,0.12)" />
                            : <Badge label="📝 Draft" color={C.warn} bg="rgba(245,166,35,0.12)" />}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button title="Kirim ke Karyawan"
                              onClick={() => handleSendQuiz(quiz)}
                              style={{
                                background: C.cyanDim, border: `1px solid ${C.cyanBorder}`,
                                borderRadius: '8px', padding: '7px 12px',
                                color: C.cyan, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: '5px',
                                transition: 'all 0.15s',
                              }}>
                              <Send size={13} /> Kirim
                            </button>
                            <button title="Hapus Kuis"
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              style={{
                                background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.25)',
                                borderRadius: '8px', padding: '7px 10px',
                                color: C.danger, cursor: 'pointer',
                                display: 'flex', alignItems: 'center',
                                transition: 'all 0.15s',
                              }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ──────── TAB 2: HASIL KOMPETENSI ──────── */}
        {activeTab === 'hasil' && (
          <div className="kuis-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text }}>Hasil Kompetensi Karyawan</h2>
                <p style={{ color: C.muted, fontSize: '0.82rem', marginTop: '2px' }}>
                  {hasilRows.length} rekap pengiriman — {quizResults.length} sudah mengerjakan — {totalLulus} lulus (skor &gt; 80)
                </p>
              </div>
              {/* PDF button — pure black / white */}
              <button onClick={handleExportPDF} style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                background: '#000000', color: '#FFFFFF', border: 'none',
                borderRadius: '10px', padding: '9px 18px', fontWeight: 700,
                fontSize: '0.84rem', cursor: 'pointer',
              }}>
                <Download size={16} /> Download Laporan PDF
              </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {[
                { label: 'Total Terkirim', val: hasilRows.length, color: C.cyan, icon: <Send size={18} /> },
                { label: 'Telah Dibaca', val: hasilRows.filter(r => r.read_status === 'read').length, color: C.success, icon: <Eye size={18} /> },
                { label: 'Sudah Dikerjakan', val: hasilRows.filter(r => r.skor !== null).length, color: C.warn, icon: <CheckCircle size={18} /> },
                { label: 'Lulus (> 80)', val: totalLulus, color: '#7FBA00', icon: <Award size={18} /> },
                { label: 'Tidak Lulus', val: quizResults.filter(r => r.skor <= 80).length, color: C.danger, icon: <AlertTriangle size={18} /> },
              ].map(s => (
                <div key={s.label} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: '12px', padding: '16px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <div style={{
                    background: `${s.color}18`, border: `1px solid ${s.color}44`,
                    borderRadius: '10px', padding: '8px',
                    color: s.color, display: 'flex', alignItems: 'center',
                  }}>{s.icon}</div>
                  <div>
                    <p style={{ color: C.muted, fontSize: '0.72rem' }}>{s.label}</p>
                    <p style={{ color: s.color, fontWeight: 800, fontSize: '1.3rem' }}>{s.val}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Hasil Table */}
            {hasilRows.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '80px 20px',
                background: C.surface, borderRadius: '16px', border: `1px dashed ${C.border}`,
              }}>
                <BarChart2 size={48} color={C.muted} style={{ marginBottom: '16px' }} />
                <p style={{ color: C.text, fontWeight: 700, marginBottom: '6px' }}>Belum Ada Hasil Kuis</p>
                <p style={{ color: C.muted, fontSize: '0.84rem' }}>Kirim kuis terlebih dahulu, lalu tunggu karyawan menyelesaikan kuis di aplikasi mobile.</p>
              </div>
            ) : (() => {
              const totalPages = Math.ceil(hasilRows.length / QUIZ_PAGE_SIZE);
              const pageRows = hasilRows.slice((hasilPage - 1) * QUIZ_PAGE_SIZE, hasilPage * QUIZ_PAGE_SIZE);
              return (
                <>
                  <div style={{ overflowX: 'auto', borderRadius: '14px', border: `1px solid ${C.border}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ background: C.surface }}>
                          {['Nama Karyawan & Outlet', 'Nama Kuis', 'Skor', 'Status Kelulusan', 'Status Baca', 'Tanggal Kirim'].map(h => (
                            <th key={h} style={{ padding: '13px 16px', color: C.cyan, fontWeight: 700, textAlign: 'left', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row) => (
                          <tr key={row.id} className="kuis-row"
                            style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}>
                            {/* Combined Nama + Outlet */}
                            <td style={{ padding: '13px 16px' }}>
                              <p style={{ color: C.text, fontWeight: 700, marginBottom: '2px' }}>{capitalEachWord(row.employee_name)}</p>
                              <p style={{ color: C.muted, fontSize: '0.76rem' }}>{capitalEachWord(row.outlet)}</p>
                            </td>
                            <td style={{ padding: '13px 16px', color: C.text }}>
                              {capitalEachWord(row.quiz_nama)}
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                              {row.skor !== null ? (
                                <span style={{ fontWeight: 800, fontSize: '1rem', color: row.skor > 80 ? C.success : C.danger }}>{row.skor}</span>
                              ) : (
                                <span style={{ color: C.muted, fontSize: '0.78rem' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '13px 16px' }}>
                              {row.skor !== null ? (
                                row.skor > 80
                                  ? <Badge label="✅ Lulus" color={C.success} bg="rgba(78,205,196,0.12)" />
                                  : <Badge label="🔁 Remedial" color={C.danger} bg="rgba(224,92,92,0.1)" />
                              ) : (
                                <Badge label="⏳ Belum Mengerjakan" color={C.warn} bg="rgba(245,166,35,0.1)" />
                              )}
                            </td>
                            <td style={{ padding: '13px 16px' }}>
                              {row.read_status === 'read'
                                ? <Badge label="👁 Telah Dibaca" color={C.success} bg="rgba(78,205,196,0.1)" />
                                : <Badge label="📬 Belum Dibaca" color={C.muted} bg="rgba(158,168,179,0.1)" />}
                            </td>
                            <td style={{ padding: '13px 16px', color: C.muted, fontSize: '0.78rem' }}>
                              {row.sent_at ? new Date(row.sent_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setHasilPage(p => Math.max(1, p - 1))}
                        disabled={hasilPage === 1}
                        style={{ background: hasilPage === 1 ? 'rgba(238,238,238,0.05)' : C.cyanDim, border: `1px solid ${hasilPage === 1 ? C.border : C.cyanBorder}`, borderRadius: '8px', padding: '7px 14px', color: hasilPage === 1 ? C.muted : C.cyan, cursor: hasilPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>
                        ← Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                        <button key={pg} onClick={() => setHasilPage(pg)}
                          style={{ background: pg === hasilPage ? C.cyan : 'transparent', border: `1px solid ${pg === hasilPage ? C.cyan : C.border}`, borderRadius: '8px', padding: '7px 12px', color: pg === hasilPage ? C.bg : C.muted, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', minWidth: '36px' }}>
                          {pg}
                        </button>
                      ))}
                      <button
                        onClick={() => setHasilPage(p => Math.min(totalPages, p + 1))}
                        disabled={hasilPage === totalPages}
                        style={{ background: hasilPage === totalPages ? 'rgba(238,238,238,0.05)' : C.cyanDim, border: `1px solid ${hasilPage === totalPages ? C.border : C.cyanBorder}`, borderRadius: '8px', padding: '7px 14px', color: hasilPage === totalPages ? C.muted : C.cyan, cursor: hasilPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>
                        Next →
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}



      </div>


      {/* ── MODALS ── */}
      <TambahKuisModal
        isOpen={showTambahModal}
        onClose={() => setShowTambahModal(false)}
        divisiOptions={divisiOptions}
        onPreview={(data) => { setPreviewData(data); setShowPreviewModal(true); }}
      />

      <GenerateQuizModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerateQuiz}
        allOutlets={allOutlets}
        divisiOptions={divisiOptions}
      />

      <PreviewModal
        isOpen={showPreviewModal}
        quizMeta={previewData?.meta || {}}
        parsedSoal={previewData?.soal || []}
        onUpload={handleUpload}
        onCancel={() => { setShowPreviewModal(false); setPreviewData(null); }}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        danger={confirmModal.danger}
        confirmLabel={confirmModal.danger ? 'Ya, Hapus' : 'Konfirmasi'}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
      />

      {/* ═══ INTERAKTIF KERJAKAN KUIS MODAL ═══ */}
      <KerjakanKuisModal
        isOpen={showKerjakanModal}
        quiz={quizBank.find(q => q.id === kerjakanQuizId) || null}
        employee={activeEmployees.find(e => e.id === kerjakanEmpId) || null}
        onClose={() => setShowKerjakanModal(false)}
        onSubmit={(res) => {
          handleKerjakanSubmit(res);
          // Modal stays open to show result
        }}
      />
      {/* ═══ REAL-TIME DISPATCH EVENT OVERLAY ═══ */}
      {isSendingEvent && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 4, 10, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          pointerEvents: 'all'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px' }}>
            <svg width="100%" height="4" style={{ display: 'block', overflow: 'visible' }}>
              <line x1="0" y1="2" x2="100%" y2="2" stroke="#00ADB5" strokeWidth="4" strokeDasharray="20 12" style={{ animation: 'marchingAnts 0.3s linear infinite' }} />
            </svg>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px' }}>
            <svg width="100%" height="4" style={{ display: 'block', overflow: 'visible' }}>
              <line x1="0" y1="2" x2="100%" y2="2" stroke="#00ADB5" strokeWidth="4" strokeDasharray="20 12" style={{ animation: 'marchingAnts 0.3s linear infinite reverse' }} />
            </svg>
          </div>
          <div style={{
            border: '1px solid #00ADB5',
            padding: '24px 36px',
            borderRadius: '12px',
            backgroundColor: '#1E222B',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(0, 173, 181, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: '3px solid rgba(0,173,181,0.2)',
              borderTopColor: '#00ADB5',
              animation: 'spin 0.8s linear infinite'
            }} />
            <span style={{ color: '#00ADB5', fontWeight: 'bold' }}>
              Menghubungkan & Mengirimkan Sinyal Kuis Real-Time...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
