/**
 * Utilitas untuk mengelola seluruh skema migrasi database MySQL secara terstruktur.
 */
export async function runDatabaseMigrations(connection) {
  try {
    console.log('⚡ Menjalankan migrasi database terstruktur...');

    // 1. Tambah kolom response pada tabel mobile_user_notifications
    try {
      await connection.execute("ALTER TABLE mobile_user_notifications ADD COLUMN response VARCHAR(255) NULL");
      console.log('Migration SUCCESS: Kolom response ditambahkan ke mobile_user_notifications.');
    } catch (_) {}

    // 2. Tambah kolom read_at pada tabel mobile_user_notifications
    try {
      await connection.execute("ALTER TABLE mobile_user_notifications ADD COLUMN read_at TIMESTAMP NULL");
      console.log('Migration SUCCESS: Kolom read_at ditambahkan ke mobile_user_notifications.');
    } catch (_) {}

    // 3. Tambah kolom photo_url pada tabel employees
    try {
      await connection.execute("ALTER TABLE employees ADD COLUMN photo_url VARCHAR(500) NULL");
      console.log('Migration SUCCESS: Kolom photo_url ditambahkan ke employees.');
    } catch (_) {}

    // 4. Tambah kolom latitude pada tabel outlets
    try {
      await connection.execute("ALTER TABLE outlets ADD COLUMN latitude DECIMAL(11, 8) NULL");
      console.log('Migration SUCCESS: Kolom latitude ditambahkan ke outlets.');
    } catch (_) {}

    // 5. Tambah kolom longitude pada tabel outlets
    try {
      await connection.execute("ALTER TABLE outlets ADD COLUMN longitude DECIMAL(11, 8) NULL");
      console.log('Migration SUCCESS: Kolom longitude ditambahkan ke outlets.');
    } catch (_) {}

    // 6. Tambah kolom radius pada tabel outlets
    try {
      await connection.execute("ALTER TABLE outlets ADD COLUMN radius INT NULL");
      console.log('Migration SUCCESS: Kolom radius ditambahkan ke outlets.');
    } catch (_) {}

    // 7. Tambah kolom ikut_briefing pada tabel attendances
    try {
      await connection.execute("ALTER TABLE attendances ADD COLUMN ikut_briefing VARCHAR(10) DEFAULT 'Tidak'");
      console.log('Migration SUCCESS: Kolom ikut_briefing ditambahkan ke attendances.');
    } catch (_) {}

    // 8. Tambah kolom photo_break_start_url pada tabel attendances
    try {
      await connection.execute("ALTER TABLE attendances ADD COLUMN photo_break_start_url TEXT NULL");
      console.log('Migration SUCCESS: Kolom photo_break_start_url ditambahkan ke attendances.');
    } catch (_) {}

    // 9. Tambah kolom photo_break_end_url pada tabel attendances
    try {
      await connection.execute("ALTER TABLE attendances ADD COLUMN photo_break_end_url TEXT NULL");
      console.log('Migration SUCCESS: Kolom photo_break_end_url ditambahkan ke attendances.');
    } catch (_) {}

    console.log('✅ Semua migrasi database selesai diproses.');
  } catch (error) {
    console.error('Migration CRITICAL: Gagal memproses migrasi database:', error.message);
  }
}
