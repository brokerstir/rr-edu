import { useState } from 'react';
import { reportQuestionIssue } from '../services/dbService';

const ISSUE_TYPES = [
  'Missing Diagram',
  'Bad Formula / MathLive Parse',
  'Incorrect Answer / Key',
  'Other'
];

export default function ReportIssueModal({
  isOpen,
  onClose,
  courseId,
  topicId,
  questionId,
  userId,
  onSuccess
}) {
  const [issueType, setIssueType] = useState('Missing Diagram');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await reportQuestionIssue({
        courseId,
        topicId,
        questionId,
        issueType,
        notes,
        userId
      });

      if (onSuccess) {
        onSuccess('Issue logged to DynamoDB');
      }
      onClose();
    } catch (err) {
      console.error('Failed to submit question issue:', err);
      setError(err.message || 'Failed to submit issue. Please check your network and permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛠️</span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Report Question Issue
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Admin Diagnostic
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Record parsing defect or content error directly to DynamoDB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none disabled:opacity-50"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Read-Only Context Box */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Question Context (Auto-Populated)
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-900 border border-slate-800/80 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Course</span>
                <span className="font-semibold text-slate-200 truncate block font-mono text-[11px]" title={courseId}>
                  {courseId}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800/80 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Topic</span>
                <span className="font-semibold text-slate-200 block font-mono text-[11px]">
                  Topic {topicId}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800/80 p-2 rounded-lg">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Original ID</span>
                <span className="font-semibold text-amber-300 truncate block font-mono text-[11px]" title={questionId}>
                  #{questionId}
                </span>
              </div>
            </div>
          </div>

          {/* Issue Type */}
          <div className="space-y-1.5">
            <label htmlFor="issue-type-select" className="text-xs font-semibold text-slate-300 block">
              Issue Type
            </label>
            <select
              id="issue-type-select"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              disabled={submitting}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors"
            >
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type} className="bg-slate-900 text-white">
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Notes Field */}
          <div className="space-y-1.5">
            <label htmlFor="issue-notes" className="text-xs font-semibold text-slate-300 block">
              Notes & Annotations
            </label>
            <textarea
              id="issue-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="e.g., Subpart b has missing image topic1_q4b.png, or MathLive delimiter error in stem..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Logging Issue...</span>
                </>
              ) : (
                <>
                  <span>Submit Issue</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
