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
    const [outlets] = await connection.execute('SELECT * FROM outlets');
    console.log('Outlets:', outlets.map(o => ({ id: o.id, name: o.name, code: o.code })));

    const [employees] = await connection.execute("SELECT id, full_name, outlet, employee_status FROM employees WHERE employee_status = 'active' LIMIT 10");
    console.log('Active Employees:', employees);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

main();
