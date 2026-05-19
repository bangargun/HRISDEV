/*
  # Seed Salary Formula Data

  Seeds default salary formula templates:
  - Earnings: Gaji Pokok, Tunjangan Transport, Tunjangan Makan, Tunjangan Perumahan, Lembur, Bonus
  - Deductions: BPJS TK, BPJS Kesehatan, PPh 21 (tiered), Potongan Lainnya
  - PPh 21 tiered config uses Indonesian tax brackets
*/

-- Earnings
INSERT INTO salary_formulas (id, name, code, component_type, calculation_method, base_reference, percentage, fixed_amount, is_taxable, is_mandatory, sort_order, description, tier_config) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Gaji Pokok', 'BASIC_SALARY', 'earning', 'fixed', 'basic_salary', 0, 0, true, true, 1, 'Gaji pokok bulanan sesuai kontrak kerja', '[]'),
  ('a1b2c3d4-0001-4000-8000-000000000002', 'Tunjangan Transport', 'TRANSPORT_ALLOWANCE', 'earning', 'percentage', 'basic_salary', 6.67, 0, false, false, 2, 'Tunjangan transportasi = 6.67% dari gaji pokok', '[]'),
  ('a1b2c3d4-0001-4000-8000-000000000003', 'Tunjangan Makan', 'MEAL_ALLOWANCE', 'earning', 'percentage', 'basic_salary', 5.00, 0, false, false, 3, 'Tunjangan makan = 5% dari gaji pokok', '[]'),
  ('a1b2c3d4-0001-4000-8000-000000000004', 'Tunjangan Perumahan', 'HOUSING_ALLOWANCE', 'earning', 'percentage', 'basic_salary', 10.00, 0, false, false, 4, 'Tunjangan perumahan = 10% dari gaji pokok (hanya untuk level manager ke atas)', '[]'),
  ('a1b2c3d4-0001-4000-8000-000000000005', 'Lembur', 'OVERTIME_PAY', 'earning', 'formula', 'basic_salary', 0, 0, true, false, 5, 'Lembur = (gaji pokok / 173) * jam_lembur * 1.5', '[]'),
  ('a1b2c3d4-0001-4000-8000-000000000006', 'Bonus', 'BONUS', 'earning', 'fixed', 'basic_salary', 0, 0, true, false, 6, 'Bonus kinerja / THR (diisi manual)', '[]'),
  ('a1b2c3d4-0001-4000-8000-000000000007', 'Pendapatan Lainnya', 'OTHER_EARNINGS', 'earning', 'fixed', 'basic_salary', 0, 0, true, false, 7, 'Pendapatan lain-lain (diisi manual)', '[]')
ON CONFLICT DO NOTHING;

-- Deductions
INSERT INTO salary_formulas (id, name, code, component_type, calculation_method, base_reference, percentage, fixed_amount, is_taxable, is_mandatory, sort_order, description, tier_config) VALUES
  ('a1b2c3d4-0002-4000-8000-000000000001', 'BPJS Ketenagakerjaan (JHT)', 'BPJS_TK', 'deduction', 'percentage', 'basic_salary', 5.00, 0, true, true, 101, 'Iuran JHT BPJS Ketenagakerjaan = 5.7% (5% perusahaan + 0.7% pekerja). Yang dipotong dari gaji pekerja = 2%', '[]'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'BPJS Kesehatan', 'BPJS_KESEHATAN', 'deduction', 'percentage', 'basic_salary', 1.00, 0, true, true, 102, 'Iuran BPJS Kesehatan = 5% (4% perusahaan + 1% pekerja). Yang dipotong dari gaji pekerja = 1%', '[]'),
  ('a1b2c3d4-0002-4000-8000-000000000003', 'PPh 21 (Pajak Penghasilan)', 'PPH21', 'deduction', 'tiered', 'gross_salary', 0, 0, true, true, 103, 'Pajak penghasilan pasal 21 dengan tarif progresif sesuai PTKP', '[
    {"min": 0, "max": 54000000, "rate": 5, "description": "Lapisan 1: 0 - 54 juta (5%)"},
    {"min": 54000000, "max": 250000000, "rate": 15, "description": "Lapisan 2: 54 juta - 250 juta (15%)"},
    {"min": 250000000, "max": 500000000, "rate": 25, "description": "Lapisan 3: 250 juta - 500 juta (25%)"},
    {"min": 500000000, "max": 5000000000, "rate": 30, "description": "Lapisan 4: > 500 juta (30%)"}
  ]'),
  ('a1b2c3d4-0002-4000-8000-000000000004', 'Potongan Lainnya', 'OTHER_DEDUCTIONS', 'deduction', 'fixed', 'basic_salary', 0, 0, true, false, 104, 'Potongan lain-lain (diisi manual)', '[]')
ON CONFLICT DO NOTHING;
