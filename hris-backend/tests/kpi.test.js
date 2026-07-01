import { calculateKpiScore } from '../src/utils/kpiCalculator.js';

export function runKpiTests(assert) {
  console.log('--- Running KPI Calculator Tests ---');

  // Test Case 1: Karyawan / Staf Biasa (Bobot 25%, 25%, 30%, 10%, 10%)
  {
    const scoreData = calculateKpiScore({
      isKepalaCabang: false,
      attendancePct: 100,
      disciplinePct: 90,
      surveyPct: 85,
      trainingPct: 80,
      quizPct: 75
    });

    const expectedAttendance = 100 * 0.25; // 25
    const expectedDiscipline = 90 * 0.25; // 22.5
    const expectedSurvey = parseFloat((85 * 0.30).toFixed(1)); // 25.5
    const expectedTraining = 80 * 0.10; // 8
    const expectedQuiz = 75 * 0.10; // 7.5
    const expectedFinal = parseFloat((25 + 22.5 + 25.5 + 8 + 7.5).toFixed(1)); // 88.5

    assert.strictEqual(scoreData.weightedAttendance, expectedAttendance, 'Attendance weight should be 25%');
    assert.strictEqual(scoreData.weightedDiscipline, expectedDiscipline, 'Discipline weight should be 25%');
    assert.strictEqual(scoreData.weightedSurvey, expectedSurvey, 'Survey weight should be 30%');
    assert.strictEqual(scoreData.weightedTraining, expectedTraining, 'Training weight should be 10%');
    assert.strictEqual(scoreData.weightedQuiz, expectedQuiz, 'Quiz weight should be 10%');
    assert.strictEqual(scoreData.weightedBriefing, 0, 'Briefing weight should be 0 for regular staff');
    assert.strictEqual(scoreData.finalScore, expectedFinal, `Final KPI score should match: ${expectedFinal}`);
    console.log('✅ Passed: Test Case 1 (Regular staff KPI)');
  }

  // Test Case 2: Kepala Cabang (Bobot 20%, 20%, 30%, 10%, 10%, 10%)
  {
    const scoreData = calculateKpiScore({
      isKepalaCabang: true,
      attendancePct: 95,
      disciplinePct: 85,
      surveyPct: 90,
      trainingPct: 80,
      quizPct: 70,
      briefingPct: 100
    });

    const expectedAttendance = parseFloat((95 * 0.20).toFixed(1)); // 19
    const expectedDiscipline = parseFloat((85 * 0.20).toFixed(1)); // 17
    const expectedSurvey = parseFloat((90 * 0.30).toFixed(1)); // 27
    const expectedTraining = parseFloat((80 * 0.10).toFixed(1)); // 8
    const expectedQuiz = parseFloat((70 * 0.10).toFixed(1)); // 7
    const expectedBriefing = parseFloat((100 * 0.10).toFixed(1)); // 10
    const expectedFinal = parseFloat((19 + 17 + 27 + 8 + 7 + 10).toFixed(1)); // 88

    assert.strictEqual(scoreData.weightedAttendance, expectedAttendance, 'Attendance weight should be 20%');
    assert.strictEqual(scoreData.weightedDiscipline, expectedDiscipline, 'Discipline weight should be 20%');
    assert.strictEqual(scoreData.weightedSurvey, expectedSurvey, 'Survey weight should be 30%');
    assert.strictEqual(scoreData.weightedTraining, expectedTraining, 'Training weight should be 10%');
    assert.strictEqual(scoreData.weightedQuiz, expectedQuiz, 'Quiz weight should be 10%');
    assert.strictEqual(scoreData.weightedBriefing, expectedBriefing, 'Briefing weight should be 10%');
    assert.strictEqual(scoreData.finalScore, expectedFinal, `Final KPI score should match: ${expectedFinal}`);
    console.log('✅ Passed: Test Case 2 (Kepala Cabang KPI)');
  }
}
