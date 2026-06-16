import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ChevronDown, ChevronUp, ArrowRight, Loader2, Clock, Briefcase, Lock, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UnlockButton from '../components/UnlockButton';

// Stale-while-revalidate cache so re-opening My Projects shows instantly instead
// of waiting on a cold Neon query. We render the cached list, then refresh in the
// background. Session-scoped (clears on tab close) — fresh enough, never stale long.
const CACHE_KEY = 'pp_generations_cache';
function readCache() {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}

const DIFF_COLORS = {
  Easy: 'text-green-400 bg-green-500/10',
  Medium: 'text-yellow-400 bg-yellow-500/10',
  Hard: 'text-red-400 bg-red-500/10',
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function SavedPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const cached = readCache();
  const [generations, setGenerations] = useState(cached?.generations || []);
  // The one project a non-paid user unlocked for free (paid users → all unlocked).
  const [freeProject, setFreeProject] = useState(cached?.freeDeepDiveProject ?? null);
  const [loading, setLoading] = useState(!cached); // only spin on the first-ever load
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    // Wait for the cookie-based auth check to finish before deciding.
    if (authLoading) return;
    if (!user) { navigate('/'); return; }
    // Revalidate in the background; the cached list (if any) is already on screen.
    fetch(`${import.meta.env.VITE_API_URL}/api/generations`, {
      credentials: 'include', // sends the auth cookie
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setGenerations(data.generations);
        setFreeProject(data.freeDeepDiveProject ?? null);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          generations: data.generations,
          freeDeepDiveProject: data.freeDeepDiveProject ?? null,
        }));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  function handleProjectClick(gen, index) {
    sessionStorage.setItem('pp_projects', JSON.stringify(gen.projects));
    sessionStorage.setItem('pp_profile', JSON.stringify({
      skills: gen.skills,
      targetRole: gen.target_role,
      company: gen.company || '',
      timeAvailable: gen.time_available,
    }));
    navigate(`/project/${index}`);
  }

  return (
    <div className="min-h-screen bg-surface pt-20">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6">
            <Zap size={12} /> ProjectPilot
          </Link>
          <h1 className="text-3xl font-bold text-white">My Projects</h1>
          <p className="text-slate-400 mt-1.5 text-sm">Your past generations — pick up where you left off.</p>
        </div>

        {/* Unlock banner — every idea is free; this unlocks the full deep dives */}
        {!loading && !user?.isPaid && generations.length > 0 && (
          <div className="glass-card rounded-2xl p-5 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold text-white">Unlock the full build plan for every project</p>
              <p className="text-xs text-slate-500 mt-0.5">One-time ₹49 · every deep dive across all your generations, forever</p>
            </div>
            <UnlockButton label="Unlock all deep dives · ₹49" subtext="One-time · Instant access" />
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-brand-400" />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
        )}

        {!loading && !error && generations.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center border-dashed">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
              <Zap size={22} className="text-brand-400" />
            </div>
            <p className="text-sm font-medium text-white mb-1">No saved generations yet</p>
            <p className="text-xs text-slate-500 mb-4">Generate your first set of project ideas to see them here.</p>
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Generate projects <ArrowRight size={14} />
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {generations.map((gen) => {
            const isOpen = expanded === gen.id;
            return (
              <div key={gen.id} className="glass-card rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : gen.id)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase size={16} className="text-brand-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{gen.target_role}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-500">{gen.projects?.length ?? 0} projects</span>
                        {gen.time_available && (
                          <>
                            <span className="text-xs text-slate-600">·</span>
                            <span className="text-xs text-slate-500">{gen.time_available}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Generation date — cleanly separated as its own chip */}
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] whitespace-nowrap">
                      <Clock size={11} className="text-brand-400" /> {formatDate(gen.created_at)}
                    </span>
                    {isOpen
                      ? <ChevronUp size={16} className="text-slate-500" />
                      : <ChevronDown size={16} className="text-slate-500" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-surface-border px-5 pb-5 pt-4 space-y-3">
                    {gen.skill_gap && (
                      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                        <span className="text-amber-400 text-base leading-none mt-0.5">⚡</span>
                        <p className="text-xs text-amber-200/80 leading-relaxed">{gen.skill_gap}</p>
                      </div>
                    )}
                    {gen.projects?.map((p, i) => {
                      // Unlocked = the deep dive opens without hitting the paywall:
                      // paid users → all; non-paid → only their one free project.
                      const unlocked = user?.isPaid || p.name === freeProject;
                      return (
                      <div
                        key={i}
                        onClick={() => handleProjectClick(gen, i)}
                        className="rounded-xl border border-surface-border bg-surface hover:border-brand-500/40 transition-all cursor-pointer group p-4"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-brand-400 transition-colors">{p.name}</h3>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Unlock status — so they jump straight to the open one */}
                            {unlocked ? (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-green-400 bg-green-500/10 border border-green-500/20">
                                <Check size={10} /> Unlocked
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-slate-400 bg-white/[0.04] border border-white/[0.08]">
                                <Lock size={10} /> Locked
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${DIFF_COLORS[p.difficulty] || 'text-slate-400 bg-white/5'}`}>
                              {p.difficulty}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-2">{p.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.techStack?.map(t => (
                            <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-400">{t}</span>
                          ))}
                        </div>
                        <div className="flex items-center justify-end mt-2">
                          <span className="flex items-center gap-1 text-xs text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                            {unlocked ? 'Open deep dive' : 'Preview & unlock'} <ArrowRight size={11} />
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
