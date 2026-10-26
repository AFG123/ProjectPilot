import { useState, useEffect } from 'react';
import { X, Zap, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function AuthModal({ onClose }) {
  const { loginWithGoogle, registerWithCredentials, loginWithCredentials } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Derived username preview for signup
  const previewUsername = email.includes('@') ? email.split('@')[0].trim() : '';

  async function handleGoogleSuccess(credentialResponse) {
    setError('');
    try {
      await loginWithGoogle(credentialResponse.credential);
      onClose();
      navigate('/generate');
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await registerWithCredentials(email, password);
      } else {
        await loginWithCredentials(email, password);
      }
      onClose();
      navigate('/generate');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setError('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm glass-card rounded-2xl p-7 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header with Icon */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Zap size={20} className="text-white" />
          </div>
          <div className="text-center">
            <h2 className="font-display text-white text-xl font-semibold tracking-tight">
              {mode === 'signup' ? 'Create an Account' : 'Welcome Back'}
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              {mode === 'signup'
                ? 'Sign up to claim your free project deep dive'
                : 'Sign in to access your saved projects'}
            </p>
          </div>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 bg-surface-card/80 border border-white/5 rounded-xl mb-5 text-xs font-medium">
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`py-1.5 rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`py-1.5 rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email */}
          <div>
            <label className="block text-slate-300 text-xs font-medium mb-1">Email address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                autoComplete="email"
                className="w-full bg-[#10101a] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>
            {/* Auto username preview note */}
            {mode === 'signup' && previewUsername && (
              <p className="text-[11px] text-slate-400 mt-1 pl-1">
                Username will be: <span className="text-brand-400 font-medium font-mono">@{previewUsername}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-300 text-xs font-medium mb-1">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full bg-[#10101a] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-600 hover:to-accent-600 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-[#13131f] px-2 text-slate-500 font-medium">Or continue with</span>
          </div>
        </div>

        {/* Google button */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in failed. Please try again.')}
            theme="filled_black"
            shape="rectangular"
            size="large"
            text="continue_with"
            width="280"
          />
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-4">
          By continuing, you agree to our{' '}
          <Link to="/terms" onClick={onClose} className="underline hover:text-slate-400">
            terms of service
          </Link>.
        </p>
      </div>
    </div>
  );
}
