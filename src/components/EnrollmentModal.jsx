import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { enrollUserInCourse } from '../services/dbService';

export default function EnrollmentModal({ course, isOpen = true, onClose, onEnrollSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !course) return null;

  const handleSelectFreeTier = async () => {
    setLoading(true);
    setError('');

    try {
      if (user) {
        await enrollUserInCourse({
          userId: user,
          courseId: course.id,
          tier: 'free'
        });
      }

      if (onEnrollSuccess) {
        onEnrollSuccess(course);
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      setError(err.message || 'Failed to enroll in course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                {course.category}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {course.questionCount} Questions
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Enroll in {course.title}
            </h2>
            <p className="text-xs text-slate-400">
              Select an access tier below to start practicing and mastering topics.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition-colors text-lg leading-none"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Pricing / Plan Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Free Tier Card */}
          <div className="bg-slate-950/80 border-2 border-indigo-500/50 rounded-2xl p-6 flex flex-col justify-between relative shadow-xl shadow-indigo-950/30 ring-1 ring-indigo-500/20">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  Free Access
                </span>
                <span className="text-xs text-slate-400 font-semibold">Standard</span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Free Access</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">$0</span>
                  <span className="text-xs text-slate-400 font-medium">/ forever</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Ideal for self-paced study with complete question sets and verified markschemes.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Basic practice questions & skill builders</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Self-grading & markscheme verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Personal progress tracking & attempt history</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>LaTeX mathematical scratchpad</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4">
              <button
                onClick={handleSelectFreeTier}
                disabled={loading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin">⟳</span>
                    <span>Enrolling...</span>
                  </>
                ) : (
                  <span>Select Free Tier →</span>
                )}
              </button>
            </div>
          </div>

          {/* Premium Tier Card */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between relative opacity-85 hover:opacity-100 transition-opacity">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                  Coming Soon
                </span>
                <span className="text-xs text-indigo-400 font-semibold">Pro Tier</span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Premium Mastery</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-400">Coming Soon</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Supercharge exam preparation with intelligent AI coaching and video walk-throughs.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">★</span>
                  <span className="text-slate-300">Everything in Free Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">★</span>
                  <span>AI hints & conversational guidance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">★</span>
                  <span>Detailed step-by-step video solutions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">★</span>
                  <span>Target practice & weak-area diagnostics</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4">
              <button
                disabled
                className="w-full py-3 px-4 bg-slate-800/80 border border-slate-700/60 text-slate-500 font-semibold text-xs sm:text-sm rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <span>🔒 Coming Soon</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
