import { dbQuery } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Memanggil skrip python untuk mendeteksi wajah & memberikan watermark timestamp
 */
async function verifyFaceAndWatermark(filePath) {
  try {
    const scriptPath = path.resolve('src', 'utils', 'face_detector.py');
    const absoluteFilePath = path.resolve(filePath.startsWith('/') ? filePath.substring(1) : filePath);
    
    const { stdout } = await execPromise(`python3 "${scriptPath}" "${absoluteFilePath}"`);
    const output = stdout.trim();
    
    if (output.includes('SUCCESS')) {
      return { success: true };
    } else if (output.includes('FAILED:')) {
      return { success: false, message: output.split('FAILED:')[1].trim() };
    }
    return { success: false, message: 'Wajah tidak terdeteksi pada foto selfie Anda.' };
  } catch (error) {
    console.error('Face verification execution error:', error);
    return { success: false, message: 'Gagal memproses verifikasi wajah pada foto selfie.' };
  }
}

/**
 * Menyimpan foto selfie base64 ke file fisik lokal di folder uploads
 */
function saveSelfieImage(photoBase64, employeeId, prefix) {
  if (!photoBase64) return null;
  try {
    const matches = photoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      // Jika bukan format data URI base64 lengkap, coba asumsikan raw base64 jpeg
      const imageBuffer = Buffer.from(photoBase64, 'base64');
      const filename = `${prefix}_${employeeId}_${Date.now()}.jpg`;
      const uploadPath = path.resolve('uploads', filename);
      if (!fs.existsSync(path.resolve('uploads'))) {
        fs.mkdirSync(path.resolve('uploads'), { recursive: true });
      }
      fs.writeFileSync(uploadPath, imageBuffer);
      return `/uploads/${filename}`;
    }
    const imageBuffer = Buffer.from(matches[2], 'base64');
    const extension = matches[1].split('/')[1] || 'jpg';
    const filename = `${prefix}_${employeeId}_${Date.now()}.${extension}`;
    const uploadPath = path.resolve('uploads', filename);
    if (!fs.existsSync(path.resolve('uploads'))) {
      fs.mkdirSync(path.resolve('uploads'), { recursive: true });
    }
    fs.writeFileSync(uploadPath, imageBuffer);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error saving selfie image:', error.message);
    return null;
  }
}

// Pengaturan geofencing dan absensi diambil secara dinamis dari database (tabel system_settings)
// Dengan nilai fallback statis jika database kosong.

/**
 * Formula Haversine untuk menghitung jarak antara dua koordinat GPS dalam satuan meter
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius bumi dalam meter
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Jarak dalam meter
}

/**
 * Mendapatkan tanggal hari ini (Format: YYYY-MM-DD) di timezone lokal
 */
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Mendapatkan waktu sekarang (Format: HH:MM:SS)
 */
function getCurrentTimeString() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

/**
 * Clock-In Absensi (Karyawan via Android)
 */
export async function clockIn(req, res) {
  const { latitude, longitude, photo_selfie, notes } = req.body;
  const employeeId = req.user.employeeId;

  if (!employeeId) {
    return res.status(400).json({
      status: 'error',
      message: 'Profil karyawan tidak ditemukan untuk akun ini.'
    });
  }

  if (!photo_selfie) {
    return res.status(400).json({
      status: 'error',
      message: '❌ Foto selfie wajib disertakan untuk verifikasi absensi masuk.'
    });
  }

  try {
    // 1. Ambil pengaturan absensi dinamis dari database
    const settingsRows = await dbQuery.all("SELECT \`key\`, value FROM system_settings");
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.key] = row.value;
    });

    const clockInDeadline = settings['clock_in_deadline'] || '08:00:00';
    const todayDate = getTodayDateString();
    
    // 2. Periksa apakah sudah pernah Clock-In hari ini
    const existingAttendance = await dbQuery.get(
      "SELECT id FROM attendances WHERE employee_id = ? AND date = ?",
      [employeeId, todayDate]
    );

    if (existingAttendance) {
      return res.status(400).json({
        status: 'error',
        message: 'Anda sudah melakukan absensi masuk (Clock-In) hari ini.'
      });
    }

    // Simpan foto selfie
    const photoPath = saveSelfieImage(photo_selfie, employeeId, 'selfie_in');
    if (!photoPath) {
      return res.status(400).json({
        status: 'error',
        message: 'Gagal menyimpan foto selfie absensi.'
      });
    }

    // Verifikasi wajah & Timestamp watermark
    const verification = await verifyFaceAndWatermark(photoPath);
    if (!verification.success) {
      // Hapus file sampah
      try {
        fs.unlinkSync(path.resolve(photoPath.substring(1)));
      } catch (_) {}
      return res.status(400).json({
        status: 'error',
        message: `❌ Absensi Ditolak: ${verification.message}`
      });
    }

    // 3. Tentukan status ketepatan waktu
    const clockInTime = getCurrentTimeString();
    const statusIn = clockInTime > clockInDeadline ? 'late' : 'ontime';

    // 4. Rekam data absensi (tanpa perlu geofencing)
    await dbQuery.run(`
      INSERT INTO attendances (employee_id, date, clock_in, lat_in, lng_in, status_in, photo_in_url, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      employeeId,
      todayDate,
      clockInTime,
      latitude !== undefined ? latitude : null,
      longitude !== undefined ? longitude : null,
      statusIn,
      photoPath,
      notes ? notes.trim() : null
    ]);

    // Kirim sapaan motivasi masuk kerja otomatis
    await sendSapaanAI(employeeId, 'masuk');

    return res.status(200).json({
      status: 'success',
      message: 'Absensi masuk (Clock-In) berhasil dicatat.',
      data: {
        time: clockInTime,
        status: statusIn
      }
    });

  } catch (error) {
    console.error('ClockIn error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mencatat absensi masuk.'
    });
  }
}

/**
 * Clock-Out Absensi (Karyawan via Android)
 */
export async function clockOut(req, res) {
  const { latitude, longitude, photo_selfie } = req.body;
  const employeeId = req.user.employeeId;

  if (!employeeId) {
    return res.status(400).json({
      status: 'error',
      message: 'Profil karyawan tidak ditemukan untuk akun ini.'
    });
  }

  if (!photo_selfie) {
    return res.status(400).json({
      status: 'error',
      message: '❌ Foto selfie wajib disertakan untuk verifikasi absensi keluar.'
    });
  }

  try {
    const todayDate = getTodayDateString();

    // 1. Cari data absensi masuk hari ini
    const attendance = await dbQuery.get(
      "SELECT id, clock_out FROM attendances WHERE employee_id = ? AND date = ?",
      [employeeId, todayDate]
    );

    if (!attendance) {
      return res.status(400).json({
        status: 'error',
        message: 'Gagal: Anda belum melakukan absensi masuk (Clock-In) hari ini.'
      });
    }

    if (attendance.clock_out) {
      return res.status(400).json({
        status: 'error',
        message: 'Anda sudah melakukan absensi keluar (Clock-Out) hari ini.'
      });
    }

    // Simpan foto selfie
    const photoPath = saveSelfieImage(photo_selfie, employeeId, 'selfie_out');
    if (!photoPath) {
      return res.status(400).json({
        status: 'error',
        message: 'Gagal menyimpan foto selfie absensi.'
      });
    }

    // Verifikasi wajah & Timestamp watermark
    const verification = await verifyFaceAndWatermark(photoPath);
    if (!verification.success) {
      // Hapus file sampah
      try {
        fs.unlinkSync(path.resolve(photoPath.substring(1)));
      } catch (_) {}
      return res.status(400).json({
        status: 'error',
        message: `❌ Absensi Ditolak: ${verification.message}`
      });
    }

    // 2. Catat Clock-Out
    const clockOutTime = getCurrentTimeString();
    await dbQuery.run(`
      UPDATE attendances
      SET clock_out = ?, lat_out = ?, lng_out = ?, photo_out_url = ?
      WHERE id = ?
    `, [
      clockOutTime, 
      latitude !== undefined ? latitude : null, 
      longitude !== undefined ? longitude : null, 
      photoPath, 
      attendance.id
    ]);
    
    // Kirim sapaan motivasi bersyukur pulang otomatis
    await sendSapaanAI(employeeId, 'keluar');

    return res.status(200).json({
      status: 'success',
      message: 'Absensi keluar (Clock-Out) berhasil dicatat.',
      data: {
        time: clockOutTime
      }
    });

  } catch (error) {
    console.error('ClockOut error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mencatat absensi keluar.'
    });
  }
}

/**
 * Mendapatkan Status Kehadiran Hari Ini
 */
export async function getTodayAttendance(req, res) {
  const employeeId = req.user.employeeId;

  if (!employeeId) {
    return res.status(200).json({
      status: 'success',
      data: null
    });
  }

  try {
    const todayDate = getTodayDateString();
    const attendance = await dbQuery.get(
      "SELECT * FROM attendances WHERE employee_id = ? AND date = ?",
      [employeeId, todayDate]
    );

    return res.status(200).json({
      status: 'success',
      data: attendance || null
    });
  } catch (error) {
    console.error('GetTodayAttendance error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil status kehadiran hari ini.'
    });
  }
}

/**
 * Mendapatkan Riwayat Kehadiran (Karyawan melihat profil sendiri, Owner/Admin melihat semua)
 */
export async function getAttendanceHistory(req, res) {
  const { employeeId, period } = req.query; // period format: YYYY-MM

  try {
    let sql = `
      SELECT a.id, a.date, a.clock_in, a.clock_out, a.status_in, a.notes, e.full_name, e.nik, e.department, e.outlet, 
             a.jam_mulai_istirahat, a.jam_akhir_istirahat, a.ikut_briefing,
             a.photo_in_url, a.photo_out_url, a.photo_break_start_url, a.photo_break_end_url,
             bs.jam_mulai AS jadwal_mulai_istirahat, bs.jam_selesai AS jadwal_selesai_istirahat
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN break_schedules bs ON a.employee_id = bs.employee_id AND a.date = bs.date
    `;
    const params = [];

    // Jika karyawan biasa, paksa hanya melihat riwayatnya sendiri
    if (req.user.role === 'employee') {
      sql += " WHERE a.employee_id = ?";
      params.push(req.user.employeeId);

      if (period) {
        sql += " AND a.date LIKE ?";
        params.push(`${period}%`);
      }
    } else {
      // Owner/Admin bisa melihat riwayat semua atau filter per karyawan
      const conditions = [];
      if (employeeId) {
        conditions.push("a.employee_id = ?");
        params.push(employeeId);
      }
      if (period) {
        conditions.push("a.date LIKE ?");
        params.push(`${period}%`);
      }

      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }
    }

    sql += " ORDER BY a.date DESC";

    const history = await dbQuery.all(sql, params);

    return res.status(200).json({
      status: 'success',
      data: history
    });
  } catch (error) {
    console.error('GetAttendanceHistory error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil riwayat kehadiran.'
    });
  }
}

/**
 * Mulai Istirahat (Karyawan via Android)
 */
export async function breakStart(req, res) {
  const { photo_selfie } = req.body;
  const employeeId = req.user.employeeId;

  if (!employeeId) {
    return res.status(400).json({
      status: 'error',
      message: 'Profil karyawan tidak ditemukan untuk akun ini.'
    });
  }

  if (!photo_selfie) {
    return res.status(400).json({
      status: 'error',
      message: '❌ Foto selfie wajib disertakan untuk verifikasi mulai istirahat.'
    });
  }

  const todayDate = getTodayDateString();

  try {
    // 1. Cari data absensi masuk hari ini
    const attendance = await dbQuery.get(
      "SELECT id, clock_in, jam_mulai_istirahat FROM attendances WHERE employee_id = ? AND date = ?",
      [employeeId, todayDate]
    );

    if (!attendance) {
      return res.status(400).json({
        status: 'error',
        message: '❌ Gagal: Anda belum melakukan absensi masuk (Clock-In) hari ini!'
      });
    }

    if (attendance.jam_mulai_istirahat) {
      return res.status(400).json({
        status: 'error',
        message: '❌ Gagal: Anda sudah memulai istirahat hari ini.'
      });
    }

    // Simpan foto selfie
    const photoPath = saveSelfieImage(photo_selfie, employeeId, 'selfie_break_start');
    if (!photoPath) {
      return res.status(400).json({
        status: 'error',
        message: 'Gagal menyimpan foto selfie istirahat.'
      });
    }

    // Verifikasi wajah & Timestamp watermark
    const verification = await verifyFaceAndWatermark(photoPath);
    if (!verification.success) {
      // Hapus file sampah
      try {
        fs.unlinkSync(path.resolve(photoPath.substring(1)));
      } catch (_) {}
      return res.status(400).json({
        status: 'error',
        message: `❌ Istirahat Ditolak: ${verification.message}`
      });
    }

    const breakTime = getCurrentTimeString();
    await dbQuery.run(
      "UPDATE attendances SET jam_mulai_istirahat = ?, photo_break_start_url = ? WHERE id = ?",
      [breakTime, photoPath, attendance.id]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Waktu istirahat berhasil dimulai.',
      data: {
        time: breakTime
      }
    });
  } catch (error) {
    console.error('breakStart error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mencatat mulai istirahat.'
    });
  }
}

/**
 * Selesai Istirahat (Karyawan via Android)
 */
export async function breakEnd(req, res) {
  const { photo_selfie } = req.body;
  const employeeId = req.user.employeeId;

  if (!employeeId) {
    return res.status(400).json({
      status: 'error',
      message: 'Profil karyawan tidak ditemukan untuk akun ini.'
    });
  }

  if (!photo_selfie) {
    return res.status(400).json({
      status: 'error',
      message: '❌ Foto selfie wajib disertakan untuk verifikasi selesai istirahat.'
    });
  }

  const todayDate = getTodayDateString();

  try {
    // 1. Cari data absensi masuk hari ini
    const attendance = await dbQuery.get(
      "SELECT id, clock_in, jam_mulai_istirahat, jam_akhir_istirahat FROM attendances WHERE employee_id = ? AND date = ?",
      [employeeId, todayDate]
    );

    if (!attendance) {
      return res.status(400).json({
        status: 'error',
        message: '❌ Gagal: Anda belum melakukan absensi masuk (Clock-In) hari ini!'
      });
    }

    if (!attendance.jam_mulai_istirahat) {
      return res.status(400).json({
        status: 'error',
        message: '❌ Gagal: Anda belum memulai istirahat hari ini.'
      });
    }

    if (attendance.jam_akhir_istirahat) {
      return res.status(400).json({
        status: 'error',
        message: '❌ Gagal: Anda sudah menyelesaikan istirahat hari ini.'
      });
    }

    // Simpan foto selfie
    const photoPath = saveSelfieImage(photo_selfie, employeeId, 'selfie_break_end');
    if (!photoPath) {
      return res.status(400).json({
        status: 'error',
        message: 'Gagal menyimpan foto selfie selesai istirahat.'
      });
    }

    // Verifikasi wajah & Timestamp watermark
    const verification = await verifyFaceAndWatermark(photoPath);
    if (!verification.success) {
      // Hapus file sampah
      try {
        fs.unlinkSync(path.resolve(photoPath.substring(1)));
      } catch (_) {}
      return res.status(400).json({
        status: 'error',
        message: `❌ Selesai Istirahat Ditolak: ${verification.message}`
      });
    }

    const endTime = getCurrentTimeString();
    await dbQuery.run(
      "UPDATE attendances SET jam_akhir_istirahat = ?, photo_break_end_url = ? WHERE id = ?",
      [endTime, photoPath, attendance.id]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Waktu istirahat berhasil diselesaikan.',
      data: {
        time: endTime
      }
    });
  } catch (error) {
    console.error('breakEnd error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mencatat selesai istirahat.'
    });
  }
}

/**
 * Helper to get rest duration for an outlet dynamically from policies
 */
async function getRestDurationForOutlet(outletName) {
  try {
    const policies = await dbQuery.all("SELECT * FROM policies WHERE status = 'aktif'");
    const matching = policies
      .filter(p => (p.nama_kebijakan || p.nama_aturan || '').toLowerCase().includes('durasi istirahat'))
      .find(p => {
        const allOutlets = p.all_outlets === 1 || p.all_outlets === true || p.berlaku_untuk_semua === 1 || p.berlaku_untuk_semua === true;
        if (allOutlets) return true;
        let outlets = [];
        try {
          outlets = JSON.parse(p.berlaku_di || p.outlets || '[]');
        } catch (_) {
          outlets = (p.berlaku_di || p.outlets || '').split(',');
        }
        return outlets.some(o => o.toUpperCase().trim() === (outletName || '').toUpperCase().trim());
      });
    if (matching && (matching.deskripsi || matching.nilai)) {
      const desc = matching.deskripsi || matching.nilai;
      const m = desc.match(/(\d+)\s*jam/i);
      if (m) return parseInt(m[1], 10);
    }
  } catch (err) {
    console.error('Error fetching rest duration policy:', err.message);
  }
  if ((outletName || '').toUpperCase().includes('ABS') || (outletName || '').toUpperCase().includes('SURABAYA')) return 2;
  return 3;
}

/**
 * Get or dynamically create a deterministic schedule for an employee on a target date
 */
async function getOrCreateBreakSchedule(employeeId, targetDate) {
  // 1. Cek apakah ada jadwal di database
  let schedule = await dbQuery.get(
    "SELECT bs.*, e.full_name, e.nik, e.outlet FROM break_schedules bs JOIN employees e ON bs.employee_id = e.id WHERE bs.employee_id = ? AND bs.date = ?",
    [employeeId, targetDate]
  );
  if (schedule) {
    return schedule;
  }

  // 2. Jika tidak ada, buat jadwal deterministik
  const employee = await dbQuery.get("SELECT * FROM employees WHERE id = ?", [employeeId]);
  if (!employee || employee.status === 'inactive') {
    return null;
  }

  const outlet = employee.outlet;
  const duration = await getRestDurationForOutlet(outlet);
  const numSess = duration === 2 ? 3 : 2;
  const sessions = duration === 2
    ? [{ sesi:1,jam_mulai:'12:00',jam_selesai:'14:00' },{ sesi:2,jam_mulai:'14:00',jam_selesai:'16:00' },{ sesi:3,jam_mulai:'16:00',jam_selesai:'18:00' }]
    : [{ sesi:1,jam_mulai:'12:00',jam_selesai:'15:00' },{ sesi:2,jam_mulai:'15:00',jam_selesai:'18:00' }];

  // Ambil semua karyawan aktif di outlet yang sama
  const activeEmployees = await dbQuery.all(
    "SELECT * FROM employees WHERE (outlet = ? OR ? LIKE CONCAT('%', outlet, '%')) AND status != 'inactive' ORDER BY id ASC",
    [outlet, outlet]
  );

  if (activeEmployees.length === 0) {
    return null;
  }

  // Pengelompokan (Grouping) seperti algoritma generate
  const assignments = Array.from({ length: numSess }, () => []);
  const women=[], koki=[], helper=[], waiter=[], other=[];
  activeEmployees.forEach(e => {
    const isFemale = (e.gender||'').toLowerCase() === 'wanita';
    const pos = (e.position||'').toLowerCase();
    if (isFemale) women.push(e);
    else if (pos.includes('koki') || pos.includes('cook')) koki.push(e);
    else if (pos.includes('helper')) helper.push(e);
    else if (pos.includes('waiter')) waiter.push(e);
    else other.push(e);
  });

  const minLoad = (arr, role=null) => {
    let mi=0, mv=Infinity;
    for (let i=0;i<arr.length;i++) {
      const v = role ? arr[i].filter(e=>(e.position||'').toLowerCase().includes(role)).length : arr[i].length;
      if (v<mv) { mv=v; mi=i; }
    }
    return mi;
  };

  women.forEach((e,i) => assignments[i%numSess].push(e));
  koki.forEach(e => { const idx = minLoad(assignments,'koki'); assignments[idx].push(e); });
  helper.forEach(e => { const idx = minLoad(assignments,'helper'); assignments[idx].push(e); });
  waiter.forEach(e => { const idx = minLoad(assignments,'waiter'); assignments[idx].push(e); });
  other.forEach(e => { const idx = minLoad(assignments); assignments[idx].push(e); });

  // Cari di sesi mana karyawan ini berada
  let assignedSesi = 1;
  let assignedMulai = sessions[0].jam_mulai;
  let assignedSelesai = sessions[0].jam_selesai;

  assignments.forEach((list, si) => {
    if (list.some(e => e.id === employeeId)) {
      assignedSesi = sessions[si].sesi;
      assignedMulai = sessions[si].jam_mulai;
      assignedSelesai = sessions[si].jam_selesai;
    }
  });

  return {
    id: `virtual-${employeeId}-${targetDate}`,
    employee_id: employeeId,
    date: targetDate,
    sesi: assignedSesi,
    jam_mulai: assignedMulai,
    jam_selesai: assignedSelesai,
    full_name: employee.full_name,
    nik: employee.nik,
    outlet: employee.outlet,
    is_virtual: true
  };
}

/**
 * Mendapatkan Jadwal Istirahat Hari Ini, Rentang Tanggal, atau Tanggal Tertentu
 */
export async function getBreakSchedule(req, res) {
  const employeeId = req.user.employeeId;
  const role = req.user.role;
  const { date, outlet, start_date, end_date } = req.query;

  try {
    if (role === 'employee') {
      if (!employeeId) {
        return res.status(400).json({
          status: 'error',
          message: 'Profil karyawan tidak ditemukan.'
        });
      }

      if (start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        const schedules = [];

        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 35) {
          return res.status(400).json({
            status: 'error',
            message: 'Rentang tanggal tidak valid atau terlalu besar (maksimal 35 hari).'
          });
        }

        for (let i = 0; i <= diffDays; i++) {
          const current = new Date(start);
          current.setDate(start.getDate() + i);
          const dateStr = current.toISOString().split('T')[0];
          const sched = await getOrCreateBreakSchedule(employeeId, dateStr);
          if (sched) {
            schedules.push(sched);
          }
        }

        return res.status(200).json({
          status: 'success',
          data: schedules
        });
      } else {
        const targetDate = date || getTodayDateString();
        const schedule = await getOrCreateBreakSchedule(employeeId, targetDate);
        return res.status(200).json({
          status: 'success',
          data: schedule || null
        });
      }
    } else {
      // Owner/Admin bisa melihat semua jadwal istirahat tanggal tersebut
      const targetDate = date || getTodayDateString();
      let query = `
        SELECT bs.*, e.full_name, e.nik, e.outlet, e.position, e.gender
        FROM break_schedules bs
        JOIN employees e ON bs.employee_id = e.id
        WHERE bs.date = ?
      `;
      const params = [targetDate];

      if (outlet) {
        query += " AND e.outlet = ?";
        params.push(outlet);
      }

      const schedules = await dbQuery.all(query, params);

      return res.status(200).json({
        status: 'success',
        data: schedules
      });
    }
  } catch (error) {
    console.error('getBreakSchedule error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil jadwal istirahat.'
    });
  }
}

/**
 * Sinkronisasi Jadwal Istirahat Dari Web Admin
 */
export async function syncBreakSchedule(req, res) {
  const role = req.user.role;
  if (role !== 'owner' && role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengatur jadwal istirahat.'
    });
  }

  const { date, schedules } = req.body;

  if (!date || !Array.isArray(schedules)) {
    return res.status(400).json({
      status: 'error',
      message: 'Payload tidak valid: Field date dan array schedules wajib diisi.'
    });
  }

  try {
    // Jalankan dalam transaction sederhana
    await dbQuery.run("BEGIN TRANSACTION");

    // Hapus jadwal lama untuk tanggal dan employee_id yang dikirim
    const empIds = schedules.map(s => s.employee_id);
    if (empIds.length > 0) {
      const placeholders = empIds.map(() => "?").join(",");
      await dbQuery.run(
        `DELETE FROM break_schedules WHERE date = ? AND employee_id IN (${placeholders})`,
        [date, ...empIds]
      );
    } else {
      await dbQuery.run(
        "DELETE FROM break_schedules WHERE date = ?",
        [date]
      );
    }

    // Masukkan jadwal baru
    for (const schedule of schedules) {
      const { employee_id, sesi, jam_mulai, jam_selesai } = schedule;
      await dbQuery.run(
        "INSERT INTO break_schedules (employee_id, date, sesi, jam_mulai, jam_selesai) VALUES (?, ?, ?, ?, ?)",
        [employee_id, date, sesi, jam_mulai, jam_selesai]
      );
    }

    await dbQuery.run("COMMIT");

    return res.status(200).json({
      status: 'success',
      message: 'Jadwal istirahat hari ini berhasil disimpan dan dikirim ke karyawan.'
    });
  } catch (error) {
    try {
      await dbQuery.run("ROLLBACK");
    } catch (_) {}
    console.error('syncBreakSchedule error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal melakukan sinkronisasi jadwal istirahat.'
    });
  }
}

/**
 * Mengirimkan notifikasi Sapaan AI motivasi secara otomatis
 */
async function sendSapaanAI(employeeId, category) {
  try {
    const employee = await dbQuery.get("SELECT outlet FROM employees WHERE id = ?", [employeeId]);
    const outlet = employee ? (employee.outlet || 'Semua Outlet') : 'Semua Outlet';
    
    const settingKey = category === 'masuk' ? 'motivasi_kerja_quotes' : 'motivasi_bersyukur_quotes';
    const settingRow = await dbQuery.get("SELECT `value` FROM system_settings WHERE `key` = ?", [settingKey]);
    
    let quotes = [];
    if (settingRow && settingRow.value) {
      try {
        quotes = JSON.parse(settingRow.value);
      } catch (e) {
        if (typeof settingRow.value === 'string' && settingRow.value.trim()) {
          quotes = [settingRow.value];
        }
      }
    }
    
    if (!Array.isArray(quotes) || quotes.length === 0) {
      if (category === 'masuk') {
        quotes = [
          'Setiap langkah kecil kedisiplinan hari ini adalah investasi kesuksesan hari esok. ~ Barokah AI',
          'Kejujuran dan integritas adalah kunci utama menjemput rezeki yang barokah. ~ Barokah AI',
          'Kerja keras mendatangkan hasil, kerja cerdas mendatangkan efisiensi, kerja ikhlas mendatangkan berkah. ~ Barokah AI',
          'Kualitas pelayanan terbaik lahir dari hati yang tulus dan senyum yang ramah. ~ Barokah AI'
        ];
      } else {
        quotes = [
          'Alhamdulillah untuk hari ini. Mari pulang dengan rasa syukur dan damai di hati. ~ Barokah AI',
          'Lelah hari ini adalah bukti perjuangan halal Anda untuk keluarga tercinta. Bersyukurlah! ~ Barokah AI',
          'Bekerja dengan baik, pulang dengan bersyukur. Hari yang indah telah kita lewati bersama. ~ Barokah AI',
          'Bersyukur atas rezeki hari ini membuka pintu rezeki yang lebih luas esok hari. ~ Barokah AI'
        ];
      }
    }
    
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    let text = randomQuote;
    let author = 'Barokah AI';
    if (randomQuote.includes('~')) {
      const parts = randomQuote.split('~');
      text = parts[0].trim();
      author = parts[1].trim();
    }
    
    const title = `[Sapaan AI] Motivasi ${category === 'masuk' ? 'Kerja' : 'Bersyukur'}`;
    const message = `${text} ~ ${author}`;
    
    await dbQuery.run(
      `INSERT INTO mobile_user_notifications (employee_id, outlet, title, message, type, is_read)
       VALUES (?, ?, ?, ?, 'broadcast', 0)`,
      [employeeId, outlet, title, message]
    );
    console.log(`[Sapaan AI] Notification sent to employee ID ${employeeId} (${category})`);
  } catch (err) {
    console.error('Error sending Sapaan AI:', err.message);
  }
}

/**
 * Hapus satu baris jadwal istirahat berdasarkan ID
 */
export async function deleteBreakSchedule(req, res) {
  const role = req.user.role;
  if (role !== 'owner' && role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
  }
  const { id } = req.params;
  if (!id) return res.status(400).json({ status: 'error', message: 'ID jadwal tidak valid.' });
  try {
    const existing = await dbQuery.get('SELECT id FROM break_schedules WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Jadwal tidak ditemukan.' });
    await dbQuery.run('DELETE FROM break_schedules WHERE id = ?', [id]);
    return res.status(200).json({ status: 'success', message: 'Jadwal berhasil dihapus.' });
  } catch (error) {
    console.error('deleteBreakSchedule error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus jadwal.' });
  }
}

/**
 * Rekap jadwal istirahat bulanan per karyawan (untuk mobile)
 * Query params: employee_id, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)
 */
export async function getMonthlyBreakSchedule(req, res) {
  const role = req.user.role;
  const userId = req.user.id;
  try {
    let employeeId;
    if (role === 'karyawan') {
      // Karyawan hanya bisa lihat miliknya sendiri
      const emp = await dbQuery.get('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (!emp) return res.status(404).json({ status: 'error', message: 'Karyawan tidak ditemukan.' });
      employeeId = emp.id;
    } else {
      employeeId = req.query.employee_id;
      if (!employeeId) return res.status(400).json({ status: 'error', message: 'Parameter employee_id wajib diisi.' });
    }

    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({ status: 'error', message: 'Parameter start_date dan end_date wajib diisi.' });
    }

    // Ambil semua jadwal dalam rentang tanggal
    const schedules = await dbQuery.all(
      `SELECT bs.id, bs.date, bs.sesi, bs.jam_mulai, bs.jam_selesai
       FROM break_schedules bs
       WHERE bs.employee_id = ? AND bs.date >= ? AND bs.date <= ?
       ORDER BY bs.date ASC, bs.sesi ASC`,
      [employeeId, start_date, end_date]
    );

    // Ambil data aktual istirahat dari tabel attendance
    const attendanceLogs = await dbQuery.all(
      `SELECT date, jam_mulai_istirahat, jam_akhir_istirahat
       FROM attendance
       WHERE employee_id = ? AND date >= ? AND date <= ?`,
      [employeeId, start_date, end_date]
    );
    const attMap = {};
    attendanceLogs.forEach(a => { attMap[a.date] = a; });

    // Ambil policy denda istirahat
    let breakTolerance = 15;
    let breakRate = 1000;
    try {
      const breakPenaltyPolicy = await dbQuery.get(
        "SELECT deskripsi FROM corporate_policies WHERE nama_aturan LIKE '%denda istirahat%' AND status = 'ACTIVE' LIMIT 1"
      );
      if (breakPenaltyPolicy && breakPenaltyPolicy.deskripsi) {
        const matchTol = breakPenaltyPolicy.deskripsi.match(/toleransi\s*[a-zA-Z0-9_\s]*\s*(\d+)\s*poin/i);
        if (matchTol) breakTolerance = parseInt(matchTol[1], 10);
        const matchRate = breakPenaltyPolicy.deskripsi.match(/denda\s*rp\s*([\d.]+)/i);
        if (matchRate) breakRate = parseInt(matchRate[1].replace(/\./g, ''), 10);
      }
    } catch (_) {}

    // Hitung poin & denda per baris
    let totalPoints = 0;
    const result = schedules.map(bs => {
      const att = attMap[bs.date];
      const actualStart = att ? (att.jam_mulai_istirahat || null) : null;
      const actualEnd = att ? (att.jam_akhir_istirahat || null) : null;

      // Hitung poin keterlambatan kembali dari istirahat
      let latePoints = 0;
      if (actualEnd && bs.jam_selesai) {
        const toMin = (t) => {
          if (!t) return 0;
          const p = t.split(':');
          return parseInt(p[0], 10) * 60 + parseInt(p[1] || '0', 10);
        };
        const schedEnd = toMin(bs.jam_selesai);
        const actEnd = toMin(actualEnd);
        latePoints = Math.max(0, actEnd - schedEnd);
      }
      totalPoints += latePoints;

      return {
        id: bs.id,
        date: bs.date,
        sesi: bs.sesi,
        jam_mulai_jadwal: bs.jam_mulai,
        jam_selesai_jadwal: bs.jam_selesai,
        jam_mulai_aktual: actualStart,
        jam_selesai_aktual: actualEnd,
        poin_telat: latePoints,
      };
    });

    // Hitung denda total bulan ini
    const dendaTotal = totalPoints > breakTolerance ? (totalPoints - breakTolerance) * breakRate : 0;

    return res.status(200).json({
      status: 'success',
      data: result,
      summary: {
        total_poin: totalPoints,
        toleransi_poin: breakTolerance,
        rate_denda: breakRate,
        denda_total: dendaTotal,
      }
    });
  } catch (error) {
    console.error('getMonthlyBreakSchedule error:', error.message);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil rekap jadwal istirahat.' });
  }
}

