import { useState, useMemo } from 'react';
import { computeTopicAnalytics } from '../utils/analyticsUtils';

export default function TopicAnalyticsView({
  topic,
  course,
  topicQuestions = [],
  courseProgressItems = [],
  onBack,
  onStartPractice,
  onLaunchQuestion
}) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'needs_review' | 'mastered' | 'not_started'

  const analytics = useMemo(() => {
    return computeTopicAnalytics(topicQuestions, courseProgressItems);
  }, [topicQuestions, courseProgressItems]);

  const {
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
  } = analytics;

  // Filter rows
  const filteredRows = useMemo(() => {
    if (activeFilter === 'needs_review') {
      return questionRows.filter(
        (r) => r.status === 'missed' || r.status === 'partial'
      );
    }
    if (activeFilter === 'mastered') {
      return questionRows.filter((r) => r.status === 'mastered');
    }
    if (activeFilter === 'not_started') {
      return questionRows.filter((r) => r.status === 'unattempted');
    }
    return questionRows;
  }, [questionRows, activeFilter]);

  // Delta calculation for improvement
  const scoreDelta =
    averageLatestScore !== null &&
    firstTryAverageScore !== null &&
    averageLatestScore > firstTryAverageScore
      ? averageLatestScore - firstTryAverageScore
      : 0;

  // Helper to extract clean subpart outcome pills
  const renderSubpartPills = (row) => {
    const results = row.latestSubpartResults;
    if (!results || typeof results !== 'object') return null;

    const entries = Object.entries(results);
    if (entries.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-0">
        {entries.map(([key, val]) => {
          // Attempt to extract letter index from key (e.g. topic_1_q1_sp_0 -> 'a')
          let label = key;
          const spMatch = key.match(/_sp_(\d+)$/);
          if (spMatch) {
            const idx = parseInt(spMatch[1], 10);
            label =
              row.question?.subparts?.[idx]?.subpart ||
              String.fromCharCode(97 + idx);
          } else if (label.startsWith('sp_')) {
            const idx = parseInt(label.replace('sp_', ''), 10);
            label = String.fromCharCode(97 + idx);
          }

          const isCorrect = val === 'correct';
          const isIncorrect = val === 'incorrect';

          let pillStyle;
          let symbol;
          if (isCorrect) {
            pillStyle =
              'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            symbol = '✓';
          } else if (isIncorrect) {
            pillStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
            symbol = '✗';
          } else {
            pillStyle = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
            symbol = '~';
          }

          return (
            <span
              key={key}
              className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded border flex items-center gap-1 ${pillStyle}`}
              title={`Subpart ${label}: ${val}`}
            >
              <span>{label}</span>
              <span className="font-bold">{symbol}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'mastered':
        return (
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Mastered
          </span>
        );
      case 'partial':
        return (
          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
            Partial
          </span>
        );
      case 'missed':
        return (
          <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
            Needs Review
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
            Not Started
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1.5">
          <button
            onClick={onBack}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 mb-2"
          >
            <span>←</span>
            <span>Back to Topics</span>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md uppercase">
              Topic {topic?.topic_number}
            </span>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {topic?.topic_name}
            </h1>
          </div>
          {course && (
            <p className="text-xs text-slate-400 font-medium">{course.title}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Free Topic Overview
          </span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Topic Coverage */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Topic Coverage
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {attemptedCount}
              </span>
              <span className="text-sm text-slate-400 font-medium">
                / {totalQuestions} attempted
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-medium text-slate-400 mb-1.5">
              <span>Progress</span>
              <span className="text-white font-bold">{coveragePct}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${coveragePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Current Accuracy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Current Accuracy
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {averageLatestScore !== null ? `${averageLatestScore}%` : '—'}
              </span>
              {scoreDelta > 0 && (
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  +{scoreDelta}% from first try
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-400">
            {firstTryAverageScore !== null ? (
              <span>First-try avg: <span className="text-slate-200 font-semibold">{firstTryAverageScore}%</span></span>
            ) : (
              <span>Complete questions to calculate accuracy</span>
            )}
          </div>
        </div>

        {/* Card 3: Mastery Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Mastery Breakdown
            </div>
            {/* Segmented bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden flex">
              {totalQuestions > 0 && (
                <>
                  <div
                    style={{ width: `${(masteredCount / totalQuestions) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Mastered: ${masteredCount}`}
                  />
                  <div
                    style={{ width: `${(partialCount / totalQuestions) * 100}%` }}
                    className="bg-amber-500 h-full"
                    title={`Partial: ${partialCount}`}
                  />
                  <div
                    style={{ width: `${(missedCount / totalQuestions) * 100}%` }}
                    className="bg-rose-500 h-full"
                    title={`Needs Review: ${missedCount}`}
                  />
                  <div
                    style={{ width: `${(unattemptedCount / totalQuestions) * 100}%` }}
                    className="bg-slate-700 h-full"
                    title={`Not Started: ${unattemptedCount}`}
                  />
                </>
              )}
            </div>
          </div>

          {/* Counts legend */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-400">Mastered:</span>
              <span className="text-white font-bold">{masteredCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span className="text-slate-400">Partial:</span>
              <span className="text-white font-bold">{partialCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span className="text-slate-400">Needs Review:</span>
              <span className="text-white font-bold">{missedCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
              <span className="text-slate-400">Not Started:</span>
              <span className="text-white font-bold">{unattemptedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State Banner when 0 attempts */}
      {attemptedCount === 0 && (
        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-6 text-center space-y-4">
          <div className="text-3xl">🎯</div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              Ready to test your knowledge in {topic?.topic_name}?
            </h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              You haven&apos;t attempted any questions in this topic yet. Start a practice session now to unlock personalized topic mastery insights!
            </p>
          </div>
          <button
            onClick={onStartPractice}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            Start Topic Practice →
          </button>
        </div>
      )}

      {/* Question-by-Question Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Question Breakdown
          </h2>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({totalQuestions})
            </button>
            <button
              onClick={() => setActiveFilter('needs_review')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'needs_review'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Needs Review ({missedCount + partialCount})
            </button>
            <button
              onClick={() => setActiveFilter('mastered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'mastered'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mastered ({masteredCount})
            </button>
            <button
              onClick={() => setActiveFilter('not_started')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'not_started'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Not Started ({unattemptedCount})
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-2.5">
          {filteredRows.length === 0 ? (
            <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs">
              No questions found in this filter category.
            </div>
          ) : (
            filteredRows.map((row) => {
              const q = row.question;
              const originalIndex = topicQuestions.findIndex(
                (item) => (item.id || item) === (q.id || q)
              );
              const qIndex = originalIndex >= 0 ? originalIndex : 0;
              const questionLabel =
                q.question_number !== undefined
                  ? `Question ${q.question_number}`
                  : `Question ${qIndex + 1}`;

              const isAttempted = row.status !== 'unattempted';

              return (
                <div
                  key={q.id || qIndex}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-sm font-bold text-white">
                        {questionLabel}
                      </span>
                      {getStatusBadge(row.status)}
                      <span className="text-xs text-slate-400 font-medium">
                        {isAttempted ? (
                          <>
                            <span className="text-slate-200 font-bold">
                              {row.latestScore}%
                            </span>
                            {' • '}
                            <span>
                              {row.attemptCount} attempt
                              {row.attemptCount > 1 ? 's' : ''}
                            </span>
                          </>
                        ) : (
                          <span>Not attempted</span>
                        )}
                      </span>
                    </div>

                    {/* Subpart breakdown pills */}
                    {renderSubpartPills(row)}
                  </div>

                  {/* Right: Practice / Retry Button */}
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => onLaunchQuestion(q, qIndex)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 ${
                        isAttempted
                          ? 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                      }`}
                    >
                      {isAttempted ? 'Retry' : 'Practice'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Premium Teaser Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <span>✨</span>
            <span>Premium Analytics Preview</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
            Coming Soon
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Upgrade to unlock deep diagnostic insights across your entire syllabus:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 space-y-1">
            <div className="text-xs font-semibold text-white">Cross-Topic IB Readiness</div>
            <div className="text-[11px] text-slate-400">Predictive Paper 1 & Paper 2 predicted boundary percentiles.</div>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 space-y-1">
            <div className="text-xs font-semibold text-white">Exam Pacing Diagnostics</div>
            <div className="text-[11px] text-slate-400">Per-question time spent analysis vs. ideal IB time limits.</div>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 space-y-1">
            <div className="text-xs font-semibold text-white">Targeted Weak-Spot Drills</div>
            <div className="text-[11px] text-slate-400">Algorithmic question recommendations focusing on lowest subpart accuracy.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
