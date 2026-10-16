import React from 'react';

const SESSION_OPTIONS = [
  { label: '3 Questions', count: 3, description: 'Quick sprint for a fast warm-up', icon: '⚡' },
  { label: '5 Questions', count: 5, description: 'Standard balanced practice set', icon: '🎯' },
  { label: '10 Questions', count: 10, description: 'Deep focus drill for test prep', icon: '🔥' }
];

export default function SessionLengthModal({ topic, onClose, onStartSession }) {
  if (!topic) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md uppercase">
              Topic {topic.topic_number}
            </span>
            <h2 className="text-xl font-bold text-white mt-1">{topic.topic_name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Option Selection */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Select Practice Set Size:
          </p>
          
          <div className="grid grid-cols-1 gap-2.5">
            {SESSION_OPTIONS.map((opt) => {
              const countText = opt.count === 0 ? `All ${topic.question_count}` : `${opt.count}`;
              return (
                <button
                  key={opt.count}
                  onClick={() => onStartSession(opt.count)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-indigo-600/10 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-indigo-300">
                        {opt.label}
                      </div>
                      <div className="text-xs text-slate-400">
                        {opt.description}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                    {countText} Qs
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}