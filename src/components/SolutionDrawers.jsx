import React, { useState } from 'react';
import MathText from './MathText';

export default function SolutionDrawers({ sp }) {
  const [showMarkscheme, setShowMarkscheme] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showAiLesson, setShowAiLesson] = useState(false);

  return (
    <div className="space-y-3 pt-2">
      {/* Drawer Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowMarkscheme(prev => !prev)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-amber-500/30 rounded-lg transition-colors"
        >
          {showMarkscheme ? 'Hide Markscheme' : 'Official Markscheme'}
        </button>
        <button
          onClick={() => setShowSolution(prev => !prev)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors"
        >
          {showSolution ? 'Hide Solution' : 'Worked Solution'}
        </button>
        <button
          onClick={() => setShowAiLesson(prev => !prev)}
          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-semibold text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors"
        >
          🤖 {showAiLesson ? 'Hide AI Lesson' : 'Step-by-Step AI Lesson'}
        </button>
      </div>

      {/* 1. Official Markscheme Drawer */}
      {showMarkscheme && sp.mark_breakdown && (
        <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl text-amber-200 text-sm space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            IB Official Rubric & Mark Codes
          </div>
          <div className="space-y-1.5">
            {sp.mark_breakdown.map((m, mIdx) => (
              <div key={mIdx} className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 font-mono text-xs font-bold rounded">
                  {m.code}
                </span>
                <span className="flex-1 text-slate-300">
                  <MathText text={m.desc} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Worked Solution Drawer */}
      {showSolution && (
        <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-200 text-sm font-mono leading-relaxed">
          <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-400 mb-1">
            Clean Worked Derivation
          </div>
          <MathText text={sp.solution} />
        </div>
      )}

      {/* 3. Step-by-Step AI Lesson Drawer */}
      {showAiLesson && sp.ai_explanation && (
        <div className="p-5 bg-indigo-950/30 border border-indigo-800/40 rounded-xl space-y-4 text-sm">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Core Concept / Rule
            </div>
            <div className="text-slate-200">
              <MathText text={sp.ai_explanation.concept_rule} />
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Step-by-Step Walkthrough
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              {sp.ai_explanation.step_by_step.map((step, sIdx) => (
                <li key={sIdx} className="leading-relaxed">
                  <MathText text={step} />
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-1">
              Common Pitfalls
            </div>
            <div className="text-slate-300">
              <MathText text={sp.ai_explanation.common_pitfalls} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}