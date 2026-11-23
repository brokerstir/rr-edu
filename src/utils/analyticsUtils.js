/**
 * src/utils/analyticsUtils.js
 * Pure analytics helper functions for computing topic performance,
 * part-weighted accuracy, mastery breakdown, and question-level history.
 */

/**
 * Resolves the graded status for a specific subpart from a subpartResults map.
 * 
 * @param {Object} results - Key-value map of subpart results (e.g. { topic_1_q1_sp_0: 'correct' })
 * @param {string|number} qId - Question ID
 * @param {Object} sp - Subpart object (e.g. { subpart: 'a' })
 * @param {number} idx - Subpart index (0-based)
 * @returns {string|null} 'correct' | 'incorrect' | 'revealed' | null
 */
export function getSubpartStatus(results, qId, sp, idx) {
  if (!results || typeof results !== 'object') return null;

  const letter = (sp?.subpart || String.fromCharCode(97 + idx)).toLowerCase();
  const qIdStr = qId !== undefined && qId !== null ? String(qId) : '';

  // 1. Direct match with `${qId}_sp_${idx}`
  if (qIdStr && results[`${qIdStr}_sp_${idx}`] !== undefined) {
    return results[`${qIdStr}_sp_${idx}`];
  }

  // 2. Direct match with `sp_${idx}`
  if (results[`sp_${idx}`] !== undefined) {
    return results[`sp_${idx}`];
  }

  // 3. Direct match with subpart letter
  if (results[letter] !== undefined) {
    return results[letter];
  }
  if (results[letter.toUpperCase()] !== undefined) {
    return results[letter.toUpperCase()];
  }

  // 4. Direct match with index string or number
  if (results[String(idx)] !== undefined) {
    return results[String(idx)];
  }
  if (results[idx] !== undefined) {
    return results[idx];
  }

  // 5. Suffix matches
  for (const [k, v] of Object.entries(results)) {
    if (k.endsWith(`_sp_${idx}`) || k.toLowerCase().endsWith(`_sp_${letter}`)) {
      return v;
    }
  }

  return null;
}

/**
 * Aggregates a student's DynamoDB progress items for a given topic.
 * Accuracy is weighted by the number of expected sub-parts in each attempted question.
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
  let totalAttemptedExpectedParts = 0;
  let totalAttemptedCorrectParts = 0;
  let totalFirstTryCorrectParts = 0;
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

    const expectedPartsCount = Math.max(
      1,
      Array.isArray(q?.subparts) && q.subparts.length > 0 ? q.subparts.length : 1
    );

    // Raw recorded score fallback
    let rawScore = 0;
    if (typeof item.latestScore === 'number' && item.latestResult !== 'skipped') {
      rawScore = item.latestScore;
    } else if (gradedEntries.length > 0) {
      rawScore = gradedEntries[gradedEntries.length - 1].score;
    }

    // Calculate correct parts for latest attempt
    let latestCorrectParts = 0;
    if (
      Array.isArray(q?.subparts) &&
      q.subparts.length > 0 &&
      latestSubpartResults &&
      typeof latestSubpartResults === 'object' &&
      Object.keys(latestSubpartResults).length > 0
    ) {
      for (let idx = 0; idx < q.subparts.length; idx++) {
        const sp = q.subparts[idx];
        const status = getSubpartStatus(latestSubpartResults, qId, sp, idx);
        if (status === 'correct') {
          latestCorrectParts += 1;
        }
      }
    } else if (
      latestSubpartResults &&
      typeof latestSubpartResults === 'object' &&
      Object.keys(latestSubpartResults).length > 0
    ) {
      latestCorrectParts = Math.min(
        expectedPartsCount,
        Object.values(latestSubpartResults).filter((st) => st === 'correct').length
      );
    } else {
      latestCorrectParts = Math.min(
        expectedPartsCount,
        Math.max(0, Math.round((rawScore / 100) * expectedPartsCount))
      );
    }

    // Individual question score based on correctParts / totalExpectedParts
    const latestScore = Math.round((latestCorrectParts / expectedPartsCount) * 100);

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
    totalAttemptedExpectedParts += expectedPartsCount;
    totalAttemptedCorrectParts += latestCorrectParts;

    // Calculate first try correct parts
    let firstTryCorrectParts = latestCorrectParts;
    if (gradedEntries.length > 0) {
      const firstEntry = gradedEntries[0];
      if (
        Array.isArray(q?.subparts) &&
        q.subparts.length > 0 &&
        firstEntry.subpartResults &&
        typeof firstEntry.subpartResults === 'object' &&
        Object.keys(firstEntry.subpartResults).length > 0
      ) {
        let firstCount = 0;
        for (let idx = 0; idx < q.subparts.length; idx++) {
          const sp = q.subparts[idx];
          const st = getSubpartStatus(firstEntry.subpartResults, qId, sp, idx);
          if (st === 'correct') firstCount += 1;
        }
        firstTryCorrectParts = firstCount;
      } else if (typeof firstEntry.score === 'number') {
        firstTryCorrectParts = Math.min(
          expectedPartsCount,
          Math.max(0, Math.round((firstEntry.score / 100) * expectedPartsCount))
        );
      }
    }
    totalFirstTryCorrectParts += firstTryCorrectParts;

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

  // Part-weighted overall accuracy across practiced questions
  const averageLatestScore =
    totalAttemptedExpectedParts > 0
      ? Math.round((totalAttemptedCorrectParts / totalAttemptedExpectedParts) * 100)
      : null;

  const firstTryAverageScore =
    totalAttemptedExpectedParts > 0
      ? Math.round((totalFirstTryCorrectParts / totalAttemptedExpectedParts) * 100)
      : null;

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
