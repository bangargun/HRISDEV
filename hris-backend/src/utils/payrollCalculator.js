export const LATE_DEDUCTION_AMOUNT = 50000.0; // Potongan terlambat: Rp 50.000 per terlambat
export const DEFAULT_ALLOWANCE = 500000.0; // Tunjangan makan & transport default: Rp 500.000

/**
 * Pure function untuk menghitung slip gaji bulanan karyawan
 * @param {number} basicSalary - Gaji pokok karyawan
 * @param {number} lateCount - Jumlah kehadiran terlambat dalam sebulan
 * @returns {object} Rincian tunjangan, potongan, dan gaji bersih
 */
export function calculateSalary(basicSalary, lateCount) {
  const deductions = lateCount * LATE_DEDUCTION_AMOUNT;
  const allowances = DEFAULT_ALLOWANCE;
  const netSalary = basicSalary + allowances - deductions;
  return { allowances, deductions, netSalary };
}
