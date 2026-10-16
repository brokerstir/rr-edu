import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signInWithRedirect } from '@aws-amplify/auth';

export default function AuthModal({ isOpen, onClose }) {
  const { signIn, signUp, confirmSignUp } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'confirm'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onClose();
      } else if (mode === 'signup') {
        await signUp(email, password);
        setMode('confirm');
      } else if (mode === 'confirm') {
        await confirmSignUp(email, code);
        await signIn(email, password);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signInWithRedirect({ provider: 'Google' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {mode === 'signin' && 'Sign In to RR-EDU'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'confirm' && 'Verify Email'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'confirm' ? `Code sent to ${email}` : 'Track progress & save practice streaks'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Google Sign-In Button */}
        {mode !== 'confirm' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-sm rounded-xl transition-all shadow-md hover:border-slate-700"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3h3.88c2.28-2.1 3.665-5.2 3.665-9.12z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.1 0-5.74-2.1-6.68-4.92H1.31v3.08C3.3 21.3 7.37 24 12 24z"/>
                <path fill="#FBBC05" d="M5.32 14.33c-.24-.72-.38-1.49-.38-2.33s.14-1.61.38-2.33V6.59H1.31C.48 8.24 0 10.06 0 12s.48 3.76 1.31 5.41l4.01-3.08z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.3 2.7 1.31 6.59l4.01 3.08c.94-2.82 3.58-4.92 6.68-4.92z"/>
              </svg>
              Continue with Google
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full"></div>
              <span className="bg-slate-900 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider absolute">
                or
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== 'confirm' ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@school.edu"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Verification Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm text-center font-mono tracking-widest focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20 mt-2"
          >
            {loading ? 'Processing...' : (
              mode === 'signin' ? 'Sign In with Email →' :
              mode === 'signup' ? 'Create Account →' : 'Confirm & Sign In →'
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-2 border-t border-slate-800">
          {mode === 'signin' ? (
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(''); }}
                className="text-indigo-400 hover:underline font-semibold"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); }}
                className="text-indigo-400 hover:underline font-semibold"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}