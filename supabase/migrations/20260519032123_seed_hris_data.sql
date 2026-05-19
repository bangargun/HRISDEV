/*
  # Seed HRIS Initial Data

  Seeds default:
  - 5 departments
  - 10 positions
  - 15 employees (sample data)
  - 4 leave types
  - Sample attendance and leave requests
*/

-- Departments
INSERT INTO departments (id, name, description) VALUES
  ('d1000000-d000-4000-a000-000000000001', 'Human Resources', 'Manages people, culture, and organizational development'),
  ('d1000000-d000-4000-a000-000000000002', 'Engineering', 'Software development and technical infrastructure'),
  ('d1000000-d000-4000-a000-000000000003', 'Finance', 'Financial planning, accounting, and compliance'),
  ('d1000000-d000-4000-a000-000000000004', 'Marketing', 'Brand, growth, and customer acquisition'),
  ('d1000000-d000-4000-a000-000000000005', 'Operations', 'Business operations and process management')
ON CONFLICT DO NOTHING;

-- Positions
INSERT INTO positions (id, title, department_id, level) VALUES
  ('a1000000-a000-4000-b000-000000000001', 'HR Manager', 'd1000000-d000-4000-a000-000000000001', 'manager'),
  ('a1000000-a000-4000-b000-000000000002', 'HR Specialist', 'd1000000-d000-4000-a000-000000000001', 'staff'),
  ('a1000000-a000-4000-b000-000000000003', 'Software Engineer', 'd1000000-d000-4000-a000-000000000002', 'staff'),
  ('a1000000-a000-4000-b000-000000000004', 'Senior Engineer', 'd1000000-d000-4000-a000-000000000002', 'senior'),
  ('a1000000-a000-4000-b000-000000000005', 'Engineering Manager', 'd1000000-d000-4000-a000-000000000002', 'manager'),
  ('a1000000-a000-4000-b000-000000000006', 'Finance Analyst', 'd1000000-d000-4000-a000-000000000003', 'staff'),
  ('a1000000-a000-4000-b000-000000000007', 'Finance Manager', 'd1000000-d000-4000-a000-000000000003', 'manager'),
  ('a1000000-a000-4000-b000-000000000008', 'Marketing Specialist', 'd1000000-d000-4000-a000-000000000004', 'staff'),
  ('a1000000-a000-4000-b000-000000000009', 'Operations Lead', 'd1000000-d000-4000-a000-000000000005', 'lead'),
  ('a1000000-a000-4000-b000-000000000010', 'Operations Staff', 'd1000000-d000-4000-a000-000000000005', 'staff')
ON CONFLICT DO NOTHING;

-- Employees
INSERT INTO employees (id, employee_id, first_name, last_name, email, phone, position_id, department_id, employment_type, status, hire_date, birth_date, gender, city, salary) VALUES
  ('b1000000-b000-4000-c000-000000000001', 'EMP001', 'Budi', 'Santoso', 'budi.santoso@company.com', '081234567890', 'a1000000-a000-4000-b000-000000000001', 'd1000000-d000-4000-a000-000000000001', 'full-time', 'active', '2020-01-15', '1985-05-20', 'male', 'Jakarta', 15000000),
  ('b1000000-b000-4000-c000-000000000002', 'EMP002', 'Siti', 'Rahayu', 'siti.rahayu@company.com', '081234567891', 'a1000000-a000-4000-b000-000000000002', 'd1000000-d000-4000-a000-000000000001', 'full-time', 'active', '2021-03-10', '1990-08-15', 'female', 'Bandung', 9000000),
  ('b1000000-b000-4000-c000-000000000003', 'EMP003', 'Andi', 'Wijaya', 'andi.wijaya@company.com', '081234567892', 'a1000000-a000-4000-b000-000000000005', 'd1000000-d000-4000-a000-000000000002', 'full-time', 'active', '2019-06-01', '1982-11-30', 'male', 'Jakarta', 20000000),
  ('b1000000-b000-4000-c000-000000000004', 'EMP004', 'Dewi', 'Kusuma', 'dewi.kusuma@company.com', '081234567893', 'a1000000-a000-4000-b000-000000000004', 'd1000000-d000-4000-a000-000000000002', 'full-time', 'active', '2021-07-20', '1993-02-14', 'female', 'Surabaya', 13000000),
  ('b1000000-b000-4000-c000-000000000005', 'EMP005', 'Rizky', 'Pratama', 'rizky.pratama@company.com', '081234567894', 'a1000000-a000-4000-b000-000000000003', 'd1000000-d000-4000-a000-000000000002', 'full-time', 'active', '2022-01-10', '1996-07-22', 'male', 'Jakarta', 9500000),
  ('b1000000-b000-4000-c000-000000000006', 'EMP006', 'Nina', 'Permata', 'nina.permata@company.com', '081234567895', 'a1000000-a000-4000-b000-000000000003', 'd1000000-d000-4000-a000-000000000002', 'full-time', 'active', '2022-09-05', '1997-12-01', 'female', 'Yogyakarta', 9000000),
  ('b1000000-b000-4000-c000-000000000007', 'EMP007', 'Hendra', 'Gunawan', 'hendra.gunawan@company.com', '081234567896', 'a1000000-a000-4000-b000-000000000007', 'd1000000-d000-4000-a000-000000000003', 'full-time', 'active', '2018-04-15', '1980-03-08', 'male', 'Jakarta', 18000000),
  ('b1000000-b000-4000-c000-000000000008', 'EMP008', 'Lestari', 'Wulandari', 'lestari.wulandari@company.com', '081234567897', 'a1000000-a000-4000-b000-000000000006', 'd1000000-d000-4000-a000-000000000003', 'full-time', 'active', '2020-11-20', '1992-09-17', 'female', 'Medan', 10000000),
  ('b1000000-b000-4000-c000-000000000009', 'EMP009', 'Fajar', 'Nugroho', 'fajar.nugroho@company.com', '081234567898', 'a1000000-a000-4000-b000-000000000008', 'd1000000-d000-4000-a000-000000000004', 'full-time', 'active', '2021-05-17', '1994-06-25', 'male', 'Semarang', 9500000),
  ('b1000000-b000-4000-c000-000000000010', 'EMP010', 'Ayu', 'Maharani', 'ayu.maharani@company.com', '081234567899', 'a1000000-a000-4000-b000-000000000008', 'd1000000-d000-4000-a000-000000000004', 'full-time', 'active', '2022-03-01', '1998-01-30', 'female', 'Jakarta', 8500000),
  ('b1000000-b000-4000-c000-000000000011', 'EMP011', 'Dimas', 'Saputra', 'dimas.saputra@company.com', '081234567900', 'a1000000-a000-4000-b000-000000000009', 'd1000000-d000-4000-a000-000000000005', 'full-time', 'active', '2019-09-10', '1988-04-12', 'male', 'Jakarta', 14000000),
  ('b1000000-b000-4000-c000-000000000012', 'EMP012', 'Ratna', 'Sari', 'ratna.sari@company.com', '081234567901', 'a1000000-a000-4000-b000-000000000010', 'd1000000-d000-4000-a000-000000000005', 'full-time', 'active', '2021-12-01', '1995-10-28', 'female', 'Bandung', 8000000),
  ('b1000000-b000-4000-c000-000000000013', 'EMP013', 'Yusuf', 'Rahman', 'yusuf.rahman@company.com', '081234567902', 'a1000000-a000-4000-b000-000000000003', 'd1000000-d000-4000-a000-000000000002', 'contract', 'active', '2023-01-15', '1999-03-05', 'male', 'Jakarta', 7000000),
  ('b1000000-b000-4000-c000-000000000014', 'EMP014', 'Indah', 'Lestari', 'indah.lestari@company.com', '081234567903', 'a1000000-a000-4000-b000-000000000002', 'd1000000-d000-4000-a000-000000000001', 'part-time', 'active', '2023-06-01', '2000-07-15', 'female', 'Surabaya', 5000000),
  ('b1000000-b000-4000-c000-000000000015', 'EMP015', 'Bagas', 'Wicaksono', 'bagas.wicaksono@company.com', '081234567904', 'a1000000-a000-4000-b000-000000000003', 'd1000000-d000-4000-a000-000000000002', 'intern', 'inactive', '2023-08-01', '2001-11-20', 'male', 'Malang', 3000000)
ON CONFLICT DO NOTHING;

-- Update department managers
UPDATE departments SET manager_id = 'b1000000-b000-4000-c000-000000000001' WHERE id = 'd1000000-d000-4000-a000-000000000001';
UPDATE departments SET manager_id = 'b1000000-b000-4000-c000-000000000003' WHERE id = 'd1000000-d000-4000-a000-000000000002';
UPDATE departments SET manager_id = 'b1000000-b000-4000-c000-000000000007' WHERE id = 'd1000000-d000-4000-a000-000000000003';
UPDATE departments SET manager_id = 'b1000000-b000-4000-c000-000000000009' WHERE id = 'd1000000-d000-4000-a000-000000000004';
UPDATE departments SET manager_id = 'b1000000-b000-4000-c000-000000000011' WHERE id = 'd1000000-d000-4000-a000-000000000005';

-- Leave types
INSERT INTO leave_types (id, name, days_allowed, color, description) VALUES
  ('c1000000-c000-4000-d000-000000000001', 'Cuti Tahunan', 12, '#3B82F6', 'Hak cuti tahunan karyawan'),
  ('c1000000-c000-4000-d000-000000000002', 'Cuti Sakit', 14, '#EF4444', 'Cuti karena sakit dengan surat dokter'),
  ('c1000000-c000-4000-d000-000000000003', 'Cuti Melahirkan', 90, '#EC4899', 'Cuti melahirkan untuk karyawati'),
  ('c1000000-c000-4000-d000-000000000004', 'Cuti Penting', 3, '#F59E0B', 'Cuti untuk keperluan penting keluarga')
ON CONFLICT DO NOTHING;

-- Sample attendance for today
INSERT INTO attendance (employee_id, date, check_in, check_out, status) VALUES
  ('b1000000-b000-4000-c000-000000000001', CURRENT_DATE, now() - interval '8 hours', now() - interval '1 hour', 'present'),
  ('b1000000-b000-4000-c000-000000000002', CURRENT_DATE, now() - interval '8 hours 30 minutes', now() - interval '30 minutes', 'present'),
  ('b1000000-b000-4000-c000-000000000003', CURRENT_DATE, now() - interval '7 hours', null, 'present'),
  ('b1000000-b000-4000-c000-000000000004', CURRENT_DATE, now() - interval '9 hours 15 minutes', now() - interval '1 hour 15 minutes', 'late'),
  ('b1000000-b000-4000-c000-000000000005', CURRENT_DATE, now() - interval '8 hours', now() - interval '1 hour', 'present'),
  ('b1000000-b000-4000-c000-000000000006', CURRENT_DATE, null, null, 'absent'),
  ('b1000000-b000-4000-c000-000000000007', CURRENT_DATE, now() - interval '9 hours', now() - interval '2 hours', 'present'),
  ('b1000000-b000-4000-c000-000000000008', CURRENT_DATE, now() - interval '8 hours', now() - interval '1 hour', 'present'),
  ('b1000000-b000-4000-c000-000000000009', CURRENT_DATE, now() - interval '8 hours', now(), 'present'),
  ('b1000000-b000-4000-c000-000000000010', CURRENT_DATE, now() - interval '7 hours 45 minutes', null, 'present')
ON CONFLICT DO NOTHING;

-- Sample leave requests
INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days_count, reason, status) VALUES
  ('b1000000-b000-4000-c000-000000000005', 'c1000000-c000-4000-d000-000000000001', CURRENT_DATE + 7, CURRENT_DATE + 9, 3, 'Liburan keluarga', 'pending'),
  ('b1000000-b000-4000-c000-000000000006', 'c1000000-c000-4000-d000-000000000002', CURRENT_DATE, CURRENT_DATE + 2, 3, 'Demam dan flu', 'approved'),
  ('b1000000-b000-4000-c000-000000000008', 'c1000000-c000-4000-d000-000000000004', CURRENT_DATE + 14, CURRENT_DATE + 14, 1, 'Pernikahan saudara', 'approved'),
  ('b1000000-b000-4000-c000-000000000012', 'c1000000-c000-4000-d000-000000000001', CURRENT_DATE - 30, CURRENT_DATE - 27, 4, 'Liburan', 'approved'),
  ('b1000000-b000-4000-c000-000000000010', 'c1000000-c000-4000-d000-000000000001', CURRENT_DATE + 20, CURRENT_DATE + 22, 3, 'Wisata', 'pending')
ON CONFLICT DO NOTHING;
