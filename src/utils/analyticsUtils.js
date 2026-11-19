/**
 * src/utils/analyticsUtils.js
 * Pure analytics helper functions for computing topic performance,
 * accuracy, mastery breakdown, and question-level history.
 */

/**
 * Aggregates a student's DynamoDB progress items for a given topic.
 * 
 * @param {Array} topicQuestions - Array of question objects from topic_N.json
 * @param {Array} courseProgressItems - Array of raw PROGRESS DynamoDB items
 * @returns {Object} Topic analytics summary
 */
export function computeTopicAnalytics(topicQuestions = [], courseProgressItems = []) {
  const safeQuestions = Array.isArray(topicQuestions) ? topicQuestions : [];
  const safeProgress = Array.isArray(courseProgressItems) ? courseProgressItems : [];

  // Index progress items by questionId and SK suffix
  const progressMap = new Map();
  for (const item of safeProgress) {
    if (!item) continue;
    if (item.questionId !== undefined && item.questionId !== null) {
      progressMap.set(String(item.questionId), item);
    }
    if (typeof item.SK === 'string' && item.SK.startsWith('PROGRESS#')) {
      const parts = item.SK.split('#');
      if (parts.length >= 3) {
        const qKey = parts.slice(2).join('#');
        progressMap.set(qKey, item);
      }
    }
  }

  let attemptedCount = 0;
  let sumLatestScore = 0;
  let sumFirstTryScore = 0;
  let masteredCount = 0;
  let partialCount = 0;
  let missedCount = 0;

  const questionRows = safeQuestions.map((q) => {
    const qId = q?.id !== undefined ? String(q.id) : null;
    const qNum = q?.question_number !== undefined ? String(q.question_number) : null;
    const qAltNum = q?.number !== undefined ? String(q.number) : null;

    const item =
      (qId && progressMap.get(qId)) ||
      (qNum && progressMap.get(qNum)) ||
      (qAltNum && progressMap.get(qAltNum)) ||
      null;

    if (!item) {
      return {
        question: q,
        status: 'unattempted',
        latestScore: null,
        attemptCount: 0,
        lastAttemptAt: null,
        latestSubpartResults: null
      };
    }

    // Extract graded history entries (excluding skips)
    const gradedEntries = (Array.isArray(item.history) ? item.history : []).filter(
      (entry) =>
        entry &&
        entry.result !== 'skipped' &&
        typeof entry.score === 'number' &&
        !Number.isNaN(entry.score)
    );

    const hasGradedAttempt =
      gradedEntries.length > 0 ||
      (typeof item.latestScore === 'number' &&
        item.latestResult !== 'skipped' &&
        !Number.isNaN(item.latestScore));

    // Exclude skipped-only records from attempted calculations
    if (!hasGradedAttempt) {
      return {
        question: q,
        status: 'unattempted',
        latestScore: null,
        attemptCount: 0,
        lastAttemptAt: null,
        latestSubpartResults: null
      };
    }

    // Determine latest score
    let latestScore = 0;
    if (typeof item.latestScore === 'number' && item.latestResult !== 'skipped') {
      latestScore = item.latestScore;
    } else if (gradedEntries.length > 0) {
      latestScore = gradedEntries[gradedEntries.length - 1].score;
    }

    // Determine first-try score
    let firstTryScore = latestScore;
    if (gradedEntries.length > 0 && typeof gradedEntries[0].score === 'number') {
      firstTryScore = gradedEntries[0].score;
    }

    // Determine status: 'mastered' | 'partial' | 'missed'
    let status;
    if (latestScore === 100) {
      status = 'mastered';
      masteredCount += 1;
    } else if (latestScore > 0 && latestScore < 100) {
      status = 'partial';
      partialCount += 1;
    } else {
      status = 'missed';
      missedCount += 1;
    }

    attemptedCount += 1;
    sumLatestScore += latestScore;
    sumFirstTryScore += firstTryScore;

    // Extract latest non-skipped subpartResults from history
    let latestSubpartResults = null;
    if (Array.isArray(item.history)) {
      for (let i = item.history.length - 1; i >= 0; i--) {
        const entry = item.history[i];
        if (entry && entry.result !== 'skipped' && entry.subpartResults) {
          latestSubpartResults = entry.subpartResults;
          break;
        }
      }
    }
    if (!latestSubpartResults && item.subpartResults) {
      latestSubpartResults = item.subpartResults;
    }

    const lastNonSkipped = (Array.isArray(item.history) ? [...item.history] : [])
      .reverse()
      .find((h) => h && h.result !== 'skipped');

    const lastAttemptAt =
      item.lastAttemptAt || lastNonSkipped?.timestamp || null;

    const attemptCount =
      typeof item.attemptCount === 'number' && item.attemptCount > 0
        ? item.attemptCount
        : gradedEntries.length || 1;

    return {
      question: q,
      status,
      latestScore,
      attemptCount,
      lastAttemptAt,
      latestSubpartResults
    };
  });

  const totalQuestions = safeQuestions.length;
  const unattemptedCount = Math.max(0, totalQuestions - attemptedCount);
  const coveragePct =
    totalQuestions > 0 ? Math.round((attemptedCount / totalQuestions) * 100) : 0;
  const averageLatestScore =
    attemptedCount > 0 ? Math.round(sumLatestScore / attemptedCount) : null;
  const firstTryAverageScore =
    attemptedCount > 0 ? Math.round(sumFirstTryScore / attemptedCount) : null;

  return {
    totalQuestions,
    attemptedCount,
    coveragePct,
    averageLatestScore,
    firstTryAverageScore,
    masteredCount,
    partialCount,
    missedCount,
    unattemptedCount,
    questionRows
  };
}
