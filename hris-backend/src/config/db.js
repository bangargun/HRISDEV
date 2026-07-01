import mysql from 'mysql2/promise';
import { config } from './env.js';
import { AsyncLocalStorage } from 'async_hooks';
import { runDatabaseMigrations } from './migrations.js';

// Setup AsyncLocalStorage untuk melacak koneksi dalam satu request context (transaksi)
export const transactionContext = new AsyncLocalStorage();

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

/**
 * Mendapatkan client eksekusi aktif (koneksi transaksi spesifik atau pool global)
 */
async function getExecuteClient() {
  const store = transactionContext.getStore();
  if (store && store.has('connection')) {
    return store.get('connection');
  }
  return pool;
}

// Wrapper kompatibilitas tinggi (Drop-in Replacement untuk dbQuery lama)
export const dbQuery = {
  /**
   * Operasi tulis (INSERT, UPDATE, DELETE)
   * Memetakan insertId -> id dan affectedRows -> changes agar controllers lama tidak pecah.
   */
  async run(sql, params = []) {
    try {
      const sqlTrimmed = sql.trim().toUpperCase();
      const store = transactionContext.getStore();

      if (store) {
        // Intersepsi sintaks transaksi SQLite -> MySQL
        if (sqlTrimmed.startsWith('BEGIN TRANSACTION') || sqlTrimmed.startsWith('START TRANSACTION') || sqlTrimmed === 'BEGIN') {
          if (store.has('connection')) {
            throw new Error('Transaction already in progress in this context');
          }
          const conn = await pool.getConnection();
          await conn.beginTransaction();
          store.set('connection', conn);
          return { id: null, changes: 0 };
        }

        if (sqlTrimmed === 'COMMIT') {
          const conn = store.get('connection');
          if (!conn) {
            throw new Error('No active transaction to commit');
          }
          await conn.commit();
          conn.release();
          store.delete('connection');
          return { id: null, changes: 0 };
        }

        if (sqlTrimmed === 'ROLLBACK') {
          const conn = store.get('connection');
          if (!conn) {
            return { id: null, changes: 0 };
          }
          await conn.rollback();
          conn.release();
          store.delete('connection');
          return { id: null, changes: 0 };
        }
      }

      const client = await getExecuteClient();
      const [result] = await client.execute(sql, params);
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
      const client = await getExecuteClient();
      const [rows] = await client.execute(sql, params);
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
      const client = await getExecuteClient();
      const [rows] = await client.execute(sql, params);
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
    
    // Jalankan migrasi database terstruktur
    await runDatabaseMigrations(connection);

    // Seed Sapaan AI settings
    try {
      const [rowsWork] = await connection.execute("SELECT id FROM system_settings WHERE `key` = 'motivasi_kerja_quotes'");
      if (rowsWork.length === 0) {
        const defaultWork = JSON.stringify([
          'Setiap langkah kecil kedisiplinan hari ini adalah investasi kesuksesan hari esok. ~ Barokah AI',
          'Kejujuran dan integritas adalah kunci utama menjemput rezeki yang barokah. ~ Barokah AI',
          'Kerja keras mendatangkan hasil, kerja cerdas mendatangkan efisiensi, kerja ikhlas mendatangkan berkah. ~ Barokah AI',
          'Kualitas pelayanan terbaik lahir dari hati yang tulus dan senyum yang ramah. ~ Barokah AI'
        ]);
        await connection.execute("INSERT INTO system_settings (`key`, `value`, description) VALUES ('motivasi_kerja_quotes', ?, 'Daftar sapaan motivasi masuk kerja (Format JSON)')", [defaultWork]);
        console.log('SUCCESS: Seeded motivasi_kerja_quotes.');
      }
    } catch (err) {
      console.error('Error seeding motivasi_kerja_quotes:', err.message);
    }

    try {
      const [rowsGrat] = await connection.execute("SELECT id FROM system_settings WHERE `key` = 'motivasi_bersyukur_quotes'");
      if (rowsGrat.length === 0) {
        const defaultGrat = JSON.stringify([
          'Alhamdulillah untuk hari ini. Mari pulang dengan rasa syukur dan damai di hati. ~ Barokah AI',
          'Lelah hari ini adalah bukti perjuangan halal Anda untuk keluarga tercinta. Bersyukurlah! ~ Barokah AI',
          'Bekerja dengan baik, pulang dengan bersyukur. Hari yang indah telah kita lewati bersama. ~ Barokah AI',
          'Bersyukur atas rezeki hari ini membuka pintu rezeki yang lebih luas esok hari. ~ Barokah AI'
        ]);
        await connection.execute("INSERT INTO system_settings (`key`, `value`, description) VALUES ('motivasi_bersyukur_quotes', ?, 'Daftar sapaan motivasi pulang bersyukur (Format JSON)')", [defaultGrat]);
        console.log('SUCCESS: Seeded motivasi_bersyukur_quotes.');
      }
    } catch (err) {
      console.error('Error seeding motivasi_bersyukur_quotes:', err.message);
    }

    connection.release();
  } catch (error) {
    console.error('CRITICAL: Gagal membangun koneksi pool ke MySQL:', error.message);
    process.exit(1);
  }
}

export default pool;
