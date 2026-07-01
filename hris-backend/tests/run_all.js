import assert from 'assert';
import { runPayrollTests } from './payroll.test.js';
import { runKpiTests } from './kpi.test.js';

console.log('==========================================');
console.log('🚀 RUNNING HRIS SYSTEM TESTS...');
console.log('==========================================');

try {
  runPayrollTests(assert);
  console.log('');
  runKpiTests(assert);
  
  console.log('==========================================');
  console.log('🎉 SUCCESS: All tests passed successfully!');
  console.log('==========================================');
} catch (error) {
  console.error('\n❌ FAILURE: Some tests failed!');
  console.error(error.stack);
  process.exit(1);
}
