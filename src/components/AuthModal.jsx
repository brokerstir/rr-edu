import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { sendOtp, verifyOtp, resendOtp, formatAuthError } = useAuth();

  // Two-step flow: 'EMAIL' (Step 1) | 'CODE' (Step 2)
  const [step, setStep] = useState('EMAIL');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  // UI status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExpiredError, setIsExpiredError] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const codeInputRef = useRef(null);

  // Rate-limiting cooldown countdown timer (30s)
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus code input when entering Step 2
  useEffect(() => {
    if (step === 'CODE' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setStep('EMAIL');
    setCode('');
    setError('');
    setIsExpiredError(false);
    setResendNotice('');
    setLoading(false);
    onClose();
  };

  // Step 1: User submits email to request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsExpiredError(false);
    setResendNotice('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(email.trim());
      if (res?.isSignedIn) {
        // User was already authenticated
        resetAndClose();
        return;
      }
      setStep('CODE');
      setCooldown(30); // 30-second cooldown on initial send
    } catch (err) {
      const formatted = formatAuthError ? formatAuthError(err) : (err.message || 'Error sending code.');
      setError(formatted);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: User submits verification code to verify & launch session
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setIsExpiredError(false);
    setResendNotice('');

    const cleanCode = code.trim();
    if (cleanCode.length < 6 || cleanCode.length > 8) {
      setError('Please enter the verification code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(cleanCode, email.trim());
      resetAndClose();
    } catch (err) {
      const formatted = formatAuthError ? formatAuthError(err) : (err.message || 'Verification error.');
      const isExpired =
        err.name === 'ExpiredCodeException' ||
        (err.message && err.message.toLowerCase().includes('expired'));
      setIsExpiredError(isExpired);
      setError(formatted);
    } finally {
      setLoading(false);
    }
  };

  // Resend code with rate-limit protection
  const handleResend = async () => {
    if (cooldown > 0 || loading) return;

    setError('');
    setIsExpiredError(false);
    setResendNotice('');
    setLoading(true);

    try {
      await resendOtp(email.trim());
      setCooldown(30);
      setCode('');
      setResendNotice('A new verification code has been sent to your email.');
    } catch (err) {
      const formatted = formatAuthError ? formatAuthError(err) : (err.message || 'Failed to resend code.');
      setError(formatted);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 sm:p-7 space-y-6 shadow-2xl relative">

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
              <span>✉️</span> Passwordless Authentication
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {step === 'EMAIL' ? 'Sign In or Register' : 'Verify Your Email'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {step === 'EMAIL'
                ? 'Enter your email to receive a verification code.'
                : `We emailed a verification code to ${email}`}
            </p>
          </div>
          <button
            onClick={resetAndClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error / Alert Feedback */}
        {error && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2.5 ${
              isExpiredError
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <span className="text-sm leading-none mt-0.5">
              {isExpiredError ? '⏳' : '⚠️'}
            </span>
            <div className="flex-1">
              <p>{error}</p>
              {isExpiredError && cooldown === 0 && (
                <button
                  type="button"
                  onClick={handleResend}
                  className="mt-1.5 inline-block text-xs font-bold text-amber-200 underline hover:text-white"
                >
                  Request a new code now →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Resend Notice Feedback */}
        {resendNotice && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium flex items-center gap-2">
            <span>✓</span>
            <span>{resendNotice}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 'EMAIL' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="auth-email-input" className="text-xs font-semibold text-slate-300 block">
                Enter your email
              </label>
              <input
                id="auth-email-input"
                type="email"
                required
                autoFocus
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@school.edu"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 disabled:opacity-50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors shadow-inner"
              />
              <p className="text-[11px] text-slate-500">
                No password required. New students are automatically registered.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Sending Verification Code...</span>
                </>
              ) : (
                <span>Continue with Email Code →</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter verification code */}
        {step === 'CODE' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="auth-code-input" className="text-xs font-semibold text-slate-300 block">
                Enter verification code
              </label>
              <input
                ref={codeInputRef}
                id="auth-code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                required
                disabled={loading}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 8);
                  setCode(val);
                }}
                placeholder="12345678"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 disabled:opacity-50 text-white rounded-xl px-4 py-3 text-2xl font-mono text-center tracking-[0.25em] focus:outline-none transition-colors shadow-inner"
              />
              <p className="text-[11px] text-slate-500 text-center">
                Check your inbox and spam folder for the one-time verification code.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.trim().length < 6}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Verifying Code...</span>
                </>
              ) : (
                <span>Authenticate & Launch Session →</span>
              )}
            </button>

            {/* Resend and Navigation Actions */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('EMAIL');
                  setCode('');
                  setError('');
                  setIsExpiredError(false);
                  setResendNotice('');
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Change email
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="font-semibold text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}