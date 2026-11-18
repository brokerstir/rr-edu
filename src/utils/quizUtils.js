/**
 * src/utils/quizUtils.js
 * Randomly shuffles and slices questions for a practice session,
 * or preserves original sequential order for admin audit sessions.
 * 
 * @param {Array} questions - Full question list from topic_N.json
 * @param {number|string} questionCount - Desired set size (3, 5, or 'all')
 * @returns {Array} Ordered or shuffled subset of questions
 */
export function generatePracticeSession(questions, questionCount) {
  if (!questions || questions.length === 0) return [];

  // Admin Audit Mode: bypass random shuffle and retain sequential order unfiltered
  if (questionCount === 'all' || questionCount === Infinity) {
    return [...questions].sort((a, b) => {
      const numA = Number(a.question_number ?? a.number ?? 0);
      const numB = Number(b.question_number ?? b.number ?? 0);
      if (numA && numB && numA !== numB) {
        return numA - numB;
      }
      return 0;
    });
  }

  // Standard Practice Session: only include verified questions without calculator requirement
  const eligibleQuestions = questions.filter(
    (q) => q && q.verified === true && q.calculator !== true
  );

  // Create a shallow copy to prevent mutating the source bundle
  const shuffled = [...eligibleQuestions];

  // Fixed Fisher-Yates Shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  if (questionCount <= 0 || questionCount >= shuffled.length) {
    return shuffled;
  }

  return shuffled.slice(0, questionCount);
}
