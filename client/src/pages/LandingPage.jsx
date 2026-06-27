import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Zap, ArrowRight, Sparkles, Target, CheckCircle, FileText, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';

// Reveals its children with a fade-up the first time they scroll into view.
// `delay` staggers siblings so a grid animates in sequence, not all at once.
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setShown(true); obs.disconnect(); }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={shown ? 'reveal-up' : 'opacity-0'} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// Kept in sync with the FAQPage JSON-LD in index.html so the rich-result data
// matches what users actually read.
const faqs = [
  { q: 'Is ProjectPilot free?', a: 'Yes — generating 5 tailored project ideas is always free, and your first full build plan is free too. You only pay ₹49 (one-time) if you want to unlock every build plan after that.' },
  { q: 'What exactly do I get for ₹49?', a: 'A one-time ₹49 payment permanently unlocks unlimited deep-dive build plans — setup, step-by-step build order, code snippets, common mistakes, and interview questions — for every project you generate. It\'s not a subscription; you never pay again.' },
  { q: 'Who is it for?', a: 'Indian CS/IT students preparing for campus placements or off-campus drives — final-year students and freshers who need strong, finishable portfolio projects that match the roles they\'re applying for.' },
  { q: 'What kind of projects does it suggest?', a: 'Real, role-relevant projects scoped to your skill level and time — never generic todo, weather, or calculator clones. Each idea is something you can actually finish and explain confidently in an interview.' },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-white/[0.03]">
      <button
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="font-display text-base font-semibold text-white">{q}</span>
        {open ? <ChevronUp size={18} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={18} className="text-slate-500 flex-shrink-0" />}
      </button>
      {open && <div className="px-6 pb-5 text-sm text-slate-400 leading-relaxed">{a}</div>}
    </div>
  );
}

// shared styles
const eyebrow = 'text-xs font-semibold uppercase tracking-[0.12em] text-brand-400 text-center mb-3';
const sectionH2 = 'font-display text-3xl sm:text-4xl font-bold text-white text-center tracking-tight leading-tight';
const cardBase = 'rounded-2xl bg-white/[0.03] border border-white/[0.08] p-7';
const pillPrimary = 'inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-brand-500/30';
const freeTag = 'inline-block mt-3 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full';

export default function LandingPage() {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = 'ProjectPilot — Resume Project Ideas & Build Plans for CS Students';
  }, []);

  // When the navbar sends us here to reach a section (from another route),
  // scroll to it once this page has mounted, then clear the state so a refresh
  // doesn't re-trigger it.
  useEffect(() => {
    if (location.state?.scrollTo) {
      document.getElementById(location.state.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  function handleCTA() {
    navigate('/generate');
  }
  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-hero-duo pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 text-brand-100 text-[11px] font-semibold uppercase tracking-[0.09em] mb-7">
            <Sparkles size={12} />
            For Indian CS &amp; IT students · Placements 2026
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-[66px] font-bold tracking-tight leading-[1.03] mb-6">
            <span className="text-white">Resume project ideas that</span>
            <br />
            <span className="duo-text">get you placed</span>
          </h1>

          <p className="text-lg text-slate-300/90 max-w-2xl mx-auto leading-relaxed mb-9">
            ProjectPilot is an <span className="text-white font-medium">AI placement mentor</span> for CS students.
            Enter your skills and target role and get <span className="text-white font-medium">5 portfolio projects
            worth building</span> — each matched to real job descriptions — plus a step-by-step plan to finish the one
            you pick and defend it in interviews.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={handleCTA} className={`group ${pillPrimary}`}>
              Generate my projects
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => scrollTo('how-it-works')} className="px-7 py-4 rounded-full border border-white/15 text-white font-medium hover:bg-white/5 transition-colors">
              See how it works
            </button>
          </div>

          <p className="mt-7 text-sm text-slate-500">
            Free to start &nbsp;·&nbsp; No card needed &nbsp;·&nbsp;
            <span className="text-slate-300 font-medium"> Built by a CS student, for CS students</span>
          </p>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 px-4 border-t border-surface-border">
        <div className="max-w-5xl mx-auto">
          <p className={eyebrow}>How it works</p>
          <h2 className={sectionH2}>From blank GitHub to interview-ready</h2>
          <p className="text-center text-slate-400 max-w-xl mx-auto mt-4 mb-14 leading-relaxed">
            Three steps. The first two are completely free — you only pay if you want the full build plans.
          </p>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { n: '1', title: 'Tell us about you', desc: "Your skills, their level, and the role you're targeting — or upload your resume and we'll read them off it automatically.", tag: null },
              { n: '2', title: 'Get 5 buildable ideas', desc: 'Tailored to what recruiters actually screen for in that role — never generic todo, weather, or calculator apps.', tag: 'All 5 free' },
              { n: '3', title: 'Unlock the build plan', desc: 'Setup commands, build order, code snippets for the tricky parts, common mistakes, and likely interview questions.', tag: 'First plan free' },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className={`${cardBase} h-full`}>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/40 to-accent-500/30 flex items-center justify-center font-display font-bold text-white mb-5">{s.n}</div>
                  <h3 className="font-display text-lg font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                  {s.tag && <span className={freeTag}>{s.tag}</span>}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY ─── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <p className={eyebrow}>Why ProjectPilot</p>
          <h2 className={sectionH2}>Projects that actually move the needle</h2>

          <div className="grid sm:grid-cols-3 gap-5 mt-14">
            {[
              { icon: <Target size={20} />, title: 'Matched to your role', desc: 'Built around real job descriptions for your target role, so every project shows exactly what hiring managers screen for.' },
              { icon: <CheckCircle size={20} />, title: 'Actually finishable', desc: 'Scoped to your skill level and time, so it ends up complete on your resume — not abandoned half-built on GitHub.' },
              { icon: <FileText size={20} />, title: 'From idea to interview', desc: 'The build plan walks you through making it and prepares you to defend every line of code when they ask.' },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 120}>
                <div className={`${cardBase} h-full`}>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500/30 to-accent-500/20 flex items-center justify-center text-brand-100 mb-5">{f.icon}</div>
                  <h3 className="font-display text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24 px-4 border-t border-surface-border">
        <div className="max-w-4xl mx-auto">
          <p className={eyebrow}>Pricing</p>
          <h2 className={sectionH2}>Simple, honest pricing</h2>
          <p className="text-center text-slate-400 max-w-md mx-auto mt-4 mb-14 leading-relaxed">
            No subscription. Start free, and pay once only if the build plans are worth it to you.
          </p>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Free */}
            <div className={cardBase}>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-2">Free</p>
              <div className="font-display text-4xl font-bold text-white mb-1">₹0</div>
              <p className="text-sm text-slate-500 mb-6">Everything you need to start</p>
              <ul className="space-y-3 mb-7">
                {['5 tailored project ideas, every time', 'Skill-gap analysis for your role', 'Resume skill extraction', 'Your first full build plan'].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={handleCTA} className="w-full py-3 rounded-full border border-white/15 text-sm font-semibold text-white hover:bg-white/5 transition-colors">
                Try for free
              </button>
            </div>

            {/* Paid */}
            <div className="relative rounded-2xl p-7 bg-gradient-to-b from-brand-500/[0.16] to-accent-500/[0.08] border border-brand-500/40">
              <span className="absolute -top-3 right-6 text-[11px] font-bold text-white bg-gradient-to-r from-brand-500 to-accent-500 px-3 py-1 rounded-full">ONE-TIME</span>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-300 mb-2">Full access</p>
              <div className="font-display text-4xl font-bold text-white mb-1">₹49</div>
              <p className="text-sm text-slate-400 mb-6">Pay once, unlocks forever</p>
              <ul className="space-y-3 mb-7">
                {[['Everything in Free', false], ['Unlimited full build plans', true], ['Every project you generate, forever', false], ['No subscription, no renewals', false]].map(([f, bold]) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white">
                    <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" /> <span className={bold ? 'font-semibold' : ''}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => (user ? navigate('/generate') : setShowAuth(true))}
                className="w-full py-3 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-lg shadow-brand-500/25"
              >
                Unlock for ₹49
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-24 px-4 border-t border-surface-border">
        <div className="max-w-2xl mx-auto">
          <p className={eyebrow}>FAQ</p>
          <h2 className={`${sectionH2} mb-12`}>Questions, answered</h2>
          <div className="space-y-3">
            {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="px-4 pb-24">
        <div className="max-w-4xl mx-auto rounded-3xl px-6 py-14 text-center bg-gradient-to-r from-brand-500 to-accent-500">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Your next resume project is one click away
          </h2>
          <p className="text-white/85 mb-8">Generate 5 tailored ideas free — no card needed to look.</p>
          <button onClick={handleCTA} className="group inline-flex items-center gap-2 px-7 py-4 rounded-full bg-surface text-white font-semibold hover:bg-black transition-colors">
            Get started free
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-surface-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-sm font-medium text-white">Project<span className="duo-text">Pilot</span></span>
          </div>
          <p className="text-xs text-slate-600">© 2026 ProjectPilot · Built for Indian placement season.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/privacy" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Terms</Link>
            <Link to="/refund" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Refunds</Link>
            <Link to="/contact" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
