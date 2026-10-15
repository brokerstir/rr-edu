import React, { useState } from 'react';
import MathText from './MathText';
import OptionalWorkInput from './OptionalWorkInput';
import SolutionDrawers from './SolutionDrawers';

export default function SubpartCard({ sp, subKey }) {
  const [userInput, setUserInput] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [gradeStatus, setGradeStatus] = useState(null); // 'correct' | 'incorrect' | null

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Stem */}
      <div className="flex items-start gap-3">
        {sp.subpart && <span className="font-extrabold text-indigo-400 text-base">{sp.subpart}.</span>}
        <div className="text-slate-200 text-base sm:text-lg leading-relaxed flex-1">
          <MathText text={sp.stem} />
        </div>
      </div>

      {/* Optional Work Input */}
      {!isRevealed && (
        <div className="space-y-3 pt-1">
          <OptionalWorkInput
            value={userInput}
            onChange={(val) => setUserInput(val)}
          />
          <div className="flex justify-end">
            <button
              onClick={() => setIsRevealed(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              Check Answer
            </button>
          </div>
        </div>
      )}

      {/* Target Answer & Self-Grading */}
      {isRevealed && (
        <div className="p-4 bg-slate-900 border border-indigo-500/30 rounded-xl space-y-3">
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            Official Target Answer
          </div>
          <div className="p-3 bg-slate-950 rounded-lg text-center text-lg font-bold text-white border border-slate-800">
            <MathText text={sp.final_answer} />
          </div>

          {!gradeStatus ? (
            <div className="space-y-2 pt-1">
              <div className="text-xs text-slate-300 text-center font-medium">
                Did your scratchpad or typed answer match the target answer?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setGradeStatus('correct')}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors shadow-md shadow-emerald-600/20"
                >
                  🟩 Got It Right
                </button>
                <button
                  onClick={() => setGradeStatus('incorrect')}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition-colors shadow-md shadow-rose-600/20"
                >
                  🟥 Got It Wrong
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className={`text-xs font-bold ${gradeStatus === 'correct' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {gradeStatus === 'correct' ? '🟩 Marked as Correct' : '🟥 Marked as Incorrect'}
              </span>
              <button
                onClick={() => { setGradeStatus(null); setIsRevealed(false); }}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3 Solution Drawers */}
      <SolutionDrawers sp={sp} />
    </div>
  );
}