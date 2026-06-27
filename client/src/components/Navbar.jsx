import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Zap, Menu, X, ChevronRight, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

// Google profile images (lh3.googleusercontent.com) refuse to load when the
// browser sends a referrer header — they come back 403, so the <img> shows
// broken. referrerPolicy="no-referrer" fixes that. We also fall back to the
// user's initial if the image still fails for any reason.
function Avatar({ user }) {
  const [broken, setBroken] = useState(false);
  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  if (broken || !user.picture) {
    return (
      <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-semibold cursor-pointer ring-2 ring-surface-border group-hover:ring-brand-500 transition-all">
        {initial}
      </div>
    );
  }
  return (
    <img
      src={user.picture}
      alt={user.name}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="w-8 h-8 rounded-full cursor-pointer ring-2 ring-surface-border hover:ring-brand-500 transition-all"
    />
  );
}

// Shared styling for the big tap-target links inside the mobile overlay.
const mobileLink =
  'flex items-center justify-between text-xl font-medium text-slate-200 py-4 px-1.5 rounded-xl hover:bg-white/5 hover:text-white hover:pl-3 transition-all';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Lock background scroll while the full-screen mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // The "How it works" / "Pricing" anchors only exist on the landing page.
  // From any other route we navigate home first and pass the target section so
  // LandingPage can scroll to it once it has rendered.
  function goToSection(id) {
    setMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              Project<span className="duo-text">Pilot</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => goToSection('how-it-works')} className="text-sm text-slate-400 hover:text-white transition-colors">How it works</button>
            <button onClick={() => goToSection('pricing')} className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</button>
            {user ? (
              <div className="flex items-center gap-3">
                <NavLink
                  to="/saved"
                  className={({ isActive }) =>
                    `text-sm transition-colors ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'}`
                  }
                >
                  My Projects
                </NavLink>
                <button
                  onClick={() => navigate('/generate')}
                  className="text-sm font-medium px-4 py-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 hover:opacity-90 text-white transition-opacity"
                >
                  Generate
                </button>
                <div className="relative group">
                  <Avatar user={user} />
                  <div className="absolute right-0 top-10 w-44 py-1 rounded-xl glass-card shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="px-3 py-2 border-b border-surface-border">
                      <p className="text-xs text-white font-medium truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <Link to="/saved" className="block px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                      My Projects
                    </Link>
                    <button onClick={logout} className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-sm font-medium px-4 py-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 hover:opacity-90 text-white transition-opacity shadow-lg shadow-brand-500/25"
              >
                Get Started Free
              </button>
            )}
          </div>

          {/* Mobile: hamburger only — account/profile now lives inside the overlay */}
          <button className="md:hidden text-slate-400 p-1.5" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile full-screen overlay menu. Kept mounted so it can animate in AND
          out; pointer-events-none + opacity-0 make it inert while closed. */}
      <div
        className={`md:hidden fixed inset-0 z-[60] flex flex-col bg-surface/95 backdrop-blur-xl px-6 pt-4 pb-7 transition-all duration-300 ${
          menuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Top: logo + close */}
        <div className="flex items-center justify-between h-12">
          <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              Project<span className="duo-text">Pilot</span>
            </span>
          </Link>
          <button onClick={() => setMenuOpen(false)} className="text-slate-400 p-1.5" aria-label="Close menu">
            <X size={22} />
          </button>
        </div>

        {/* Account header (logged in only) */}
        {user && (
          <div className="flex items-center gap-3 mt-6">
            <Avatar user={user} />
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{user.name}</p>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}

        <div className="h-px bg-surface-border my-6" />

        {/* Nav links */}
        <nav className="flex flex-col flex-1 gap-1">
          {user && (
            <NavLink to="/saved" onClick={() => setMenuOpen(false)} className={mobileLink}>
              My Projects <ChevronRight size={18} className="text-slate-500" />
            </NavLink>
          )}
          <button onClick={() => goToSection('how-it-works')} className={mobileLink}>
            How it works <ChevronRight size={18} className="text-slate-500" />
          </button>
          <button onClick={() => goToSection('pricing')} className={mobileLink}>
            Pricing <ChevronRight size={18} className="text-slate-500" />
          </button>
        </nav>

        {/* Footer: primary CTA + sign out */}
        <div className="flex flex-col gap-3 items-center">
          {user ? (
            <button
              onClick={() => { navigate('/generate'); setMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-accent-500 hover:opacity-90 text-white font-semibold py-4 rounded-full shadow-lg shadow-brand-500/30 transition-opacity"
            >
              Generate <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => { setShowAuth(true); setMenuOpen(false); }}
              className="w-full flex items-center justify-center bg-gradient-to-r from-brand-500 to-accent-500 hover:opacity-90 text-white font-semibold py-4 rounded-full shadow-lg shadow-brand-500/30 transition-opacity"
            >
              Get Started Free
            </button>
          )}
          {user && (
            <button onClick={() => { logout(); setMenuOpen(false); }} className="text-slate-400 hover:text-white text-sm py-1.5 transition-colors">
              Sign out
            </button>
          )}
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
