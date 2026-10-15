import React from 'react';
import MathText from './MathText';

export default function OptionalWorkInput({ value, onChange }) {
  return (
    <div className="space-y-2 w-full">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional: Type scratch work or linear math (e.g. 81m^12 or (x^5 y^10)/32)..."
        className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors"
      />
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