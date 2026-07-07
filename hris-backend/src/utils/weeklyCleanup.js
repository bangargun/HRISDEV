import { dbQuery } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

/**
 * Mendapatkan tanggal Senin dari minggu berjalan (Format: YYYY-MM-DD)
 */
function getMostRecentMondayString() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Sesuaikan ke hari Senin terdekat
  const monday = new Date(d.setDate(diff));
  
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/**
 * Menghitung selisih tanggal (Format: YYYY-MM-DD)
 */
function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${d}`;
}

/**
 * Menjalankan otomatisasi pengarsipan PDF dan penghapusan foto mingguan
 */
export async function runWeeklyPhotoCleanup() {
  try {
    console.log('🔄 Memeriksa jadwal pembersihan foto mingguan...');
    
    // dapatkan hari ini
    const today = new Date();
    const isMonday = today.getDay() === 1; // 1 = Senin
    
    // UNTUK TESTING / SIMULASI: jika bukan hari Senin, sistem tetap bisa mendeteksi 
    // jika periode sebelumnya belum dibersihkan. Namun secara default kita batasi hanya jalan di hari Senin.
    if (!isMonday) {
      console.log('ℹ️ Hari ini bukan hari Senin. Pembersihan mingguan dilewati.');
      return;
    }

    const currentMondayStr = getMostRecentMondayString();
    
    // Periksa apakah pembersihan untuk senin ini sudah pernah dilakukan
    const lastCleanupRow = await dbQuery.get(
      "SELECT value FROM system_settings WHERE `key` = 'last_weekly_cleanup_monday'"
    );

    if (lastCleanupRow && lastCleanupRow.value === currentMondayStr) {
      console.log(`✅ Pembersihan mingguan untuk periode senin ${currentMondayStr} sudah pernah dilakukan sebelumnya.`);
      return;
    }

    // Rentang tanggal minggu lalu (Senin s/d Minggu)
    const archiveStart = addDays(currentMondayStr, -7);
    const archiveEnd = addDays(currentMondayStr, -1);
    
    console.log(`📦 Memulai pengarsipan absensi dari tanggal ${archiveStart} s/d ${archiveEnd}...`);

    // Ambil data absensi minggu lalu
    const attendances = await dbQuery.all(`
      SELECT a.*, e.full_name, e.nik, e.outlet, e.department
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date >= ? AND a.date <= ?
      ORDER BY e.full_name ASC, a.date ASC
    `, [archiveStart, archiveEnd]);

    if (attendances.length === 0) {
      console.log('ℹ️ Tidak ada data kehadiran minggu lalu untuk diarsipkan.');
      // Simpan log agar tidak terus-terusan memeriksa
      await saveCleanupLog(currentMondayStr);
      return;
    }

    // Buat direktori arsip jika belum ada
    const archiveDir = path.resolve('uploads', 'archives');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const pdfFilename = `rekap_kehadiran_${archiveStart}_to_${archiveEnd}.pdf`;
    const pdfPath = path.join(archiveDir, pdfFilename);
    const pdfUrl = `/uploads/archives/${pdfFilename}`;

    // Inisialisasi dokumen PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    // Cover Page / Header
    doc.rect(0, 0, 595.28, 80).fill('#222831');
    doc.fillColor('#00ADB5').fontSize(16).text('BAROKAH GRUP HRIS SYSTEM', 30, 20, { bold: true });
    doc.fillColor('#EEEEEE').fontSize(12).text(`LAPORAN REKAPITULASI KEHADIRAN MINGGUAN (ARCHIVE PHOTO)`, 30, 42);
    doc.fillColor('#9EA8B3').fontSize(9).text(`Periode Kehadiran: ${archiveStart} s/d ${archiveEnd} | Dibuat pada: ${new Date().toLocaleString()}`, 30, 58);
    doc.moveDown(4);

    // Grouping by employee
    const grouped = {};
    attendances.forEach(att => {
      if (!grouped[att.employee_id]) {
        grouped[att.employee_id] = {
          name: att.full_name,
          nik: att.nik,
          outlet: att.outlet,
          department: att.department,
          logs: []
        };
      }
      grouped[att.employee_id].logs.push(att);
    });

    // Tulis rincian per karyawan
    let empIndex = 0;
    for (const empId in grouped) {
      const emp = grouped[empId];
      empIndex++;

      if (empIndex > 1) {
        doc.addPage();
      }

      // Profile Header
      doc.fillColor('#222831').fontSize(14).text(`${empIndex}. ${emp.name} (${emp.nik})`, 30, 30, { underline: true });
      doc.fontSize(10).fillColor('#393E46').text(`Outlet: ${emp.outlet || '-'} | Departemen: ${emp.department || '-'}`, 30, 50);
      doc.moveDown(1.5);

      // Render each day log
      for (const log of emp.logs) {
        doc.fillColor('#222831').fontSize(11).text(`Tanggal: ${log.date}`, { bold: true });
        doc.fontSize(9).fillColor('#393E46');
        doc.text(`  • Masuk   : ${log.clock_in || '-'} | Status: ${log.status_in || '-'}`);
        doc.text(`  • Istirahat: ${log.jam_mulai_istirahat || '-'} s/d ${log.jam_akhir_istirahat || '-'}`);
        doc.text(`  • Pulang  : ${log.clock_out || '-'}`);
        if (log.notes) {
          doc.text(`  • Catatan : "${log.notes}"`);
        }

        // Tampilkan foto selfie jika ada
        const photos = [];
        if (log.photo_in_url) photos.push({ label: 'Foto Masuk', url: log.photo_in_url });
        if (log.photo_break_start_url) photos.push({ label: 'Foto Istirahat (Mulai)', url: log.photo_break_start_url });
        if (log.photo_break_end_url) photos.push({ label: 'Foto Istirahat (Selesai)', url: log.photo_break_end_url });
        if (log.photo_out_url) photos.push({ label: 'Foto Pulang', url: log.photo_out_url });

        if (photos.length > 0) {
          doc.text(`  • Galeri Foto:`);
          doc.moveDown(0.2);
          
          let startY = doc.y;
          let colWidth = 120;
          let colHeight = 120;
          let currentX = 40;

          for (const photo of photos) {
            // Path absolut file foto
            const relativePath = photo.url.startsWith('/') ? photo.url.substring(1) : photo.url;
            const fullPhotoPath = path.resolve(relativePath);

            if (fs.existsSync(fullPhotoPath)) {
              try {
                // Tulis label
                doc.fillColor('#00ADB5').fontSize(8).text(photo.label, currentX, startY);
                // Gambar foto
                doc.image(fullPhotoPath, currentX, startY + 12, { width: colWidth - 10, height: colHeight - 20 });
              } catch (imgError) {
                doc.fillColor('red').fontSize(8).text(`[Gagal memuat gambar]`, currentX, startY + 12);
              }
            } else {
              doc.fillColor('red').fontSize(8).text(`[Foto Hilang]`, currentX, startY + 12);
            }

            currentX += colWidth;
            if (currentX + colWidth > 560) {
              currentX = 40;
              startY += colHeight + 20;
              doc.moveDown(5);
            }
          }
          
          // Berikan jarak ke baris berikutnya
          doc.y = startY + colHeight + 15;
        }

        doc.moveDown(1);
        doc.lineWidth(0.5).strokeColor('#EEEEEE').moveTo(30, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(0.8);
      }
    }

    doc.end();

    // Tunggu stream selesai menulis file
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log(`📄 PDF berhasil disimpan di: ${pdfPath}`);

    // Hapus fisik file foto yang diarsipkan
    let deletedCount = 0;
    for (const log of attendances) {
      const pathsToDelete = [log.photo_in_url, log.photo_out_url, log.photo_break_start_url, log.photo_break_end_url];
      for (const p of pathsToDelete) {
        if (p && p.startsWith('/uploads/') && !p.includes('/archives/')) {
          const fullPath = path.resolve(p.substring(1));
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
              deletedCount++;
            } catch (err) {
              console.error(`Gagal menghapus file ${fullPath}:`, err.message);
            }
          }
        }
      }
    }

    console.log(`🗑️ Berhasil menghapus ${deletedCount} file foto selfie dari disk.`);

    // Perbarui kolom di database ke status archived/deleted
    await dbQuery.run(`
      UPDATE attendances
      SET photo_in_url = CASE WHEN photo_in_url IS NOT NULL THEN 'ARCHIVED_PDF' ELSE NULL END,
          photo_out_url = CASE WHEN photo_out_url IS NOT NULL THEN 'ARCHIVED_PDF' ELSE NULL END,
          photo_break_start_url = CASE WHEN photo_break_start_url IS NOT NULL THEN 'ARCHIVED_PDF' ELSE NULL END,
          photo_break_end_url = CASE WHEN photo_break_end_url IS NOT NULL THEN 'ARCHIVED_PDF' ELSE NULL END
      WHERE date >= ? AND date <= ?
    `, [archiveStart, archiveEnd]);

    console.log(`💾 Data absensi database berhasil diperbarui.`);

    // Simpan log sukses
    await saveCleanupLog(currentMondayStr);
    console.log(`🎉 Pembersihan mingguan selesai dan tercatat untuk senin ${currentMondayStr}.`);

  } catch (error) {
    console.error('CRITICAL: Gagal memproses pembersihan foto mingguan:', error.message);
  }
}

/**
 * Menyimpan catatan status pembersihan mingguan di system_settings
 */
async function saveCleanupLog(mondayStr) {
  try {
    const existing = await dbQuery.get(
      "SELECT id FROM system_settings WHERE `key` = 'last_weekly_cleanup_monday'"
    );

    if (existing) {
      await dbQuery.run(
        "UPDATE system_settings SET value = ? WHERE `key` = 'last_weekly_cleanup_monday'",
        [mondayStr]
      );
    } else {
      await dbQuery.run(
        "INSERT INTO system_settings (`key`, value, description) VALUES ('last_weekly_cleanup_monday', ?, 'Tanggal senin terakhir pembersihan foto mingguan')",
        [mondayStr]
      );
    }
  } catch (err) {
    console.error('Gagal mencatat log pembersihan:', err.message);
  }
}
