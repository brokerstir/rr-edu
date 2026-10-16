import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage({ onExploreCourses, onOpenAuth }) {
  const { user } = useAuth();

  const handlePrimaryAction = () => {
    if (user) {
      onExploreCourses();
    } else {
      onOpenAuth();
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between text-slate-100">

      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📐</span>
          <span className="text-lg font-extrabold tracking-tight text-white">Robert Risk Education</span>
        </div>
        <div>
          {user ? (
            <button
              onClick={onExploreCourses}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
            >
              My Courses →
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all"
            >
              Sign In / Register
            </button>
          )}
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-4xl mx-auto px-4 py-16 text-center space-y-8">

        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-indigo-400 text-xs font-semibold">
          🚀 Next-Generation Learning Engine
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          High-Yield Math Mastery. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Accessible & Purpose-Built.
          </span>
        </h1>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto text-left space-y-4 shadow-xl">
          <div className="flex items-center gap-3 text-indigo-400 font-semibold text-sm">
            <span>👋 Hi, I'm Robert Risk</span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            I built this platform to give students a free, high-yield digital practice environment to master complex technical subjects like IB Mathematics.
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Work through curated exam-style questions on paper or on screen, compare against detailed target solutions, and track your streaks and topic mastery across all your devices.
          </p>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
          <button
            onClick={handlePrimaryAction}
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
          >
            {user ? 'Explore Courses & Start Practice →' : 'Sign In or Create Account for Free Access →'}
          </button>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Robert Risk Education. Free & Premium Learning Platform.
      </footer>

    </div>
  );
}