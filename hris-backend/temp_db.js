import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    const [outlets] = await connection.execute('SELECT * FROM outlets LIMIT 5');
    console.log('Outlets details:', outlets);

    const [employees] = await connection.execute('SELECT id, nik, full_name, status, status_karyawan, outlet, gender FROM employees LIMIT 5');
    console.log('Employees details:', employees);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

main();
