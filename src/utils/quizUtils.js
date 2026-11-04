/**
 * src/utils/quizUtils.js
 * Randomly shuffles and slices questions for a practice session,
 * or preserves original sequential order for admin audit sessions.
 * 
 * @param {Array} allQuestions - Full question list from topic_N.json
 * @param {number|string} count - Desired set size (3, 5, 10, or 'all')
 * @returns {Array} Ordered or shuffled subset of questions
 */
export function generatePracticeSession(allQuestions, count) {
  if (!allQuestions || allQuestions.length === 0) return [];

  // Admin Audit Mode: bypass random shuffle and retain sequential order
  if (count === 'all' || count === Infinity) {
    return [...allQuestions].sort((a, b) => {
      const numA = Number(a.question_number ?? a.number ?? 0);
      const numB = Number(b.question_number ?? b.number ?? 0);
      if (numA && numB && numA !== numB) {
        return numA - numB;
      }
      return 0;
    });
  }

  // Create a shallow copy to prevent mutating the source bundle
  const shuffled = [...allQuestions];

  // Fixed Fisher-Yates Shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  if (count <= 0 || count >= shuffled.length) {
    return shuffled;
  }

  return shuffled.slice(0, count);
}
