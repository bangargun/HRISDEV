import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

dotenv.config();

const INDONESIAN_NAMES = [
  'Budi Santoso', 'Siti Aminah', 'Joko Widodo', 'Dewi Lestari', 'Ahmad Hidayat',
  'Rina Wati', 'Agus Susanto', 'Sri Wahyuni', 'Eko Prasetyo', 'Mega Utami',
  'Andi Wijaya', 'Ani Suryani', 'Hendra Wijaya', 'Yanti Ratnasari', 'Bambang Hermawan',
  'Kartika Sari', 'Rudi Hartono', 'Endang Setyowati', 'Dwi Cahyono', 'Lilis Karlina',
  'Taufik Hidayat', 'Dian Sastrowardoyo', 'Wawan Setiawan', 'Novianti', 'Herianto',
  'Ria Ricis', 'Deddy Corbuzier', 'Raffi Ahmad', 'Nagita Slavina', 'Atta Halilintar',
  'Aurel Hermansyah', 'Anang Hermansyah', 'Ashanty', 'Krisdayanti', 'Raul Lemos',
  'Sule Sutisna', 'Andre Taulany', 'Nunung', 'Tukul Arwana', 'Parto Patrio',
  'Soleh Solihun', 'Raditya Dika', 'Ernest Prakasa', 'Pandji Pragiwaksono', 'Bintang Emon',
  'Kaesang Pangarep', 'Gibran Rakabuming', 'Bobby Nasution', 'Kahiyang Ayu', 'Selvi Ananda'
];

const POSITIONS = ['Kasir', 'Pramuniaga', 'Staff Gudang', 'Supervisor', 'Asisten Kepala Toko'];
const DEPARTMENTS = ['Operasional', 'Logistik', 'Administrasi'];
const GENDERS = ['Pria', 'Wanita'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTime(startHour, endHour) {
  const hour = Math.floor(Math.random() * (endHour - startHour)) + startHour;
  const minute = Math.floor(Math.random() * 60);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

async function main() {
  console.log('Connecting to MySQL database...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hris_barokah',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    // 1. Get outlets
    const [outlets] = await connection.execute('SELECT nama FROM outlets');
    if (outlets.length === 0) {
      console.log('No outlets found in the database. Inserting default outlets first...');
      const defaultOutlets = ['Outlet Tebet', 'Outlet Kemang', 'Outlet Sudirman', 'Outlet Kelapa Gading'];
      for (const o of defaultOutlets) {
        await connection.execute(
          'INSERT INTO outlets (nama, alamat, latitude, longitude, radius) VALUES (?, ?, ?, ?, ?)',
          [o, `Jl. Raya ${o}`, -6.2, 106.8, 100]
        );
      }
      console.log('Default outlets inserted.');
    }

    const [allOutlets] = await connection.execute('SELECT nama FROM outlets');
    const outletNames = allOutlets.map(o => o.nama);
    console.log('Available Outlets:', outletNames);

    // 2. Create dummy selfie images if not exists
    const uploadsDir = path.resolve('uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    const dummySelfiePath = path.join(uploadsDir, 'selfie_mock.jpg');
    if (!fs.existsSync(dummySelfiePath)) {
      // Write a tiny 1x1 dummy black JPEG or similar binary structure
      const dummyBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
      fs.writeFileSync(dummySelfiePath, dummyBuffer);
      console.log('Created dummy selfie image file at:', dummySelfiePath);
    }

    // 3. Clear existing mock users to avoid pollution
    console.log('Cleaning up existing mock accounts...');
    await connection.execute('DELETE FROM users WHERE email LIKE "%@barokah.com"');
    console.log('Cleanup complete.');

    // 4. Generate 50 employees
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    console.log('Generating 50 mock employees...');
    for (let i = 0; i < 50; i++) {
      const name = INDONESIAN_NAMES[i % INDONESIAN_NAMES.length] + ` (${i + 1})`;
      const email = `employee${i + 1}@barokah.com`;
      const nik = `101000${String(i + 1).padStart(3, '0')}`;
      const phone = `081234567${String(i + 1).padStart(3, '0')}`;
      const address = `Jl. Perintis Kemerdekaan No. ${i + 1}, Jakarta`;
      const position = randomElement(POSITIONS);
      const department = randomElement(DEPARTMENTS);
      const basicSalary = 4500000 + (Math.floor(Math.random() * 10) * 100000);
      const outlet = randomElement(outletNames);
      const gender = randomElement(GENDERS);

      // Insert User
      const [userRes] = await connection.execute(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [email, passwordHash, 'employee']
      );
      const userId = userRes.insertId;

      // Insert Employee
      const [empRes] = await connection.execute(
        `INSERT INTO employees (user_id, nik, full_name, phone, address, position, department, basic_salary, joined_date, outlet, gender, photo_url, status_karyawan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, nik, name, phone, address, position, department, basicSalary, '2026-01-01', outlet, gender, null, 'karyawan tetap']
      );
      const employeeId = empRes.insertId;

      // 5. Generate attendance logs for last week (Mon 2026-06-29 to Sun 2026-07-05)
      const dates = [
        '2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'
      ];

      for (const d of dates) {
        // Skip weekend with 50% probability
        if ((d.endsWith('04') || d.endsWith('05')) && Math.random() > 0.5) {
          continue;
        }

        const clockIn = `${d} ${randomTime(7, 9)}`;
        const clockOut = `${d} ${randomTime(16, 18)}`;
        const breakStart = `${d} ${randomTime(12, 13)}`;
        const breakEnd = `${d} ${randomTime(13, 14)}`;

        // Relative path starting with /uploads/
        const photoIn = '/uploads/selfie_mock.jpg';
        const photoOut = '/uploads/selfie_mock.jpg';
        const photoBreakStart = '/uploads/selfie_mock.jpg';
        const photoBreakEnd = '/uploads/selfie_mock.jpg';

        await connection.execute(
          `INSERT INTO attendances (employee_id, date, clock_in, clock_out, jam_mulai_istirahat, jam_akhir_istirahat, photo_in_url, photo_out_url, photo_break_start_url, photo_break_end_url, status_in, notes, lat_in, lng_in, lat_out, lng_out)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            employeeId, d, clockIn, clockOut, breakStart, breakEnd,
            photoIn, photoOut, photoBreakStart, photoBreakEnd,
            'ontime', 'Simulasi data dummy', -6.2, 106.8, -6.2, 106.8
          ]
        );
      }
    }

    console.log('✅ Successfully generated 50 mock employees and last week attendance logs.');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

main();
