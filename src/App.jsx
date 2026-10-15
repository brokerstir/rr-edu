import React, { useState, useEffect, useRef } from 'react';
import { ComputeEngine } from '@cortex-js/compute-engine';
import katex from 'katex';

const ce = new ComputeEngine();

// Helper Component: Renders KaTeX math safely
function MathText({ text }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !text) return;
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
    containerRef.current.innerHTML = '';

    parts.forEach(part => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const span = document.createElement('span');
        katex.render(part.slice(2, -2), span, { displayMode: true, throwOnError: false });
        containerRef.current.appendChild(span);
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const span = document.createElement('span');
        katex.render(part.slice(1, -1), span, { displayMode: false, throwOnError: false });
        containerRef.current.appendChild(span);
      } else {
        containerRef.current.appendChild(document.createTextNode(part));
      }
    });
  }, [text]);

  return <span ref={containerRef} />;
}

// Option 1 Component: Text Input + Live KaTeX Preview
function SimpleMathInput({ value, onChange, onCheck }) {
  return (
    <div className="space-y-2 w-full">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onCheck(); }}
          placeholder="e.g. 81m^12 or (x^5 y^10)/32"
          className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-base font-mono focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          onClick={onCheck}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20 whitespace-nowrap"
        >
          Check Answer
        </button>
      </div>

      {/* Live KaTeX Preview Box */}
      {value && value.trim() !== '' && (
        <div className="px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300 flex items-center gap-2">
          <span className="text-indigo-400 font-bold uppercase text-[10px]">Live Preview:</span>
          <div className="text-sm font-medium text-white">
            <MathText text={`$${value}$`} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Student Performance & Input States
  const [userInputs, setUserInputs] = useState({});       // { subKey: string }
  const [checkResults, setCheckResults] = useState({});   // { subKey: { status: 'correct'|'incorrect', mode: 'auto'|'self', attempts: number } }
  const [selfGradeActive, setSelfGradeActive] = useState({}); // { subKey: boolean }

  // Drawers
  const [showMarkscheme, setShowMarkscheme] = useState({});
  const [showSolution, setShowSolution] = useState({});
  const [showAiLesson, setShowAiLesson] = useState({});

  useEffect(() => {
    fetch('./data/topics.json')
      .then(res => res.json())
      .then(data => setTopics(data))
      .catch(err => console.error("Error loading topics.json:", err));
  }, []);

  const loadTopic = async (topicNumber) => {
    try {
      const res = await fetch(`./data/topic_${topicNumber}.json`);
      const data = await res.json();
      setQuestions(data);
      setSelectedTopic(topicNumber);
      setCurrentIndex(0);
      setUserInputs({});
      setCheckResults({});
      setSelfGradeActive({});
      setShowMarkscheme({});
      setShowSolution({});
      setShowAiLesson({});
    } catch (err) {
      console.error("Error loading topic data:", err);
    }
  };

  const handleInputChange = (subKey, val) => {
    setUserInputs(prev => ({ ...prev, [subKey]: val }));
    // Reset status when student types
    setCheckResults(prev => ({ ...prev, [subKey]: null }));
  };

  // Auto-Check Logic
  const handleAutoCheck = (subKey, rawExpected) => {
    const studentInput = userInputs[subKey] || '';
    if (!studentInput.trim()) return;

    const expectedClean = rawExpected.replace(/^\$/, '').replace(/\$$/, '').trim();
    let isEquivalent = false;

    try {
      const studentExpr = ce.parse(studentInput);
      const expectedExpr = ce.parse(expectedClean);
      isEquivalent = studentExpr.isSame(expectedExpr) || studentExpr.evaluate().isSame(expectedExpr.evaluate());
    } catch (e) {
      // Fallback trimmed match
      isEquivalent = studentInput.replace(/\s+/g, '') === expectedClean.replace(/\s+/g, '');
    }

    const prevAttempts = checkResults[subKey]?.attempts || 0;
    setCheckResults(prev => ({
      ...prev,
      [subKey]: {
        status: isEquivalent ? 'correct' : 'incorrect',
        mode: 'auto',
        attempts: prevAttempts + 1
      }
    }));
  };

  // Paper Self-Grade Logic
  const handleSelfGradeResult = (subKey, status) => {
    const prevAttempts = checkResults[subKey]?.attempts || 0;
    setCheckResults(prev => ({
      ...prev,
      [subKey]: {
        status: status, // 'correct' | 'incorrect'
        mode: 'self',
        attempts: prevAttempts + 1
      }
    }));
  };

  if (!selectedTopic) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-400 text-xs font-semibold mb-3">
            IB Mathematics AA SL
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Skill Builder Practice Engine
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Practice questions with live math input evaluation or scratchpad paper self-grading.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {topics.map(t => (
            <div key={t.topic_number} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/50 transition-all">
              <div>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md uppercase">
                  Topic {t.topic_number}
                </span>
                <h2 className="text-xl font-bold text-white mt-3 mb-1">{t.topic_name}</h2>
                <p className="text-xs text-slate-400">{t.question_count} Skill Builder Questions</p>
              </div>
              <button
                onClick={() => loadTopic(t.topic_number)}
                className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20"
              >
                Start Practice →
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedTopic(null)} className="text-slate-400 hover:text-white text-sm font-semibold">
            ← Topics
          </button>
          <div className="border-l border-slate-800 pl-3">
            <div className="text-xs text-slate-400 font-semibold uppercase">Topic {selectedTopic}</div>
            <div className="text-sm font-bold text-white">Q {currentIndex + 1} of {questions.length}</div>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-28 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
              Question {currentQ?.question_number}
            </span>
            {currentQ?.has_diagram && (
              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                📐 Diagram Included
              </span>
            )}
          </div>

          <div className="text-lg font-medium text-white leading-relaxed">
            <MathText text={currentQ?.question_text} />
          </div>

          {/* Subparts List */}
          <div className="space-y-6 pt-2">
            {currentQ?.subparts.map((sp, idx) => {
              const subKey = `${currentQ.id}_sp_${idx}`;
              const result = checkResults[subKey];
              const isSelfGrading = selfGradeActive[subKey];

              return (
                <div key={idx} className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  {/* Stem */}
                  <div className="flex items-start gap-3">
                    {sp.subpart && <span className="font-extrabold text-indigo-400 text-base">{sp.subpart}.</span>}
                    <div className="text-slate-200 text-base sm:text-lg leading-relaxed flex-1">
                      <MathText text={sp.stem} />
                    </div>
                  </div>

                  {/* Mode 1: Auto-Check Input */}
                  {!isSelfGrading && !result && (
                    <div className="space-y-2">
                      <SimpleMathInput
                        value={userInputs[subKey] || ''}
                        onChange={(val) => handleInputChange(subKey, val)}
                        onCheck={() => handleAutoCheck(subKey, sp.final_answer)}
                      />
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => setSelfGradeActive(prev => ({ ...prev, [subKey]: true }))}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline transition-colors"
                        >
                          📝 Solving on paper? Self-grade instead
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Paper Self-Grade Confirmation Tray */}
                  {isSelfGrading && !result && (
                    <div className="p-4 bg-slate-900 border border-indigo-500/30 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Paper Self-Grade
                        </span>
                        <button
                          onClick={() => setSelfGradeActive(prev => ({ ...prev, [subKey]: false }))}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          ← Switch to Text Input
                        </button>
                      </div>
                      <div className="text-sm text-slate-300">
                        Compare your scratchpad answer to the official target:
                        <div className="my-2 p-3 bg-slate-950 rounded-lg text-center text-base font-bold text-white border border-slate-800">
                          <MathText text={sp.final_answer} />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleSelfGradeResult(subKey, 'correct')}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors"
                        >
                          🟩 Got It Right
                        </button>
                        <button
                          onClick={() => handleSelfGradeResult(subKey, 'incorrect')}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition-colors"
                        >
                          🟥 Got It Wrong
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Feedback Badge */}
                  {result?.status === 'correct' && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-semibold flex items-center justify-between">
                      <span>🟩 Correct! ({result.mode === 'auto' ? 'Auto-Checked' : 'Paper Self-Graded'})</span>
                      <button
                        onClick={() => { setCheckResults(prev => ({ ...prev, [subKey]: null })); setSelfGradeActive(prev => ({ ...prev, [subKey]: false })); }}
                        className="text-xs text-slate-400 hover:text-white underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {result?.status === 'incorrect' && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-semibold flex items-center justify-between">
                      <span>🟥 Incorrect. Review the solutions below.</span>
                      <button
                        onClick={() => { setCheckResults(prev => ({ ...prev, [subKey]: null })); setSelfGradeActive(prev => ({ ...prev, [subKey]: false })); }}
                        className="text-xs text-slate-400 hover:text-white underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* 3 Toggle Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => setShowMarkscheme(prev => ({ ...prev, [subKey]: !prev[subKey] }))}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-amber-500/30 rounded-lg transition-colors"
                    >
                      {showMarkscheme[subKey] ? 'Hide Markscheme' : 'Official Markscheme'}
                    </button>
                    <button
                      onClick={() => setShowSolution(prev => ({ ...prev, [subKey]: !prev[subKey] }))}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors"
                    >
                      {showSolution[subKey] ? 'Hide Solution' : 'Worked Solution'}
                    </button>
                    <button
                      onClick={() => setShowAiLesson(prev => ({ ...prev, [subKey]: !prev[subKey] }))}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-semibold text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors"
                    >
                      🤖 {showAiLesson[subKey] ? 'Hide AI Lesson' : 'Step-by-Step AI Lesson'}
                    </button>
                  </div>

                  {/* 1. Official Markscheme Drawer */}
                  {showMarkscheme[subKey] && sp.mark_breakdown && (
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
                  {showSolution[subKey] && (
                    <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-200 text-sm font-mono leading-relaxed">
                      <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-400 mb-1">
                        Clean Worked Derivation
                      </div>
                      <MathText text={sp.solution} />
                    </div>
                  )}

                  {/* 3. Step-by-Step AI Lesson Drawer */}
                  {showAiLesson[subKey] && sp.ai_explanation && (
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
            })}
          </div>
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <footer className="fixed bottom-0 inset-x-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-4 z-30">
        <div className="max-w-4xl mx-auto flex justify-between gap-3">
          <button
            disabled={currentIndex === 0}
            onClick={() => { setCurrentIndex(i => i - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex-1 py-3 px-4 bg-slate-800 border border-slate-700 disabled:opacity-30 text-slate-200 font-semibold text-sm rounded-xl"
          >
            ← Previous Question
          </button>
          <button
            disabled={currentIndex === questions.length - 1}
            onClick={() => { setCurrentIndex(i => i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex-1 py-3 px-4 bg-indigo-600 border border-indigo-500 disabled:opacity-30 text-white font-semibold text-sm rounded-xl shadow-lg"
          >
            Next Question →
          </button>
        </div>
      </footer>
    </div>
  );
}