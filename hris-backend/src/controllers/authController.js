import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { dbQuery } from '../config/db.js';
import { config } from '../config/env.js';
import { mapPositionToRole } from '../middleware/permissionMiddleware.js';

/**
 * Login Pengguna
 */
export async function login(req, res) {
  const { email, password, client } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email dan password harus diisi.'
    });
  }

  const searchUser = email.toLowerCase().trim();

  try {
    // Cari user di database SQLite standard
    const user = await dbQuery.get("SELECT * FROM users WHERE email = ?", [searchUser]);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Email atau password yang Anda masukkan salah.'
      });
    }

    // Verifikasi password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Email atau password yang Anda masukkan salah.'
      });
    }

    const userRole = user.role.toLowerCase();
    // Guard Access: Web client hanya diperuntukkan bagi Master, Owner, Admin, Leader
    const isClientWeb = client === 'web';
    const isWebAllowed = userRole === 'master' || userRole === 'owner' || userRole === 'admin' || userRole === 'leader';
    if (isClientWeb && !isWebAllowed) {
      return res.status(403).json({
        status: 'error',
        message: 'Akses Ditolak: Akun Karyawan biasa hanya diperbolehkan masuk melalui Aplikasi Mobile Android.'
      });
    }

    // Ambil profil karyawan terkait
    const employee = await dbQuery.get("SELECT id, full_name, position, department, outlet FROM employees WHERE user_id = ?", [user.id]);

    // Sign JWT Token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          employeeId: employee ? employee.id : null,
          fullName: employee ? employee.full_name : 'Admin System',
          outlet: employee ? employee.outlet : null,
          position: employee ? employee.position : null,
          department: employee ? employee.department : null
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan sistem saat memproses login.'
    });
  }
}

/**
 * Mendapatkan data profil user aktif
 */
export async function getMe(req, res) {
  try {
    const user = await dbQuery.get(
      `SELECT u.id, u.email, u.role, e.id as employee_id, e.nik, e.full_name, e.position, e.department, e.basic_salary, e.joined_date, e.outlet
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Pengguna tidak ditemukan.'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('GetMe error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan sistem saat mengambil profil.'
    });
  }
}

/**
 * Mendapatkan daftar hak akses modul dari user aktif
 */
export async function getMyPermissions(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Akses ditolak: Membutuhkan autentikasi.'
      });
    }

    const modules = [
      'employees', 'attendances', 'leaves', 'payroll', 'outlets',
      'revenues', 'sops', 'contracts', 'kpis', 'sanctions',
      'trainings', 'policies', 'settings', 'kuis', 'angket', 'broadcast'
    ];

    let permissions = {};

    if (req.user.role === 'owner') {
      // Owner memiliki hak akses penuh (bypass) untuk seluruh modul
      for (const mod of modules) {
        permissions[mod] = { can_view: 1, can_edit: 1, can_delete: 1 };
      }
    } else {
      const role = mapPositionToRole(req.user.position);
      const rows = await dbQuery.all(
        "SELECT module, can_view, can_edit, can_delete FROM position_permissions WHERE position = ?",
        [role]
      );
      
      // Inisialisasi default 0 untuk semua modul
      for (const mod of modules) {
        permissions[mod] = { can_view: 0, can_edit: 0, can_delete: 0 };
      }

      for (const row of rows) {
        if (modules.includes(row.module)) {
          permissions[row.module] = {
            can_view: row.can_view,
            can_edit: row.can_edit,
            can_delete: row.can_delete
          };
        }
      }
    }

    return res.status(200).json({
      status: 'success',
      data: {
        permissions
      }
    });
  } catch (error) {
    console.error('getMyPermissions error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan sistem saat mengambil hak akses.'
    });
  }
}
