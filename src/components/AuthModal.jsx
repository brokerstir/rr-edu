import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
        await signIn({ username: email, password });
        onClose();
      } else if (mode === 'signup') {
        await signUp({
          username: email,
          password,
          options: {
            userAttributes: { email }
          }
        });
        setMode('confirm');
      } else if (mode === 'confirm') {
        await confirmSignUp({
          username: email,
          confirmationCode: code
        });
        await signIn({ username: email, password });
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
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