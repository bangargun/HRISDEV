import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function KpiAccumulativeScores({
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
  kpiAkumulatifRows,
  handleOpenBriefingModal
}) {
  return (
    <div>
      {/* HEADER FILTER REAKTIF */}
      <div style={{ display: 'flex', gap: '16px', background: C.surface, padding: '20px', borderRadius: '12px', border: `1px solid ${C.border}`, marginBottom: '24px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: C.cyan, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          🧠 Filter Brain Engine:
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

      {/* TABLE REKAPAN GLOBAL */}
      <div style={{ background: C.surface, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              🧠 Lembar Rekapitulasi KPI Lintas Modul
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: C.muted }}>
              Berdasarkan formula: <strong>Absensi (25%) + Keterlambatan (25%) + Survei 360 (30%) + Training (10%) + Kuis (10%)</strong>
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: '6px', background: C.dangerDim, color: C.danger, border: `1px solid ${C.dangerBorder}`, fontWeight: 700 }}>
            ⚠️ Alarm KPI &lt; 75 Aktif
          </span>
        </div>

        {kpiAccumulativeRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px' }}>
            <ShieldAlert size={40} color={C.muted} style={{ marginBottom: '12px' }} />
            <p style={{ color: C.muted, margin: 0, fontSize: '0.84rem' }}>Tidak ditemukan data karyawan pada filter ini.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="kpi-table">
              <thead>
                <tr>
                  <th>NAMA KARYAWAN & OUTLET</th>
                  <th>JABATAN</th>
                  <th style={{ textAlign: 'center' }}>ABSENSI (25%*)</th>
                  <th style={{ textAlign: 'center' }}>DISIPLIN (25%*)</th>
                  <th style={{ textAlign: 'center' }}>SURVEI 360 (30%)</th>
                  <th style={{ textAlign: 'center' }}>TRAINING (10%)</th>
                  <th style={{ textAlign: 'center' }}>KUIS (10%)</th>
                  <th style={{ textAlign: 'center' }}>BRIEFING (10%*)</th>
                  <th style={{ textAlign: 'center', color: C.cyan }}>FINAL SCORE KPI</th>
                </tr>
              </thead>
              <tbody>
                {kpiAccumulativeRows.map(row => {
                  const isAlarm = row.finalScore < 75;
                  return (
                    <tr key={row.id} style={{ background: isAlarm ? C.dangerDim : 'transparent' }}>
                      <td>
                        {isAlarm ? (
                          <span style={{ background: C.danger, color: '#FFFFFF', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.88rem', display: 'inline-block' }}>
                            🚨 {row.name}
                          </span>
                        ) : (
                          <div style={{ fontWeight: 700 }}>{row.name}</div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '3px' }}>📍 {row.outlet}</div>
                      </td>
                      <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                        {row.position}
                        {row.isKepalaCabang && (
                          <button
                            onClick={() => handleOpenBriefingModal(row.id, row.name)}
                            style={{
                              display: 'block',
                              marginTop: '6px',
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1.5px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '6px',
                              color: '#3B82F6',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)' }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)' }}
                          >
                            📝 Briefing Log
                          </button>
                        )}
                      </td>
                      
                      {/* Absensi */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700 }}>{row.attendancePct}%</div>
                        <div style={{ fontSize: '0.68rem', color: C.muted }}>
                          +{row.weightedAttendance} Poin
                          {row.isKepalaCabang && <span style={{ display: 'block', fontSize: '0.6rem', color: C.cyan }}>(Bobot 20%)</span>}
                        </div>
                      </td>

                      {/* Disiplin */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700 }}>{row.disciplinePct}%</div>
                        <div style={{ fontSize: '0.68rem', color: C.muted }}>
                          +{row.weightedDiscipline} Poin
                          {row.isKepalaCabang && <span style={{ display: 'block', fontSize: '0.6rem', color: C.cyan }}>(Bobot 20%)</span>}
                        </div>
                      </td>

                      {/* Survei 360 */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700 }}>{row.surveyPct} Poin</div>
                        <div style={{ fontSize: '0.68rem', color: C.muted }}>+{row.weightedSurvey} Poin</div>
                      </td>

                      {/* Training */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700 }}>{row.trainingPct} Poin</div>
                        <div style={{ fontSize: '0.68rem', color: C.muted }}>+{row.weightedTraining} Poin</div>
                      </td>

                      {/* Kuis */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700 }}>{row.quizPct} Poin</div>
                        <div style={{ fontSize: '0.68rem', color: C.muted }}>+{row.weightedQuiz} Poin</div>
                      </td>

                      {/* Briefing */}
                      <td style={{ textAlign: 'center' }}>
                        {row.isKepalaCabang ? (
                          <>
                            <div style={{ fontWeight: 700 }}>{row.briefingPct}%</div>
                            <div style={{ fontSize: '0.68rem', color: C.muted }}>+{row.weightedBriefing} Poin</div>
                          </>
                        ) : (
                          <div style={{ color: C.muted, fontSize: '0.78rem' }}>—</div>
                        )}
                      </td>

                      {/* Final Score */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          padding: '6px 14px', 
                          borderRadius: '20px', 
                          background: isAlarm ? C.danger : `${C.success}18`, 
                          border: `1.5px solid ${isAlarm ? C.danger : C.cyan}`, 
                          color: isAlarm ? '#FFFFFF' : C.success, 
                          fontWeight: 900, 
                          fontSize: '0.94rem' 
                        }}>
                          {row.finalScore} Poin
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: '16px', padding: '12px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '0.74rem', color: C.muted, lineHeight: '1.4' }}>
          💡 <strong>Keterangan Bobot Formula:</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
            <li><strong>Karyawan / Staf Biasa:</strong> Absensi (25%) + Disiplin (25%) + Survei 360 (30%) + Training (10%) + Kuis (10%)</li>
            <li><strong>Kepala Cabang:</strong> Absensi (20%) + Disiplin (20%) + Survei 360 (30%) + Training (10%) + Kuis (10%) + Kegiatan Briefing (10%)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
