import mysql from 'mysql2/promise';
import { config } from './env.js';

// Konfigurasi parameter pool MySQL dari environment
const pool = mysql.createPool({
  host: config.dbHost || '127.0.0.1',
  user: config.dbUser || 'root',
  password: config.dbPassword || '',
  database: config.dbName || 'hris_barokah',
  port: parseInt(config.dbPort || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10, // Menghindari exhaustion batas maksimal koneksi MySQL
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

console.log(`MySQL Connection Pool diinisialisasi ke host: ${config.dbHost || '127.0.0.1'}`);

// Wrapper kompatibilitas tinggi (Drop-in Replacement untuk dbQuery lama)
export const dbQuery = {
  /**
   * Operasi tulis (INSERT, UPDATE, DELETE)
   * Memetakan insertId -> id dan affectedRows -> changes agar controllers lama tidak pecah.
   */
  async run(sql, params = []) {
    try {
      const [result] = await pool.execute(sql, params);
      return {
        id: result.insertId || null,
        changes: result.affectedRows !== undefined ? result.affectedRows : 0
      };
    } catch (error) {
      console.error(`Database execute error: ${sql}`, error.message);
      throw error;
    }
  },

  /**
   * Mengambil baris pertama (SELECT LIMIT 1)
   */
  async get(sql, params = []) {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error(`Database query get error: ${sql}`, error.message);
      throw error;
    }
  },

  /**
   * Mengambil seluruh data (SELECT)
   */
  async all(sql, params = []) {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error(`Database query all error: ${sql}`, error.message);
      throw error;
    }
  }
};

/**
 * Fungsi inisialisasi hanya untuk memeriksa konektivitas saat booting backend.
 * DDL skema database akan didelegasikan secara terpisah lewat skrip migrasi mandiri.
 */
export async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('SUCCESS: Berhasil terhubung ke database MySQL.');
    connection.release();
  } catch (error) {
    console.error('CRITICAL: Gagal membangun koneksi pool ke MySQL:', error.message);
    process.exit(1);
  }
}

export default pool;
