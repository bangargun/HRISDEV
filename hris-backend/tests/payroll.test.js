import { calculateSalary, LATE_DEDUCTION_AMOUNT, DEFAULT_ALLOWANCE } from '../src/utils/payrollCalculator.js';

export function runPayrollTests(assert) {
  console.log('--- Running Payroll Calculator Tests ---');

  // Test Case 1: Karyawan tanpa keterlambatan
  {
    const basicSalary = 5000000;
    const lateCount = 0;
    const { allowances, deductions, netSalary } = calculateSalary(basicSalary, lateCount);
    
    assert.strictEqual(allowances, DEFAULT_ALLOWANCE, 'Allowances should match default');
    assert.strictEqual(deductions, 0, 'Deductions should be 0 for 0 lates');
    assert.strictEqual(netSalary, basicSalary + DEFAULT_ALLOWANCE, 'Net salary should be basic + allowance');
    console.log('✅ Passed: Test Case 1 (No lates)');
  }

  // Test Case 2: Karyawan dengan 3 kali keterlambatan
  {
    const basicSalary = 4500000;
    const lateCount = 3;
    const { allowances, deductions, netSalary } = calculateSalary(basicSalary, lateCount);
    
    const expectedDeductions = lateCount * LATE_DEDUCTION_AMOUNT;
    const expectedNetSalary = basicSalary + DEFAULT_ALLOWANCE - expectedDeductions;
    
    assert.strictEqual(allowances, DEFAULT_ALLOWANCE, 'Allowances should match default');
    assert.strictEqual(deductions, expectedDeductions, `Deductions should be ${expectedDeductions} for 3 lates`);
    assert.strictEqual(netSalary, expectedNetSalary, 'Net salary calculations should subtract deductions');
    console.log('✅ Passed: Test Case 2 (3 lates)');
  }

  // Test Case 3: Karyawan dengan pemotongan melebihi tunjangan
  {
    const basicSalary = 3000000;
    const lateCount = 12; // 12 * 50k = 600k deduction
    const { allowances, deductions, netSalary } = calculateSalary(basicSalary, lateCount);
    
    const expectedDeductions = 12 * LATE_DEDUCTION_AMOUNT;
    const expectedNetSalary = basicSalary + DEFAULT_ALLOWANCE - expectedDeductions;
    
    assert.strictEqual(deductions, expectedDeductions, 'Deductions correctly computed for large count');
    assert.strictEqual(netSalary, expectedNetSalary, 'Net salary correctly computed when deductions exceed allowance');
    console.log('✅ Passed: Test Case 3 (Large late count)');
  }
}
