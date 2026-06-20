import { useState } from 'react';
import { Link, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Zap, Menu, X } from 'lucide-react';
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

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              Project<span className="text-brand-400">Pilot</span>
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
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors"
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
                className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors shadow-lg shadow-brand-500/25"
              >
                Get Started Free
              </button>
            )}
          </div>

          {/* Mobile: avatar (when logged in) + menu button */}
          <div className="md:hidden flex items-center gap-3">
            {user && <Avatar user={user} />}
            <button className="text-slate-400" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-surface-border bg-surface/95 px-4 py-4 flex flex-col gap-4">
            <button onClick={() => goToSection('how-it-works')} className="text-sm text-slate-400 text-left">How it works</button>
            <button onClick={() => goToSection('pricing')} className="text-sm text-slate-400 text-left">Pricing</button>
            {user ? (
              <>
                <div className="flex items-center gap-3 pb-1">
                  <Avatar user={user} />
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <NavLink to="/saved" onClick={() => setMenuOpen(false)} className="text-sm text-slate-400 text-left">My Projects</NavLink>
                <button onClick={() => { navigate('/generate'); setMenuOpen(false); }} className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white">Generate</button>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="text-sm text-slate-400 text-left">Sign out</button>
              </>
            ) : (
              <button onClick={() => { setShowAuth(true); setMenuOpen(false); }} className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white">Get Started Free</button>
            )}
          </div>
        )}
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
