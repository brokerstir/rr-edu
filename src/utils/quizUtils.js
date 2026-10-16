/**
 * src/utils/quizUtils.js
 * Randomly shuffles and slices questions for a practice session.
 * 
 * @param {Array} allQuestions - Full question list from topic_N.json
 * @param {number} count - Desired set size (3, 5, 10, etc.)
 * @returns {Array} Shuffled subset of questions
 */
export function generatePracticeSession(allQuestions, count) {
  if (!allQuestions || allQuestions.length === 0) return [];

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