import React from 'react';

const COURSES = [
  {
    id: 'ib_math_aa_sl',
    title: 'IB Mathematics AA SL',
    category: 'Mathematics',
    description: 'Analysis and Approaches Standard Level. Complete question bank covering Analysis, Calculus, and Functions.',
    questionCount: 180,
    status: 'available', // 'available' | 'locked'
    badge: 'Popular'
  },
  {
    id: 'ib_math_aa_hl',
    title: 'IB Mathematics AA HL',
    category: 'Mathematics',
    description: 'Higher Level extension including Proof, Complex Numbers, Vector Spaces, and Differential Equations.',
    questionCount: 240,
    status: 'locked',
    badge: 'Coming Soon'
  },
  {
    id: 'ib_math_ai_sl',
    title: 'IB Mathematics AI SL',
    category: 'Mathematics',
    description: 'Applications and Interpretation Standard Level with heavy focus on Modeling and Statistics.',
    questionCount: 160,
    status: 'locked',
    badge: 'Coming Soon'
  }
];

export default function CourseCatalog({ onSelectCourse, onBackToLanding }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-5">
        <button
          onClick={onBackToLanding}
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Overview
        </button>
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
          Course Catalog
        </span>
      </div>

      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-3xl font-extrabold text-white">Select a Course</h1>
        <p className="text-slate-400 text-sm">
          Choose a subject below to launch practice sessions and track your progress.
        </p>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {COURSES.map(c => {
          const isUnlocked = c.status === 'available';

          return (
            <div
              key={c.id}
              className={`bg-slate-900 border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                isUnlocked ? 'border-slate-800 hover:border-indigo-500/50 shadow-xl' : 'border-slate-800/60 opacity-60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">
                    {c.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isUnlocked 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {c.badge}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-white">{c.title}</h2>
                <p className="text-xs text-slate-400 leading-relaxed">{c.description}</p>
              </div>

              <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {c.questionCount} Questions
                </span>
                
                {isUnlocked ? (
                  <button
                    onClick={() => onSelectCourse(c)}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
                  >
                    Open Course →
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">
                    🔒 Locked
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}