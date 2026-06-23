import { dbQuery } from '../config/db.js';

/**
 * Mengambil daftar informasi/pengumuman untuk karyawan aktif
 */
export async function getInformations(req, res) {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({
        status: 'error',
        message: 'Akses ditolak: ID Karyawan tidak teridentifikasi.'
      });
    }

    // Ambil broadcast/informasi dari database MySQL
    const rows = await dbQuery.all(
      `SELECT id, title, message, outlet, created_at, is_read, response, read_at
       FROM mobile_user_notifications
       WHERE employee_id = ? AND type = 'broadcast'
       ORDER BY created_at DESC`,
      [employeeId]
    );

    // Map database rows to InformationRecord model format expected by client
    const data = rows.map(row => ({
      id: Number(row.id),
      kategori: 'Pengumuman',
      judul: row.title || 'Notifikasi',
      isi_informasi: row.message || '',
      hanya_outlet_terpilih: row.outlet ? 1 : 0,
      berlaku_di: row.outlet || 'Semua Outlet',
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      is_read: row.is_read === 1,
      response: row.response || null,
      read_at: row.read_at ? new Date(row.read_at).toISOString() : null
    }));

    return res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    console.error('getInformations error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data papan informasi.'
    });
  }
}

/**
 * Menandai informasi dibaca dengan menyertakan feedback respon
 */
export async function markInformationRead(req, res) {
  const { id } = req.params;
  const { response } = req.body; // e.g. 'siap' or 'tanya_admin'
  const employeeId = req.user.employeeId;

  if (!employeeId) {
    return res.status(400).json({
      status: 'error',
      message: 'Akses ditolak: ID Karyawan tidak teridentifikasi.'
    });
  }

  try {
    const notif = await dbQuery.get(
      "SELECT id FROM mobile_user_notifications WHERE id = ? AND employee_id = ? AND type = 'broadcast'",
      [id, employeeId]
    );

    if (!notif) {
      return res.status(404).json({
        status: 'error',
        message: 'Informasi tidak ditemukan.'
      });
    }

    await dbQuery.run(
      `UPDATE mobile_user_notifications 
       SET is_read = 1, response = ?, read_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [response || 'siap', id]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Informasi berhasil ditandai dibaca.'
    });
  } catch (error) {
    console.error('markInformationRead error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menandai informasi dibaca.'
    });
  }
}
