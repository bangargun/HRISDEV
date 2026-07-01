import React from 'react';
import { Clipboard, Trash2 } from 'lucide-react';

export default function KpiTargetDistribution({
  C,
  bulanTerkait,
  setBulanTerkait,
  tahunTerkait,
  setTahunTerkait,
  judulSurvei,
  tipePaket,
  setTipePaket,
  targetOutlet,
  setTargetOutlet,
  outletsList,
  tanggalKirim,
  setTanggalKirim,
  handleKirimSurvei,
  getTargetEmployeesForSurvey,
  surveys,
  handleHapusSurvei
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '24px', alignItems: 'start' }}>
      
      {/* FORM KIRIM SURVEI */}
      <div style={{ background: C.surface, borderRadius: '14px', border: `1.5px solid ${C.cyanBorder}`, padding: '24px', boxShadow: '0 4px 30px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '18px', color: C.cyan, display: 'flex', alignItems: 'center', gap: '8px' }}>
          🚀 Kirim Instrumen Survei Baru
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: C.muted, fontWeight: 700, marginBottom: '6px' }}>BULAN TERKAIT</label>
              <select className="form-select" value={bulanTerkait} onChange={e => setBulanTerkait(Number(e.target.value))}>
                {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: C.muted, fontWeight: 700, marginBottom: '6px' }}>TAHUN TERKAIT</label>
              <select className="form-select" value={tahunTerkait} onChange={e => setTahunTerkait(Number(e.target.value))}>
                {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: C.muted, fontWeight: 700, marginBottom: '6px' }}>NOMOR SURVEI 360 (OTOMATIS)</label>
            <input type="text" className="form-input" value={judulSurvei} readOnly style={{ background: 'var(--bg-main)', opacity: 0.8, color: C.cyan, fontWeight: 'bold' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: C.muted, fontWeight: 700, marginBottom: '6px' }}>TIPE PAKET SOAL</label>
            <select className="form-select" value={tipePaket} onChange={e => setTipePaket(e.target.value)}>
              <option value="staf">👥 Paket Soal Karyawan (Staff Peer-to-Peer)</option>
              <option value="leader">👑 Paket Soal Leader (Feedback Lintas Jabatan)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: C.muted, fontWeight: 700, marginBottom: '6px' }}>TARGET OUTLET DISTRIBUSI</label>
            <select className="form-select" value={targetOutlet} onChange={e => setTargetOutlet(e.target.value)}>
              {outletsList.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: C.muted, fontWeight: 700, marginBottom: '6px' }}>TANGGAL PENGIRIMAN</label>
            <input type="date" className="form-input" value={tanggalKirim} onChange={e => setTanggalKirim(e.target.value)} />
          </div>

          <div style={{ marginTop: '10px', background: 'rgba(0,173,181,0.06)', borderRadius: '10px', border: `1px dashed ${C.cyanBorder}`, padding: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: C.cyan, fontWeight: 700, display: 'block', marginBottom: '4px' }}>ℹ️ MATRIKS LOGIKA TARGET JABATAN:</span>
            <p style={{ margin: 0, fontSize: '0.75rem', color: C.muted, lineHeight: '1.4' }}>
              {tipePaket === 'staf' 
                ? '• Karyawan biasa di outlet target akan otomatis saling menilai satu sama lain (Peer-to-Peer).' 
                : '• Kepala Cabang dinilai oleh seluruh kru outlet.\n• Kepala Produksi dinilai Koki, Helper, Bartender.\n• Kepala Layanan dinilai Kasir & Waiters.'}
            </p>
          </div>

          <button className="action-btn btn-cyan" style={{ justifyContent: 'center', width: '100%', padding: '12px', marginTop: '10px' }} onClick={handleKirimSurvei} disabled={!judulSurvei.trim()}>
            🚀 Kirim & Siarkan Survei ke HP Target ({getTargetEmployeesForSurvey(tipePaket, targetOutlet).length} Orang)
          </button>
        </div>
      </div>

      {/* TRACKER STATUS PENGIRIMAN */}
      <div style={{ background: C.surface, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '24px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📋 Tracker Status Pengiriman Survei
        </h2>
        {surveys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', border: `1px dashed ${C.border}`, borderRadius: '10px' }}>
            <Clipboard size={40} color={C.muted} style={{ marginBottom: '12px' }} />
            <p style={{ color: C.muted, margin: 0, fontSize: '0.84rem' }}>Belum ada survei yang didistribusikan. Kirim survei baru di sebelah kiri.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="kpi-table">
              <thead>
                <tr>
                  <th>TANGGAL KIRIM</th>
                  <th>JUDUL SURVEI</th>
                  <th>TIPE PAKET</th>
                  <th>TARGET OUTLET</th>
                  <th>KETERANGAN PENERIMA</th>
                  <th style={{ textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.tanggal_kirim}</td>
                    <td style={{ color: C.cyan, fontWeight: 700 }}>{s.judul}</td>
                    <td>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: s.tipe_paket === 'leader' ? 'rgba(245,166,35,0.15)' : 'rgba(78,205,196,0.15)', color: s.tipe_paket === 'leader' ? C.warn : C.success, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        {s.tipe_paket === 'leader' ? '👑 Leader' : '👥 Staf'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.outlet}</td>
                    <td style={{ fontWeight: 700, color: C.success }}>
                      🟢 {s.penerima_count} Karyawan Telah Menerima
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="action-btn btn-danger-dim" style={{ padding: '6px 10px', margin: '0 auto' }} onClick={() => handleHapusSurvei(s.id)}>
                        <Trash2 size={13} /> Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
