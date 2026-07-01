import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function KpiLeaderboard({
  C,
  lbMonth,
  setLbMonth,
  monthsList,
  lbYear,
  setLbYear,
  yearsList,
  outletsList,
  lbSelectedOutlets,
  toggleLbOutlet,
  leaderboardRows,
  lbPage,
  setLbPage
}) {
  return (
    <div>
      {/* HEADER MULTI-SELECT OUTLET & PERIOD */}
      <div style={{ background: C.surface, padding: '24px', borderRadius: '14px', border: `1px solid ${C.border}`, marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: C.cyan, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            🏆 Filter Leaderboard (Multi-Select Outlet)
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select className="form-select" style={{ width: '140px', padding: '6px 10px' }} value={lbMonth} onChange={e => setLbMonth(e.target.value)}>
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select className="form-select" style={{ width: '100px', padding: '6px 10px' }} value={lbYear} onChange={e => setLbYear(e.target.value)}>
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '10px',
          marginTop: '12px'
        }}>
          {outletsList.map(o => {
            const isSelected = lbSelectedOutlets.includes(o);
            const displayLabel = o === 'Semua Outlet' 
              ? '🌐 Semua Outlet' 
              : '📍 ' + o.replace('AYAM PECAK 2001 SEAFOOD ', '').replace('PECEL LELE ', '');
            return (
              <button
                key={o}
                onClick={() => toggleLbOutlet(o)}
                style={{
                  background: isSelected ? `${C.cyan}18` : C.surface,
                  border: `1.5px solid ${isSelected ? C.cyan : C.border}`,
                  color: isSelected ? C.cyan : C.muted,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}
                title={o}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* LEADERBOARD TABLE dengan Pagination & PDF Download */}
      <div style={{ background: C.surface, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: C.cyan, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            🏆 Klasemen Performa Karyawan Barokah Grup
          </h2>
        </div>
        
        {leaderboardRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px' }}>
            <ShieldAlert size={40} color={C.muted} style={{ marginBottom: '12px' }} />
            <p style={{ color: C.muted, margin: 0, fontSize: '0.84rem' }}>Tidak ditemukan data penilaian performa pada kriteria saringan ini.</p>
          </div>
        ) : (() => {
          const LB_PAGE_SIZE = 10;
          const totalLbPages = Math.ceil(leaderboardRows.length / LB_PAGE_SIZE);
          const paginatedRows = leaderboardRows.slice((lbPage - 1) * LB_PAGE_SIZE, lbPage * LB_PAGE_SIZE);
          const startIndex = (lbPage - 1) * LB_PAGE_SIZE;

          return (
            <div>
              <div style={{ overflowX: 'auto' }}>
                <table className="kpi-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', width: '90px' }}>PERINGKAT</th>
                      <th>NAMA STAF &amp; CABANG</th>
                      <th>JABATAN</th>
                      <th style={{ textAlign: 'center' }}>TOTAL POIN AKHIR KPI</th>
                      <th>REKOMENDASI BONUS INSENTIF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row, idx) => {
                      const rank = startIndex + idx + 1;
                      let rankBadge = null;
                      if (rank === 1) rankBadge = (<span style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#222831', padding: '6px 14px', borderRadius: '20px', fontWeight: 900, fontSize: '0.78rem', boxShadow: '0 0 10px rgba(255,215,0,0.3)' }}>🥇 1st Gold</span>);
                      else if (rank === 2) rankBadge = (<span style={{ background: 'linear-gradient(135deg, #C0C0C0, #808080)', color: '#222831', padding: '6px 14px', borderRadius: '20px', fontWeight: 900, fontSize: '0.78rem' }}>🥈 2nd Silver</span>);
                      else if (rank === 3) rankBadge = (<span style={{ background: 'linear-gradient(135deg, #CD7F32, #8B4513)', color: '#FFFFFF', padding: '6px 14px', borderRadius: '20px', fontWeight: 900, fontSize: '0.78rem' }}>🥉 3rd Bronze</span>);
                      else rankBadge = (<span style={{ fontWeight: 800, color: C.muted }}>#{rank}</span>);

                      return (
                        <tr key={row.id}>
                          <td style={{ textAlign: 'center' }}>{rankBadge}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: C.text }}>{row.name}</div>
                            <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '2px' }}>📍 {row.outlet}</div>
                          </td>
                          <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{row.position}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ padding: '6px 12px', borderRadius: '8px', background: `${C.cyan}12`, border: `1px solid ${C.cyanBorder}`, color: C.cyan, fontWeight: 900, fontSize: '0.88rem' }}>
                              {row.finalScore} / 100
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: row.finalScore >= 75 ? C.success : C.danger }}>
                            {row.bonusRecommendation}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalLbPages > 1 && (
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', marginTop:'16px' }}>
                  <button onClick={() => setLbPage(p => Math.max(1, p-1))} disabled={lbPage===1}
                    style={{ background: lbPage===1 ? C.surface : C.cyanDim, border:`1px solid ${lbPage===1 ? C.border : C.cyanBorder}`, color: lbPage===1 ? C.muted : C.cyan, borderRadius:'8px', padding:'6px 14px', cursor: lbPage===1 ? 'not-allowed' : 'pointer', fontWeight:700, fontSize:'0.82rem' }}>
                    &laquo; Prev
                  </button>
                  <span style={{ color: C.muted, fontSize:'0.82rem' }}>{lbPage} / {totalLbPages}</span>
                  <button onClick={() => setLbPage(p => Math.min(totalLbPages, p+1))} disabled={lbPage===totalLbPages}
                    style={{ background: lbPage===totalLbPages ? C.surface : C.cyanDim, border:`1px solid ${lbPage===totalLbPages ? C.border : C.cyanBorder}`, color: lbPage===totalLbPages ? C.muted : C.cyan, borderRadius:'8px', padding:'6px 14px', cursor: lbPage===totalLbPages ? 'not-allowed' : 'pointer', fontWeight:700, fontSize:'0.82rem' }}>
                    Next &raquo;
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
