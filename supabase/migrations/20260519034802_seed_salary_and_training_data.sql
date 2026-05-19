/*
  # Seed Salary and Training Data

  Seeds:
  - 5 salary components
  - Salary records for current month for active employees
  - 4 training programs
  - Training enrollments
*/

-- Salary components
INSERT INTO salary_components (id, name, component_type, description, is_taxable, is_recurring) VALUES
  ('f1000000-f000-4000-a000-000000000001', 'Gaji Pokok', 'earning', 'Gaji pokok bulanan', true, true),
  ('f1000000-f000-4000-a000-000000000002', 'Tunjangan Transport', 'earning', 'Tunjangan transportasi harian', false, true),
  ('f1000000-f000-4000-a000-000000000003', 'BPJS Ketenagakerjaan', 'deduction', 'Iuran BPJS TK (5%)', true, true),
  ('f1000000-f000-4000-a000-000000000004', 'BPJS Kesehatan', 'deduction', 'Iuran BPJS Kesehatan (1%)', true, true),
  ('f1000000-f000-4000-a000-000000000005', 'Tunjangan Makan', 'earning', 'Tunjangan makan harian', false, true)
ON CONFLICT DO NOTHING;

-- Salary records for current month
INSERT INTO employee_salaries (employee_id, period_month, period_year, basic_salary, transport_allowance, meal_allowance, housing_allowance, overtime_pay, bonus, other_earnings, bpjs_tk, bpjs_kesehatan, pph21, other_deductions, status) VALUES
  ('b1000000-b000-4000-c000-000000000001', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 15000000, 1000000, 750000, 0, 0, 0, 0, 750000, 150000, 1250000, 0, 'approved'),
  ('b1000000-b000-4000-c000-000000000002', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 9000000, 600000, 500000, 0, 0, 0, 0, 450000, 90000, 450000, 0, 'approved'),
  ('b1000000-b000-4000-c000-000000000003', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 20000000, 1500000, 750000, 2000000, 0, 5000000, 0, 1000000, 200000, 2500000, 0, 'approved'),
  ('b1000000-b000-4000-c000-000000000004', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 13000000, 800000, 600000, 0, 500000, 0, 0, 650000, 130000, 950000, 0, 'draft'),
  ('b1000000-b000-4000-c000-000000000005', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 9500000, 600000, 500000, 0, 0, 0, 0, 475000, 95000, 475000, 0, 'draft'),
  ('b1000000-b000-4000-c000-000000000006', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 9000000, 600000, 500000, 0, 0, 0, 0, 450000, 90000, 450000, 0, 'draft'),
  ('b1000000-b000-4000-c000-000000000007', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 18000000, 1500000, 750000, 2000000, 0, 0, 0, 900000, 180000, 2200000, 0, 'approved'),
  ('b1000000-b000-4000-c000-000000000008', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 10000000, 600000, 500000, 0, 0, 0, 0, 500000, 100000, 600000, 0, 'draft'),
  ('b1000000-b000-4000-c000-000000000009', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 9500000, 600000, 500000, 0, 300000, 0, 0, 475000, 95000, 475000, 0, 'draft'),
  ('b1000000-b000-4000-c000-000000000010', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 8500000, 600000, 500000, 0, 0, 0, 0, 425000, 85000, 425000, 0, 'draft'),
  ('b1000000-b000-4000-c000-000000000011', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 14000000, 1000000, 750000, 0, 0, 0, 0, 700000, 140000, 1100000, 0, 'approved'),
  ('b1000000-b000-4000-c000-000000000012', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 8000000, 600000, 500000, 0, 0, 0, 0, 400000, 80000, 400000, 0, 'draft'),
  ('b1000000-b000-4000-c000-000000000013', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 7000000, 400000, 400000, 0, 0, 0, 0, 350000, 70000, 350000, 0, 'draft'),
  ('b1000000-b000-4000-c000-000000000014', EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 5000000, 300000, 300000, 0, 0, 0, 0, 250000, 50000, 250000, 0, 'draft')
ON CONFLICT DO NOTHING;

-- Trainings
INSERT INTO trainings (id, title, description, trainer, category, start_date, end_date, location, quota, status, certificate) VALUES
  ('a1b2c3d4-e5f6-4000-a000-000000000001', 'Onboarding Perusahaan', 'Pengenalan budaya, kebijakan, dan prosedur perusahaan', 'HR Department', 'compliance', CURRENT_DATE - 30, CURRENT_DATE - 28, 'Ruang Meeting A', 20, 'completed', true),
  ('a1b2c3d4-e5f6-4000-a000-000000000002', 'React & TypeScript Advanced', 'Pelatihan lanjutan React hooks, TypeScript generics, dan performance optimization', 'Andi Wijaya', 'technical', CURRENT_DATE + 7, CURRENT_DATE + 9, 'Lab IT Lt. 3', 15, 'upcoming', true),
  ('a1b2c3d4-e5f6-4000-a000-000000000003', 'Kepemimpinan Efektif', 'Program pengembangan kepemimpinan untuk manajer dan team lead', 'External Consultant', 'leadership', CURRENT_DATE + 14, CURRENT_DATE + 16, 'Ballroom Hotel', 10, 'upcoming', true),
  ('a1b2c3d4-e5f6-4000-a000-000000000004', 'Keselamatan Kerja (K3)', 'Pelatihan keselamatan dan kesehatan kerja sesuai standar Kemenaker', 'Safety Officer', 'safety', CURRENT_DATE - 7, CURRENT_DATE - 6, 'Aula Lt. 1', 30, 'completed', true)
ON CONFLICT DO NOTHING;

-- Training enrollments
INSERT INTO training_enrollments (training_id, employee_id, status, score, completed_at) VALUES
  ('a1b2c3d4-e5f6-4000-a000-000000000001', 'b1000000-b000-4000-c000-000000000005', 'completed', 90, CURRENT_DATE - 28),
  ('a1b2c3d4-e5f6-4000-a000-000000000001', 'b1000000-b000-4000-c000-000000000006', 'completed', 85, CURRENT_DATE - 28),
  ('a1b2c3d4-e5f6-4000-a000-000000000001', 'b1000000-b000-4000-c000-000000000013', 'completed', 88, CURRENT_DATE - 28),
  ('a1b2c3d4-e5f6-4000-a000-000000000001', 'b1000000-b000-4000-c000-000000000014', 'completed', 92, CURRENT_DATE - 28),
  ('a1b2c3d4-e5f6-4000-a000-000000000004', 'b1000000-b000-4000-c000-000000000001', 'completed', 95, CURRENT_DATE - 6),
  ('a1b2c3d4-e5f6-4000-a000-000000000004', 'b1000000-b000-4000-c000-000000000011', 'completed', 88, CURRENT_DATE - 6),
  ('a1b2c3d4-e5f6-4000-a000-000000000002', 'b1000000-b000-4000-c000-000000000004', 'enrolled', null, null),
  ('a1b2c3d4-e5f6-4000-a000-000000000002', 'b1000000-b000-4000-c000-000000000005', 'enrolled', null, null),
  ('a1b2c3d4-e5f6-4000-a000-000000000002', 'b1000000-b000-4000-c000-000000000006', 'enrolled', null, null),
  ('a1b2c3d4-e5f6-4000-a000-000000000003', 'b1000000-b000-4000-c000-000000000003', 'enrolled', null, null),
  ('a1b2c3d4-e5f6-4000-a000-000000000003', 'b1000000-b000-4000-c000-000000000007', 'enrolled', null, null),
  ('a1b2c3d4-e5f6-4000-a000-000000000003', 'b1000000-b000-4000-c000-000000000011', 'enrolled', null, null)
ON CONFLICT DO NOTHING;
