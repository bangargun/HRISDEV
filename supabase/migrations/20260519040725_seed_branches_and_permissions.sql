/*
  # Seed Branches, Permissions, and Role Data

  Seeds:
  - 3 branches (Jakarta HQ, Bandung, Surabaya)
  - 11 permissions across all modules
  - Role permissions for each role
  - Assign employees to branches
*/

-- Branches
INSERT INTO branches (id, name, code, address, city, phone, email, is_active) VALUES
  ('c1a1b1b1-0001-4000-a000-000000000001', 'Kantor Pusat Jakarta', 'JKT-HQ', 'Jl. Sudirman No. 123, Lantai 15', 'Jakarta Selatan', '021-5551234', 'hq@company.com', true),
  ('c1a1b1b1-0001-4000-a000-000000000002', 'Cabang Bandung', 'BDG-01', 'Jl. Asia Afrika No. 88', 'Bandung', '022-5559876', 'bandung@company.com', true),
  ('c1a1b1b1-0001-4000-a000-000000000003', 'Cabang Surabaya', 'SBY-01', 'Jl. Tunjungan No. 55', 'Surabaya', '031-5554321', 'surabaya@company.com', true)
ON CONFLICT DO NOTHING;

-- Assign employees to branches
UPDATE employees SET branch_id = 'c1a1b1b1-0001-4000-a000-000000000001' WHERE id IN (
  'b1000000-b000-4000-c000-000000000001', 'b1000000-b000-4000-c000-000000000002',
  'b1000000-b000-4000-c000-000000000003', 'b1000000-b000-4000-c000-000000000004',
  'b1000000-b000-4000-c000-000000000005', 'b1000000-b000-4000-c000-000000000006',
  'b1000000-b000-4000-c000-000000000007', 'b1000000-b000-4000-c000-000000000008'
);
UPDATE employees SET branch_id = 'c1a1b1b1-0001-4000-a000-000000000002' WHERE id IN (
  'b1000000-b000-4000-c000-000000000009', 'b1000000-b000-4000-c000-000000000010',
  'b1000000-b000-4000-c000-000000000012'
);
UPDATE employees SET branch_id = 'c1a1b1b1-0001-4000-a000-000000000003' WHERE id IN (
  'b1000000-b000-4000-c000-000000000011', 'b1000000-b000-4000-c000-000000000013',
  'b1000000-b000-4000-c000-000000000014', 'b1000000-b000-4000-c000-000000000015'
);

-- Permissions
INSERT INTO permissions (id, code, name, module, description) VALUES
  ('d1e1f1f1-0001-4000-a000-000000000001', 'dashboard.view', 'Lihat Dashboard', 'dashboard', 'Akses melihat halaman dashboard'),
  ('d1e1f1f1-0001-4000-a000-000000000002', 'employees.view', 'Lihat Karyawan', 'employees', 'Akses melihat data karyawan'),
  ('d1e1f1f1-0001-4000-a000-000000000003', 'employees.manage', 'Kelola Karyawan', 'employees', 'Tambah, edit, hapus karyawan'),
  ('d1e1f1f1-0001-4000-a000-000000000004', 'attendance.view', 'Lihat Kehadiran', 'attendance', 'Akses melihat data kehadiran'),
  ('d1e1f1f1-0001-4000-a000-000000000005', 'attendance.manage', 'Kelola Kehadiran', 'attendance', 'Catat dan ubah data kehadiran'),
  ('d1e1f1f1-0001-4000-a000-000000000006', 'leaves.view', 'Lihat Cuti', 'leaves', 'Akses melihat data cuti'),
  ('d1e1f1f1-0001-4000-a000-000000000007', 'leaves.manage', 'Kelola Cuti', 'leaves', 'Ajukan, setujui, tolak cuti'),
  ('d1e1f1f1-0001-4000-a000-000000000008', 'payroll.view', 'Lihat Penggajian', 'payroll', 'Akses melihat data gaji'),
  ('d1e1f1f1-0001-4000-a000-000000000009', 'payroll.manage', 'Kelola Penggajian', 'payroll', 'Buat, edit, setujui slip gaji'),
  ('d1e1f1f1-0001-4000-a000-000000000010', 'training.view', 'Lihat Training', 'training', 'Akses melihat data training'),
  ('d1e1f1f1-0001-4000-a000-000000000011', 'training.manage', 'Kelola Training', 'training', 'Buat, edit, daftarkan peserta'),
  ('d1e1f1f1-0001-4000-a000-000000000012', 'departments.view', 'Lihat Departemen', 'departments', 'Akses melihat departemen & jabatan'),
  ('d1e1f1f1-0001-4000-a000-000000000013', 'departments.manage', 'Kelola Departemen', 'departments', 'Tambah, edit, hapus departemen & jabatan'),
  ('d1e1f1f1-0001-4000-a000-000000000014', 'salary-formula.view', 'Lihat Formula Gaji', 'salary-formula', 'Akses melihat formula gaji'),
  ('d1e1f1f1-0001-4000-a000-000000000015', 'salary-formula.manage', 'Kelola Formula Gaji', 'salary-formula', 'Tambah, edit, hapus formula gaji'),
  ('d1e1f1f1-0001-4000-a000-000000000016', 'branches.view', 'Lihat Cabang', 'branches', 'Akses melihat data cabang'),
  ('d1e1f1f1-0001-4000-a000-000000000017', 'branches.manage', 'Kelola Cabang', 'branches', 'Tambah, edit, hapus cabang'),
  ('d1e1f1f1-0001-4000-a000-000000000018', 'users.view', 'Lihat Pengguna', 'users', 'Akses melihat daftar pengguna'),
  ('d1e1f1f1-0001-4000-a000-000000000019', 'users.manage', 'Kelola Pengguna', 'users', 'Tambah, edit, hapus pengguna & permisi')
ON CONFLICT DO NOTHING;

-- Role permissions: superadmin gets everything
INSERT INTO role_permissions (role, permission_id)
SELECT 'superadmin', id FROM permissions
ON CONFLICT DO NOTHING;

-- Role permissions: admin gets most things
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions WHERE code NOT IN ('users.manage')
ON CONFLICT DO NOTHING;

-- Role permissions: manager
INSERT INTO role_permissions (role, permission_id) VALUES
  ('manager', 'd1e1f1f1-0001-4000-a000-000000000001'),
  ('manager', 'd1e1f1f1-0001-4000-a000-000000000002'),
  ('manager', 'd1e1f1f1-0001-4000-a000-000000000004'),
  ('manager', 'd1e1f1f1-0001-4000-a000-000000000005'),
  ('manager', 'd1e1f1f1-0001-4000-a000-000000000006'),
  ('manager', 'd1e1f1f1-0001-4000-a000-000000000007'),
  ('manager', 'd1e1f1f1-0001-4000-a000-000000000008'),
  ('manager', 'd1e1f1f1-0001-4000-a000-000000000010'),
  ('manager', 'd1e1f1f1-0001-4000-a000-000000000011'),
  ('manager', 'd1e1f1f1-0001-4000-a000-000000000012'),
  ('manager', 'd1e1f1f1-0001-4000-a000-000000000016')
ON CONFLICT DO NOTHING;

-- Role permissions: hr_staff
INSERT INTO role_permissions (role, permission_id) VALUES
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000001'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000002'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000003'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000004'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000005'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000006'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000007'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000008'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000010'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000011'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000012'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000013'),
  ('hr_staff', 'd1e1f1f1-0001-4000-a000-000000000016')
ON CONFLICT DO NOTHING;

-- Role permissions: employee (Android users - limited access)
INSERT INTO role_permissions (role, permission_id) VALUES
  ('employee', 'd1e1f1f1-0001-4000-a000-000000000001'),
  ('employee', 'd1e1f1f1-0001-4000-a000-000000000002'),
  ('employee', 'd1e1f1f1-0001-4000-a000-000000000004'),
  ('employee', 'd1e1f1f1-0001-4000-a000-000000000006'),
  ('employee', 'd1e1f1f1-0001-4000-a000-000000000010')
ON CONFLICT DO NOTHING;
