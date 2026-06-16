import { useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function AuthModal({ onClose }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSuccess(credentialResponse) {
    try {
      await loginWithGoogle(credentialResponse.credential);
      onClose();
      navigate('/generate');
    } catch {
      alert('Sign-in failed. Please try again.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm glass-card rounded-2xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X size={18} />
        </button>

        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Zap size={22} className="text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-white text-xl font-semibold">Welcome to ProjectPilot</h2>
            <p className="text-slate-400 text-sm mt-1">Sign in to claim your free project deep dive</p>
          </div>
        </div>

        {/* Benefits */}
        <ul className="space-y-2 mb-8">
          {[
            'Your first full project deep dive — free',
            'Build plan, code structure & interview prep',
            'Save your generations to revisit later',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
              <span className="w-4 h-4 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              </span>
              {item}
            </li>
          ))}
        </ul>

        {/* Google button */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => alert('Sign-in failed. Please try again.')}
            theme="filled_black"
            shape="rectangular"
            size="large"
            text="continue_with"
            width="280"
          />
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          By signing in, you agree to our{' '}
          <Link to="/terms" onClick={onClose} className="underline hover:text-slate-400">terms of service</Link>.
        </p>
      </div>
    </div>
  );
}
