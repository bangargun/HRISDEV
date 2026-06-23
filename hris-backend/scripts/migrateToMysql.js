import sqlite3 from 'sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env file variables
dotenv.config();

const sqliteDbPath = path.resolve('./database.sqlite');
const mysqlConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hris_barokah',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

// Fungsi penyehat data untuk Strict SQL Mode MySQL
function sanitizeValue(tableName, columnName, val) {
  if (val === '' || val === undefined || val === null) return null;
  
  // Kolom-kolom bertipe DATE pada skema MySQL
  const dateColumns = [
    'joined_date', 'date', 'start_date', 'end_date', 'approval_date', 
    'payment_date', 'tanggal', 'tanggal_dibuat', 'tanggal_berlaku', 
    'tanggal_berakhir', 'tanggal_terbit', 'tanggal_publish', 
    'tanggal_mulai', 'tanggal_selesai', 'tanggal_pembuatan'
  ];

  if (dateColumns.includes(columnName)) {
    if (typeof val === 'string') {
      if (val.includes('T')) {
        return val.split('T')[0];
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
        return val.substring(0, 10);
      }
    }
  }

  // Kolom-kolom bertipe TIMESTAMP
  const timestampColumns = ['created_at', 'updated_at'];
  if (timestampColumns.includes(columnName)) {
    if (typeof val === 'string') {
      // Hilangkan huruf T & Z agar dapat dibaca normal oleh MySQL TIMESTAMP
      return val.replace('T', ' ').replace('Z', '').split('.')[0];
    }
  }

  return val;
}

async function executeMigration() {
  console.log('=== MEMULAI MIGRASI SINKRONISASI DATA: SQLITE -> MYSQL ===');
  console.log(`SQLite Path: ${sqliteDbPath}`);
  console.log(`MySQL Host: ${mysqlConfig.host}, Database: ${mysqlConfig.database}`);

  if (!fs.existsSync(sqliteDbPath)) {
    console.error(`ERROR: File database SQLite tidak ditemukan di ${sqliteDbPath}`);
    process.exit(1);
  }

  // 1. Hubungkan ke database
  const sqliteDb = new sqlite3.Database(sqliteDbPath);
  
  // Hubungkan ke MySQL server (tanpa DB dulu untuk create database jika belum ada)
  const connectionConfigWithoutDb = { ...mysqlConfig };
  delete connectionConfigWithoutDb.database;
  
  let mysqlConn;
  try {
    const tempConn = await mysql.createConnection(connectionConfigWithoutDb);
    console.log(`MIGRATION: Memeriksa/Membuat database '${mysqlConfig.database}'...`);
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${mysqlConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConn.end();
    
    // Hubungkan kembali dengan database yang benar
    mysqlConn = await mysql.createConnection(mysqlConfig);
    console.log('SUCCESS: Terkoneksi ke database SQLite dan MySQL.');
  } catch (err) {
    console.error('CRITICAL: Gagal menghubungkan ke MySQL server:', err.message);
    process.exit(1);
  }

  // Helper SQLite query
  const getSqliteData = (query, params = []) => {
    return new Promise((resolve, reject) => {
      sqliteDb.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  // 2. Buat skema DDL MySQL
  console.log('MIGRATION: Membuat skema tabel MySQL...');
  try {
    await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const ddlStatements = [
      // 1. users
      `DROP TABLE IF EXISTS users`,
      `CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner', 'admin', 'employee') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      
      // 2. employees
      `DROP TABLE IF EXISTS employees`,
      `CREATE TABLE employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        nik VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NULL,
        address TEXT NULL,
        position VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        basic_salary DECIMAL(15,2) NOT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        joined_date DATE NOT NULL,
        outlet VARCHAR(100) NULL,
        gender ENUM('Pria', 'Wanita') DEFAULT 'Pria',
        INDEX idx_employees_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 3. attendances
      `DROP TABLE IF EXISTS attendances`,
      `CREATE TABLE attendances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        date DATE NOT NULL,
        clock_in VARCHAR(20) NULL,
        clock_out VARCHAR(20) NULL,
        lat_in DOUBLE NULL,
        lng_in DOUBLE NULL,
        lat_out DOUBLE NULL,
        lng_out DOUBLE NULL,
        status_in ENUM('ontime', 'late') NULL,
        photo_in_url TEXT NULL,
        photo_out_url TEXT NULL,
        notes TEXT NULL,
        jam_mulai_istirahat VARCHAR(20) NULL,
        jam_akhir_istirahat VARCHAR(20) NULL,
        UNIQUE KEY unique_emp_date (employee_id, date),
        INDEX idx_attendances_emp_date (employee_id, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 4. leaves
      `DROP TABLE IF EXISTS leaves`,
      `CREATE TABLE leaves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        leave_type ENUM('cuti', 'izin', 'sakit', 'setengah_hari', 'kasbon') NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        attachment_url TEXT NULL,
        approved_by INT NULL,
        approval_date DATE NULL,
        half_day_clock_out VARCHAR(20) NULL,
        cash_advance_amount DECIMAL(15,2) NULL,
        is_sent TINYINT DEFAULT 0 CHECK (is_sent IN (0, 1)),
        is_read TINYINT DEFAULT 0 CHECK (is_read IN (0, 1)),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_leaves_emp (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 5. payrolls
      `DROP TABLE IF EXISTS payrolls`,
      `CREATE TABLE payrolls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        period VARCHAR(7) NOT NULL,
        basic_salary DECIMAL(15,2) NOT NULL,
        allowances DECIMAL(15,2) DEFAULT 0.00,
        deductions DECIMAL(15,2) DEFAULT 0.00,
        net_salary DECIMAL(15,2) NOT NULL,
        payment_status ENUM('unpaid', 'paid') DEFAULT 'unpaid',
        payment_date DATE NULL,
        slip_url TEXT NULL,
        is_sent TINYINT DEFAULT 0 CHECK (is_sent IN (0, 1)),
        is_read TINYINT DEFAULT 0 CHECK (is_read IN (0, 1)),
        UNIQUE KEY unique_emp_period (employee_id, period),
        INDEX idx_payrolls_emp_period (employee_id, period)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 6. outlets
      `DROP TABLE IF EXISTS outlets`,
      `CREATE TABLE outlets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) UNIQUE NOT NULL,
        wilayah VARCHAR(100) NOT NULL,
        alamat TEXT NOT NULL,
        permodalan VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 7. outlet_revenues
      `DROP TABLE IF EXISTS outlet_revenues`,
      `CREATE TABLE outlet_revenues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        outlet_id INT NOT NULL,
        tanggal DATE NOT NULL,
        jumlah_omzet DECIMAL(15,2) NOT NULL,
        dicatat_oleh INT NOT NULL,
        INDEX idx_revenues_outlet (outlet_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 8. sops
      `DROP TABLE IF EXISTS sops`,
      `CREATE TABLE sops (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nomor VARCHAR(50) NULL,
        judul VARCHAR(255) NOT NULL,
        berlaku_di TEXT NULL,
        jabatan_terkait TEXT NULL,
        isi TEXT NULL,
        keterangan_validasi TEXT NULL,
        hanya_outlet_terpilih TINYINT DEFAULT 1 CHECK (hanya_outlet_terpilih IN (0, 1)),
        sasaran_role VARCHAR(50) NULL,
        tanggal_dibuat DATE NULL,
        status_kirim TINYINT DEFAULT 0 CHECK (status_kirim IN (0, 1)),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 9. kpis
      `DROP TABLE IF EXISTS kpis`,
      `CREATE TABLE kpis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        periode VARCHAR(7) NOT NULL,
        skor_kpi DECIMAL(5,2) NOT NULL,
        evaluator_id INT NOT NULL,
        catatan TEXT NULL,
        UNIQUE KEY unique_emp_kpi_period (employee_id, periode),
        INDEX idx_kpi_emp_period (employee_id, periode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 10. ratings_360
      `DROP TABLE IF EXISTS ratings_360`,
      `CREATE TABLE ratings_360 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        kedisiplinan INT NOT NULL,
        inisiatif INT NOT NULL,
        kerjasama INT NOT NULL,
        kebersihan INT NOT NULL,
        etika INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ratings_360_emp (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 11. sanctions
      `DROP TABLE IF EXISTS sanctions`,
      `CREATE TABLE sanctions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        tipe_sanksi ENUM('Surat Teguran Lisan 1', 'Surat Teguran Lisan 2', 'Surat Teguran Lisan 3', 'Surat Peringatan 1', 'Surat Peringatan 2', 'Surat Peringatan 3', 'PHK') NOT NULL,
        bentuk_kesalahan ENUM('Pelanggaran Kode Etik', 'Pelanggaran Teknis') NOT NULL,
        alasan TEXT NOT NULL,
        tanggal_berlaku DATE NOT NULL,
        tanggal_berakhir DATE NOT NULL,
        status ENUM('aktif', 'selesai') DEFAULT 'aktif',
        diketahui_oleh ENUM('SPV', 'Manajemen', 'General Manager') NOT NULL,
        tanggal_terbit DATE NULL,
        INDEX idx_sanctions_emp (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 12. documentations
      `DROP TABLE IF EXISTS documentations`,
      `CREATE TABLE documentations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal_publish DATE NOT NULL,
        judul VARCHAR(255) NOT NULL,
        isi TEXT NOT NULL,
        file_name VARCHAR(255) NULL,
        file_path TEXT NULL,
        status ENUM('aktif', 'tidak aktif') DEFAULT 'aktif',
        status_kirim TINYINT DEFAULT 0 CHECK (status_kirim IN (0, 1)),
        berlaku_di TEXT NULL,
        jabatan_terkait TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 13. break_schedules
      `DROP TABLE IF EXISTS break_schedules`,
      `CREATE TABLE break_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        date DATE NOT NULL,
        sesi INT NOT NULL,
        jam_mulai VARCHAR(20) NOT NULL,
        jam_selesai VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_emp_break (employee_id, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 14. mobile_user_notifications
      `DROP TABLE IF EXISTS mobile_user_notifications`,
      `CREATE TABLE mobile_user_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        outlet VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_read TINYINT DEFAULT 0 CHECK (is_read IN (0, 1)),
        response VARCHAR(255) NULL,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mobile_notif_emp (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 15. rbac_permissions
      `DROP TABLE IF EXISTS rbac_permissions`,
      `CREATE TABLE rbac_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role ENUM('owner', 'admin', 'employee') NOT NULL,
        permission_key VARCHAR(100) NOT NULL,
        is_allowed TINYINT DEFAULT 1 CHECK (is_allowed IN (0, 1)),
        UNIQUE KEY unique_role_perm (role, permission_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 16. trainings
      `DROP TABLE IF EXISTS trainings`,
      `CREATE TABLE trainings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_program VARCHAR(255) UNIQUE NOT NULL,
        divisi VARCHAR(100) NOT NULL,
        tanggal_mulai DATE NOT NULL,
        tanggal_selesai DATE NOT NULL,
        kuota INT DEFAULT 10,
        status ENUM('mendatang', 'berjalan', 'selesai') DEFAULT 'mendatang',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 17. system_settings
      `DROP TABLE IF EXISTS system_settings`,
      `CREATE TABLE system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) UNIQUE NOT NULL,
        \`value\` TEXT NOT NULL,
        description TEXT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 18. policies
      `DROP TABLE IF EXISTS policies`,
      `CREATE TABLE policies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_kebijakan VARCHAR(255) NOT NULL,
        kategori ENUM('jam_kerja', 'hari_libur', 'performa', 'lainnya') NOT NULL,
        nilai TEXT NOT NULL,
        keterangan TEXT NULL,
        efek_performa TEXT NULL,
        status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
        hanya_outlet_terpilih TINYINT DEFAULT 0 CHECK (hanya_outlet_terpilih IN (0, 1)),
        berlaku_di TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_policies_kategori (kategori)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 19. position_permissions
      `DROP TABLE IF EXISTS position_permissions`,
      `CREATE TABLE position_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        position VARCHAR(100) NOT NULL,
        module VARCHAR(100) NOT NULL,
        can_view TINYINT DEFAULT 0 CHECK (can_view IN (0, 1)),
        can_edit TINYINT DEFAULT 0 CHECK (can_edit IN (0, 1)),
        can_delete TINYINT DEFAULT 0 CHECK (can_delete IN (0, 1)),
        UNIQUE KEY unique_pos_module (position, module)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 20. peak_days
      `DROP TABLE IF EXISTS peak_days`,
      `CREATE TABLE peak_days (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal INT NOT NULL,
        bulan INT NOT NULL,
        tahun INT NOT NULL,
        nama_peak_day VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      // 21. contracts
      `DROP TABLE IF EXISTS contracts`,
      `CREATE TABLE contracts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nomor_surat VARCHAR(100) UNIQUE NOT NULL,
        employee_id INT NOT NULL,
        jenis_kontrak ENUM('Surat Pengangkatan', 'Surat Perjanjian Kontrak', 'Surat Dinas', 'Surat Pemindahan Tugas', 'Surat Perintah') NOT NULL,
        gaji_pokok DECIMAL(15,2) NOT NULL,
        uang_makan DECIMAL(15,2) NOT NULL,
        uang_lembur DECIMAL(15,2) NOT NULL,
        tunjangan_lama_bekerja DECIMAL(15,2) NOT NULL,
        tunjangan_keluarga DECIMAL(15,2) NOT NULL,
        tanggal_pembuatan DATE NOT NULL,
        tanggal_selesai DATE NOT NULL,
        status_persetujuan ENUM('BELUM SIGN', 'KONTRAK DITANDATANGANI') DEFAULT 'BELUM SIGN',
        keterangan TEXT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];

    for (const ddl of ddlStatements) {
      await mysqlConn.query(ddl);
    }
    console.log('SUCCESS: Pembuatan skema tabel MySQL selesai.');
  } catch (err) {
    console.error('CRITICAL: Gagal membuat skema tabel MySQL:', err.message);
    process.exit(1);
  }

  // 3. Impor Data Historis dari SQLite ke MySQL
  const tables = [
    { name: 'users', columns: ['id', 'email', 'password_hash', 'role', 'created_at', 'updated_at'] },
    { name: 'employees', columns: ['id', 'user_id', 'nik', 'full_name', 'phone', 'address', 'position', 'department', 'basic_salary', 'status', 'joined_date', 'outlet', 'gender'] },
    { name: 'attendances', columns: ['id', 'employee_id', 'date', 'clock_in', 'clock_out', 'lat_in', 'lng_in', 'lat_out', 'lng_out', 'status_in', 'photo_in_url', 'photo_out_url', 'notes', 'jam_mulai_istirahat', 'jam_akhir_istirahat'] },
    { name: 'leaves', columns: ['id', 'employee_id', 'leave_type', 'start_date', 'end_date', 'reason', 'status', 'attachment_url', 'approved_by', 'approval_date', 'half_day_clock_out', 'cash_advance_amount', 'is_sent', 'is_read', 'created_at'] },
    { name: 'payrolls', columns: ['id', 'employee_id', 'period', 'basic_salary', 'allowances', 'deductions', 'net_salary', 'payment_status', 'payment_date', 'slip_url', 'is_sent', 'is_read'] },
    { name: 'outlets', columns: ['id', 'nama', 'wilayah', 'alamat', 'permodalan', 'status', 'created_at'] },
    { name: 'outlet_revenues', columns: ['id', 'outlet_id', 'tanggal', 'jumlah_omzet', 'dicatat_oleh'] },
    { name: 'sops', columns: ['id', 'nomor', 'judul', 'berlaku_di', 'jabatan_terkait', 'isi', 'keterangan_validasi', 'hanya_outlet_terpilih', 'sasaran_role', 'tanggal_dibuat', 'status_kirim', 'created_at'] },
    { name: 'kpis', columns: ['id', 'employee_id', 'periode', 'skor_kpi', 'evaluator_id', 'catatan'] },
    { name: 'ratings_360', columns: ['id', 'employee_id', 'kedisiplinan', 'inisiatif', 'kerjasama', 'kebersihan', 'etika', 'created_at'] },
    { name: 'sanctions', columns: ['id', 'employee_id', 'tipe_sanksi', 'bentuk_kesalahan', 'alasan', 'tanggal_berlaku', 'tanggal_berakhir', 'status', 'diketahui_oleh', 'tanggal_terbit'] },
    { name: 'documentations', columns: ['id', 'tanggal_publish', 'judul', 'isi', 'file_name', 'file_path', 'status', 'status_kirim', 'berlaku_di', 'jabatan_terkait', 'created_at'] },
    { name: 'break_schedules', columns: ['id', 'employee_id', 'date', 'sesi', 'jam_mulai', 'jam_selesai', 'created_at'] },
    { name: 'mobile_user_notifications', columns: ['id', 'employee_id', 'outlet', 'title', 'message', 'type', 'is_read', 'created_at'] },
    { name: 'rbac_permissions', columns: ['id', 'role', 'permission_key', 'is_allowed'] },
    { name: 'trainings', columns: ['id', 'nama_program', 'divisi', 'tanggal_mulai', 'tanggal_selesai', 'kuota', 'status', 'created_at'] },
    { name: 'system_settings', columns: ['id', 'key', 'value', 'description'] },
    { name: 'policies', columns: ['id', 'nama_kebijakan', 'kategori', 'nilai', 'keterangan', 'efek_performa', 'status', 'hanya_outlet_terpilih', 'berlaku_di', 'created_at'] },
    { name: 'position_permissions', columns: ['id', 'position', 'module', 'can_view', 'can_edit', 'can_delete'] },
    { name: 'peak_days', columns: ['id', 'tanggal', 'bulan', 'tahun', 'nama_peak_day'] },
    { name: 'contracts', columns: ['id', 'nomor_surat', 'employee_id', 'jenis_kontrak', 'gaji_pokok', 'uang_makan', 'uang_lembur', 'tunjangan_lama_bekerja', 'tunjangan_keluarga', 'tanggal_pembuatan', 'tanggal_selesai', 'status_persetujuan', 'keterangan'] }
  ];

  try {
    for (const table of tables) {
      console.log(`ETL: Membaca data tabel '${table.name}' dari SQLite...`);
      const rows = await getSqliteData(`SELECT * FROM ${table.name}`);
      
      if (rows.length === 0) {
        console.log(`ETL: Tabel '${table.name}' kosong. Lewati.`);
        continue;
      }

      console.log(`ETL: Mentransfer ${rows.length} record ke MySQL '${table.name}'...`);
      
      const placeholders = table.columns.map(() => '?').join(', ');
      const insertQuery = `INSERT INTO ${table.name} (${table.columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = table.columns.map(col => {
          return sanitizeValue(table.name, col, row[col]);
        });

        await mysqlConn.execute(insertQuery, values);
      }
      console.log(`SUCCESS: Impor data tabel '${table.name}' selesai.`);
    }

    // 4. Tambahkan relasi Constraint Foreign Key pasca impor data sukses
    console.log('MIGRATION: Membuat constraint foreign key...');
    const fkStatements = [
      'ALTER TABLE employees ADD CONSTRAINT fk_emp_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
      'ALTER TABLE attendances ADD CONSTRAINT fk_att_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE',
      'ALTER TABLE leaves ADD CONSTRAINT fk_leaves_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE',
      'ALTER TABLE leaves ADD CONSTRAINT fk_leaves_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE payrolls ADD CONSTRAINT fk_payroll_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE',
      'ALTER TABLE outlet_revenues ADD CONSTRAINT fk_revenue_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE',
      'ALTER TABLE outlet_revenues ADD CONSTRAINT fk_revenue_recorder FOREIGN KEY (dicatat_oleh) REFERENCES users(id)',
      'ALTER TABLE kpis ADD CONSTRAINT fk_kpi_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE',
      'ALTER TABLE kpis ADD CONSTRAINT fk_kpi_evaluator FOREIGN KEY (evaluator_id) REFERENCES users(id)',
      'ALTER TABLE ratings_360 ADD CONSTRAINT fk_ratings_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE',
      'ALTER TABLE sanctions ADD CONSTRAINT fk_sanctions_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE',
      'ALTER TABLE break_schedules ADD CONSTRAINT fk_breaks_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE',
      'ALTER TABLE mobile_user_notifications ADD CONSTRAINT fk_notif_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE',
      'ALTER TABLE contracts ADD CONSTRAINT fk_contracts_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'
    ];

    for (const fk of fkStatements) {
      await mysqlConn.query(fk);
    }

    // Aktifkan kembali system checks
    await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('=== SUCCESS: SELURUH SKEMA DAN DATA BERHASIL DIMIGRASIKAN KE MYSQL ===');
  } catch (err) {
    console.error('CRITICAL: Kegagalan proses migrasi ETL data:', err.message);
    // Pastikan FK check dinyalakan kembali walau gagal
    try {
      await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (_) {}
    process.exit(1);
  } finally {
    sqliteDb.close();
    await mysqlConn.end();
  }
}

executeMigration();
