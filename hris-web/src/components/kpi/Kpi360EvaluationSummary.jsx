import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function Kpi360EvaluationSummary({
  C,
  filterMonth,
  setFilterMonth,
  monthsList,
  filterYear,
  setFilterYear,
  yearsList,
  filterOutlet,
  setFilterOutlet,
  outletsList,
  hasil360Rows
}) {
  return (
    <div>
      {/* HEADER FILTER REAKTIF */}
      <div style={{ display: 'flex', gap: '16px', background: C.surface, padding: '20px', borderRadius: '12px', border: `1px solid ${C.border}`, marginBottom: '24px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: C.cyan, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          ⚡ Filter Reaktif:
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '12px', flex: 1 }}>
          <select className="form-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            {monthsList.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select className="form-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            {yearsList.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select className="form-select" value={filterOutlet} onChange={e => setFilterOutlet(e.target.value)}>
            {outletsList.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABEL HASIL EVALUASI */}
      <div style={{ background: C.surface, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
            📊 Akumulasi Skor Evaluasi 360°
          </h2>
          <span style={{ fontSize: '0.8rem', color: C.muted }}>
            Bulan: <strong>{monthsList.find(m => m.value === Number(filterMonth))?.label} {filterYear}</strong> • Outlet: <strong>{filterOutlet}</strong>
          </span>
        </div>

        {hasil360Rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px' }}>
            <ShieldAlert size={40} color={C.muted} style={{ marginBottom: '12px' }} />
            <p style={{ color: C.muted, margin: 0, fontSize: '0.84rem' }}>Tidak ditemukan data penilaian 360° pada periode dan outlet ini.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="kpi-table">
              <thead>
                <tr>
                  <th>NAMA KARYAWAN & OUTLET</th>
                  <th>JABATAN</th>
                  <th style={{ textAlign: 'center' }}>RATAAN SKOR KARYAWAN (PEER)</th>
                  <th style={{ textAlign: 'center' }}>RATAAN SKOR LEADER</th>
                  <th style={{ textAlign: 'center' }}>TOTAL RESPONDEN MENILAI</th>
                  <th style={{ textAlign: 'center', color: C.cyan }}>NILAI KONVERSI AKHIR (100)</th>
                </tr>
              </thead>
              <tbody>
                {hasil360Rows.map(row => (
                  <tr key={row.employee_id}>
                    <td>
                      <div style={{ fontWeight: 700, color: C.text }}>{row.name}</div>
                      <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '2px' }}>📍 {row.outlet}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{row.position}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: row.avgStaf ? C.success : C.muted }}>
                      {row.avgStaf !== null ? `${row.avgStaf} Poin` : '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: row.avgLeader ? C.warn : C.muted }}>
                      {row.avgLeader !== null ? `${row.avgLeader} Poin` : '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      👥 {row.totalResponders} Responden
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ padding: '6px 12px', borderRadius: '20px', background: `${C.cyan}18`, border: `1.5px solid ${C.cyanBorder}`, color: C.cyan, fontWeight: 800, fontSize: '0.9rem' }}>
                        {row.finalScore} / 100
                      </span>
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
