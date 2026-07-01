/**
 * Pure functions untuk menghitung nilai KPI karyawan
 */

/**
 * Menghitung rincian bobot poin dan skor akhir KPI akumulatif
 * @param {boolean} isKepalaCabang - true jika jabatan kepala cabang, false jika staf biasa
 * @param {number} attendancePct - persentase kehadiran (0-100)
 * @param {number} disciplinePct - persentase kedisiplinan tepat waktu (0-100)
 * @param {number} surveyPct - poin evaluasi 360 (0-100)
 * @param {number} trainingPct - poin training materi (0-100)
 * @param {number} quizPct - poin kuis kompetensi (0-100)
 * @param {number} briefingPct - persentase ikut briefing (0-100)
 * @returns {object} rincian perhitungan dan skor akhir KPI
 */
export function calculateKpiScore({
  isKepalaCabang = false,
  attendancePct = 0,
  disciplinePct = 0,
  surveyPct = 0,
  trainingPct = 0,
  quizPct = 0,
  briefingPct = 0
}) {
  const weightedSurvey = parseFloat((surveyPct * 0.30).toFixed(1));
  const weightedTraining = parseFloat((trainingPct * 0.10).toFixed(1));
  const weightedQuiz = parseFloat((quizPct * 0.10).toFixed(1));

  let weightedAttendance, weightedDiscipline, weightedBriefing, finalScore;

  if (isKepalaCabang) {
    weightedAttendance = parseFloat((attendancePct * 0.20).toFixed(1));
    weightedDiscipline = parseFloat((disciplinePct * 0.20).toFixed(1));
    weightedBriefing = parseFloat((briefingPct * 0.10).toFixed(1));
    finalScore = parseFloat(
      (
        weightedAttendance +
        weightedDiscipline +
        weightedSurvey +
        weightedTraining +
        weightedQuiz +
        weightedBriefing
      ).toFixed(1)
    );
  } else {
    weightedAttendance = parseFloat((attendancePct * 0.25).toFixed(1));
    weightedDiscipline = parseFloat((disciplinePct * 0.25).toFixed(1));
    weightedBriefing = 0;
    finalScore = parseFloat(
      (
        weightedAttendance +
        weightedDiscipline +
        weightedSurvey +
        weightedTraining +
        weightedQuiz
      ).toFixed(1)
    );
  }

  return {
    weightedAttendance,
    weightedDiscipline,
    weightedSurvey,
    weightedTraining,
    weightedQuiz,
    weightedBriefing,
    finalScore
  };
}
