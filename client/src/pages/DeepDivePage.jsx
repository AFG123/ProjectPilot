import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Zap, Loader2, FolderOpen, ListOrdered, Globe, Database, AlertTriangle, MessageSquare, Clock, ChevronDown, ChevronUp, GraduationCap, Terminal, CheckCircle2, AlertCircle, Search, Lock, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import UnlockButton from '../components/UnlockButton';

// Deep dives are immutable once generated, so we keep a per-project copy in
// localStorage. Re-opening renders instantly with zero network — no cold-DB wait
// and no spinner. A plan only lands here after a successful (i.e. unlocked) fetch,
// so a locked project can never be served from this cache.
const DD_CACHE_PREFIX = 'pp_dd_';
function readLocalDeepDive(name) {
  try { return JSON.parse(localStorage.getItem(DD_CACHE_PREFIX + name) || 'null'); } catch { return null; }
}
function writeLocalDeepDive(name, data) {
  try { localStorage.setItem(DD_CACHE_PREFIX + name, JSON.stringify(data)); } catch { /* quota full — skip */ }
}

// Small mono code block used for setup commands and per-step snippets.
// The header row always renders so the copy button has a home even when there's
// no file label. Copy uses the native clipboard API — no dependency needed.
function CodeBlock({ file, snippet }) {
  const [copied, setCopied] = useState(false);
  if (!snippet) return null;

  const copy = () => {
    navigator.clipboard?.writeText(snippet)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })
      .catch(() => { /* clipboard blocked — no-op */ });
  };

  return (
    <div className="rounded-lg border border-surface-border bg-black/40 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-surface-border">
        <span className="text-xs font-mono text-slate-500 truncate">{file || 'snippet'}</span>
        <button
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs leading-relaxed">
        <code className="font-mono text-slate-200 whitespace-pre">{snippet}</code>
      </pre>
    </div>
  );
}

// Safety net: the model is *supposed* to put code only in `step.code`, but it
// occasionally dumps a fenced ```code block``` into the `how` steps instead —
// sometimes as one multi-line item, sometimes split across several array items.
// Joining the items and splitting on ``` fences reconstructs the original text
// either way, so we can lift code into a real CodeBlock and keep the rest as
// readable prose. Returns null when there's no fence (caller renders a clean <ol>).
function parseHow(how) {
  const joined = how.join('\n');
  if (!joined.includes('```')) return null;

  const blocks = [];
  joined.split('```').forEach((part, i) => {
    if (i % 2 === 1) {
      // Inside a fence. The first line may be a bare language hint (e.g. "javascript").
      const lines = part.replace(/^\n/, '').split('\n');
      if (lines.length > 1 && /^[a-zA-Z0-9+#-]+$/.test(lines[0].trim())) lines.shift();
      const code = lines.join('\n').replace(/\s+$/, '');
      if (code.trim()) blocks.push({ type: 'code', value: code });
    } else {
      const text = part.trim();
      if (text) blocks.push({ type: 'text', value: text });
    }
  });
  return blocks;
}

// Renders the per-step `how` instructions. Normal case → a clean numbered list.
// If the model embedded a code fence, render the prose as text + code as CodeBlock.
function HowSteps({ how }) {
  const blocks = parseHow(how);
  if (!blocks) {
    return (
      <ol className="space-y-1.5 list-decimal list-inside marker:text-slate-600">
        {how.map((h, i) => (
          <li key={i} className="text-sm text-slate-400 leading-relaxed">{h}</li>
        ))}
      </ol>
    );
  }
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => b.type === 'code'
        ? <CodeBlock key={i} snippet={b.value} />
        : <p key={i} className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">{b.value}</p>
      )}
    </div>
  );
}

const METHOD_COLORS = {
  GET:    'text-green-400 bg-green-500/10',
  POST:   'text-blue-400 bg-blue-500/10',
  PUT:    'text-yellow-400 bg-yellow-500/10',
  PATCH:  'text-orange-400 bg-orange-500/10',
  DELETE: 'text-red-400 bg-red-500/10',
};

// Each build step is collapsible — users can focus on the current step
function BuildStep({ step, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-surface-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0">
          {step.step}
        </span>
        <span className="text-sm font-medium text-white flex-1">{step.title}</span>
        <span className="text-xs text-slate-600 mr-2 flex items-center gap-1">
          <Clock size={11} /> {step.estimated_time}
        </span>
        {open ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
          {/* Goal — what works after this step (the "definition of done" up front) */}
          {step.goal && (
            <p className="text-xs text-brand-200 bg-brand-500/8 border border-brand-500/20 rounded-lg px-3 py-2 leading-relaxed">
              🎯 {step.goal}
            </p>
          )}

          <p className="text-sm text-slate-300 leading-relaxed">{step.what_to_build}</p>

          {/* How — concrete sub-steps / commands */}
          {step.how?.length > 0 && <HowSteps how={step.how} />}

          {/* Code — the hard 20% they can't guess */}
          {step.code?.snippet && <CodeBlock file={step.code.file} snippet={step.code.snippet} />}

          {/* Concepts — plain-English explanations of new terms */}
          {step.concepts?.length > 0 && (
            <div className="space-y-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2.5">
              {step.concepts.map((c, i) => (
                <p key={i} className="text-xs text-slate-400 leading-relaxed">
                  <span className="text-brand-400 font-medium font-mono">{c.term}</span> — {c.explain}
                </p>
              ))}
            </div>
          )}

          {/* Verify — how to confirm it works */}
          {step.verify && (
            <div className="flex items-start gap-2 text-xs bg-green-500/5 border border-green-500/15 rounded-lg px-3 py-2">
              <CheckCircle2 size={13} className="text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300 leading-relaxed"><span className="text-green-400 font-medium">Done when:</span> {step.verify}</p>
            </div>
          )}

          {/* If stuck — the most common error + fix */}
          {step.if_stuck && (
            <div className="flex items-start gap-2 text-xs bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300 leading-relaxed"><span className="text-amber-400 font-medium">If stuck:</span> {step.if_stuck}</p>
            </div>
          )}

          {step.files_involved?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {step.files_involved.map(f => (
                <code key={f} className="text-xs px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-brand-400 font-mono">
                  {f}
                </code>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function DeepDivePage() {
  const { index } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [project, setProject]   = useState(null);
  const [profile, setProfile]   = useState(null);
  const [deepDive, setDeepDive] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  // locked = { reason: 'auth' | 'limit' } when the deep dive is gated for this user
  const [locked, setLocked]     = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  // On mount: read from sessionStorage (saved when user clicked the card)
  useEffect(() => {
    try {
      const projects = JSON.parse(sessionStorage.getItem('pp_projects') || '[]');
      const prof     = JSON.parse(sessionStorage.getItem('pp_profile')  || '{}');
      const p = projects[parseInt(index, 10)];
      if (!p) { navigate('/generate'); return; }
      setProject(p);
      setProfile(prof);
    } catch {
      navigate('/generate');
    }
  }, [index, navigate]);

  // Once project + profile are loaded (and auth has resolved), call the backend.
  // The deep dive now requires sign-in, and non-paid users get 1 free one — so we
  // handle 401 (sign in) and 403 (free deep dive used) as "locked", not errors.
  // Depending on `user` means signing in via the modal re-runs the fetch.
  useEffect(() => {
    if (!project || !profile) return;

    // Instant path: already viewed this deep dive in this browser → render now,
    // no network, no spinner. (Only unlocked plans ever reach localStorage.)
    const local = readLocalDeepDive(project.name);
    if (local) {
      setDeepDive(local);
      setLocked(null);
      setError('');
      setLoading(false);
      return;
    }

    if (authLoading) return; // wait until we know whether the user is signed in

    async function fetchDeepDive() {
      setLoading(true);
      setError('');
      setLocked(null);
      setDeepDive(null); // clear any previous project's plan so a failure can't show stale content
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/project/deep-dive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            project,
            targetRole:    profile.targetRole,
            skills:        profile.skills,
            timeAvailable: profile.timeAvailable,
          }),
        });
        const data = await res.json();

        if (res.status === 401) { setLocked({ reason: 'auth' }); return; }
        if (res.status === 403 && data.locked) { setLocked({ reason: 'limit' }); return; }
        if (!res.ok) throw new Error(data.error || 'Failed to load');

        setDeepDive(data);
        writeLocalDeepDive(project.name, data); // serve instantly next time
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDeepDive();
  }, [project, profile, authLoading, user]);

  if (!project) return null;

  return (
    <div className="min-h-screen bg-surface pt-20">
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-8"
        >
          <ArrowLeft size={13} /> Back to results
        </button>

        {/* Project header */}
        <div className="mb-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors mb-3">
            <Zap size={11} /> ProjectPilot
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white leading-snug">{project.name}</h1>
              <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">{project.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {project.techStack?.map(t => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-300">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="glass-card rounded-2xl p-16 text-center">
            <Loader2 size={32} className="animate-spin text-brand-400 mx-auto mb-4" />
            <p className="text-white font-medium">Generating your build plan…</p>
            <p className="text-slate-500 text-sm mt-1">This takes about 20–30 seconds</p>
          </div>
        )}

        {error && !locked && (
          <div className="text-center py-8">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button onClick={() => window.location.reload()} className="text-xs text-brand-400 hover:text-brand-300">Try again</button>
          </div>
        )}

        {/* Locked tease — guest must sign in, or a free user has used their 1 free deep dive */}
        {locked && !loading && (
          <div className="glass-card rounded-2xl p-8 sm:p-10 text-center max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center mx-auto mb-5">
              <Lock size={20} className="text-brand-400" />
            </div>

            {locked.reason === 'auth' ? (
              <>
                <h2 className="text-lg font-bold text-white mb-1.5">Your first deep dive is free</h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  Sign in to unlock the full build plan for <span className="text-slate-200 font-medium">{project.name}</span> — no payment needed for your first one.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-1.5">You've used your free deep dive</h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  Unlock the full build plan for <span className="text-slate-200 font-medium">every</span> project — one-time ₹49, forever.
                </p>
              </>
            )}

            {/* What a deep dive gives them — the curiosity gap, named not blurred */}
            <div className="text-left bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 mb-6 space-y-2.5">
              {[
                { icon: <Terminal size={13} />, label: 'Setup + prerequisites — from empty folder to running' },
                { icon: <ListOrdered size={13} />, label: 'Step-by-step build order, each step verifiable' },
                { icon: <GraduationCap size={13} />, label: 'Code for the tricky 20% + plain-English concepts' },
                { icon: <AlertTriangle size={13} />, label: 'Common mistakes that get students rejected' },
                { icon: <MessageSquare size={13} />, label: 'Interview questions for this exact project' },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-slate-400">
                  <span className="w-6 h-6 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 flex-shrink-0">
                    {row.icon}
                  </span>
                  {row.label}
                </div>
              ))}
            </div>

            {locked.reason === 'auth' ? (
              <button
                onClick={() => setShowAuth(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/30"
              >
                Sign in — first deep dive free
              </button>
            ) : (
              <UnlockButton label="Unlock all deep dives · ₹49" subtext="One-time · every project, forever" />
            )}
          </div>
        )}

        {/* Deep dive content */}
        {deepDive && !loading && (
          <div className="space-y-6">

            {/* 0a — Learn first: prerequisites to skim before coding so they don't stall */}
            {deepDive.prerequisites?.length > 0 && (
              <Section icon={<GraduationCap size={14} />} title="Learn These First">
                <div className="space-y-3">
                  {deepDive.prerequisites.map((p, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium">{p.concept}</p>
                        {p.why && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{p.why}</p>}
                        {p.search && (
                          <p className="text-xs text-brand-400/80 mt-1 font-mono flex items-center gap-1.5">
                            <Search size={10} /> {p.search}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* 0b — Getting started: empty folder → running skeleton */}
            {deepDive.setup && (deepDive.setup.tools?.length > 0 || deepDive.setup.commands?.length > 0 || deepDive.setup.run) && (
              <Section icon={<Terminal size={14} />} title="Getting Started — Setup">
                {deepDive.setup.tools?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Install these</p>
                    <div className="flex flex-wrap gap-1.5">
                      {deepDive.setup.tools.map((t, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-300">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {deepDive.setup.commands?.length > 0 && (
                  <CodeBlock snippet={deepDive.setup.commands.join('\n')} />
                )}
                {deepDive.setup.run && (
                  <div className="flex items-start gap-2 text-xs bg-green-500/5 border border-green-500/15 rounded-lg px-3 py-2 mt-3">
                    <CheckCircle2 size={13} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-300 leading-relaxed"><span className="text-green-400 font-medium">Run it:</span> {deepDive.setup.run}</p>
                  </div>
                )}
              </Section>
            )}

            {/* 1 — Folder structure
                Why two columns: most real projects have backend + frontend.
                Showing them side by side helps the student see the full picture at once. */}
            <Section icon={<FolderOpen size={14} />} title="Folder Structure">
              <div className="grid sm:grid-cols-2 gap-4">
                {deepDive.folder_structure?.backend?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Backend</p>
                    <div className="space-y-1">
                      {deepDive.folder_structure.backend.map((f, i) => (
                        <p key={i} className="text-xs font-mono text-slate-300 leading-relaxed">{f}</p>
                      ))}
                    </div>
                  </div>
                )}
                {deepDive.folder_structure?.frontend?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Frontend</p>
                    <div className="space-y-1">
                      {deepDive.folder_structure.frontend.map((f, i) => (
                        <p key={i} className="text-xs font-mono text-slate-300 leading-relaxed">{f}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* 2 — Build order
                Steps are collapsible. First step open by default — student starts immediately.
                The "always have something working" philosophy from the prompt means step 1
                is always something they can run and see. */}
            <Section icon={<ListOrdered size={14} />} title="Build Order — Step by Step">
              <div className="space-y-2">
                {deepDive.build_order?.map((step, i) => (
                  <BuildStep key={i} step={step} defaultOpen={i === 0} />
                ))}
              </div>
            </Section>

            {/* 3 — API routes */}
            {deepDive.api_routes?.length > 0 && (
              <Section icon={<Globe size={14} />} title="API Routes">
                <div className="space-y-2">
                  {deepDive.api_routes.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex-shrink-0 ${METHOD_COLORS[r.method] || 'text-slate-400 bg-white/5'}`}>
                        {r.method}
                      </span>
                      <code className="text-xs text-brand-400 font-mono flex-shrink-0">{r.path}</code>
                      <span className="text-xs text-slate-500 ml-auto text-right">{r.purpose}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* 4 — DB Schema (only if the project needs a database) */}
            {deepDive.database_schema?.length > 0 && (
              <Section icon={<Database size={14} />} title="Database Schema">
                <div className="space-y-4">
                  {deepDive.database_schema.map((table, i) => (
                    <div key={i}>
                      <p className="text-xs font-mono font-semibold text-brand-400 mb-2">{table.table_name}</p>
                      <div className="space-y-1 pl-3 border-l border-brand-500/20">
                        {table.key_columns?.map((col, j) => (
                          <p key={j} className="text-xs font-mono text-slate-400">{col}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* 5 — Common mistakes
                These are GOLD for students. Most tutorials don't mention them.
                Amber tone because it's a warning, not a failure. */}
            {deepDive.common_mistakes?.length > 0 && (
              <Section icon={<AlertTriangle size={14} />} title="Common Mistakes to Avoid">
                <div className="space-y-3">
                  {deepDive.common_mistakes.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                      <span className="text-amber-400 text-sm mt-0.5 flex-shrink-0">⚠</span>
                      <p className="text-sm text-slate-300 leading-relaxed">{m}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* 6 — Interview questions
                These are role-specific because we passed targetRole to the prompt.
                Student can literally practice these before the interview. */}
            {deepDive.interview_questions?.length > 0 && (
              <Section icon={<MessageSquare size={14} />} title="Interview Questions for This Project">
                <div className="space-y-3">
                  {deepDive.interview_questions.map((q, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <span className="w-5 h-5 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-300 leading-relaxed">{q}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

          </div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
