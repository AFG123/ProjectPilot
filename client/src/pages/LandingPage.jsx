import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Zap, ArrowRight, Sparkles, Target, FileText, Shield, CheckCircle, ChevronDown, ChevronUp, Layers } from 'lucide-react';
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

const faqs = [
  { q: 'Do I need to create an account to use it?', a: 'No — you can generate all 5 project ideas without signing up. Create a free account to save your results and claim your first full project deep dive (build plan, code & interview prep) free.' },
  { q: 'How is this different from asking ChatGPT?', a: 'ProjectPilot is built specifically for placement-seeking students. It factors in your exact skill level, target company culture, and realistic build time — giving you actionable projects, not generic ideas.' },
  { q: 'Are the project ideas unique every time?', a: 'Yes. The AI generates fresh suggestions on every request. Same skills + different role = completely different projects.' },
  { q: 'Can I use this for off-campus applications too?', a: 'Absolutely. Whether you\'re targeting product companies, service companies, or startups — just enter your target role and the AI tailors suggestions accordingly.' },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-surface-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium text-white">{q}</span>
        {open ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
      </button>
      {open && <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed">{a}</div>}
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <div className="min-h-screen bg-surface">
      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Glow */}
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-xs font-medium mb-8">
            <Sparkles size={12} />
            AI-powered project ideas for campus placements
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            <span className="text-white">Stand out in</span>
            <br />
            <span className="gradient-text">every placement round</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Enter your skills and target role. Get 5 specific, recruiter-approved project ideas
            tailored to your profile — not the generic todo apps everyone else builds.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleCTA}
              className="group flex items-center gap-2 px-6 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50"
            >
              Generate My Projects
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-xs text-slate-500">Free to start · No credit card</span>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { val: '5', label: 'project ideas' },
              { val: '30s', label: 'generation time' },
              { val: '100%', label: 'tailored to you' },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-white">{val}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PREVIEW CARD ─── */}
      <section className="px-4 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card rounded-2xl p-6 glow-border">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-2 text-xs text-slate-600">projectpilot.ai/generate</span>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Real-time Collaborative Code Review Tool', stack: 'React · WebSockets · Node.js', diff: 'Medium', time: '2 weeks' },
                { name: 'AI-Powered Resume Parser & Job Matcher', stack: 'Python · NLP · React · FastAPI', diff: 'Hard', time: '3 weeks' },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-brand-500/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.stack}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400">{p.diff}</span>
                    <span className="text-xs text-slate-500">{p.time}</span>
                  </div>
                </div>
              ))}
              {/* More ideas — all free, blurred just for the preview */}
              {[3, 4, 5].map((n) => (
                <div key={n} className="relative rounded-xl border border-white/[0.05] bg-white/[0.02] overflow-hidden">
                  <div className="p-4 blur-2xl opacity-20 pointer-events-none select-none" aria-hidden="true">
                    <p className="text-sm font-medium text-white">Project idea #{n}</p>
                    <p className="text-xs text-slate-500 mt-0.5">React · Node.js · PostgreSQL · Express</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-xs font-medium text-brand-400 bg-brand-500/10 border border-brand-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Sparkles size={10} /> All 5 ideas, free
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 px-4 border-t border-surface-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-brand-400 text-sm font-medium mb-3">Simple process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">From skills to projects in 30 seconds</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: <Target size={20} className="text-brand-400" />,
                title: 'Enter your profile',
                desc: 'Add your skills with proficiency levels, target role, dream company, and available time.',
              },
              {
                step: '02',
                icon: <Sparkles size={20} className="text-brand-400" />,
                title: 'AI crafts your projects',
                desc: 'Our AI analyzes your profile against what top recruiters look for and generates 5 tailored ideas.',
              },
              {
                step: '03',
                icon: <Layers size={20} className="text-brand-400" />,
                title: 'Deep dive into any idea',
                desc: 'Open a project to get a full build plan — folder structure, step-by-step order, API routes, DB schema, common mistakes & interview questions.',
              },
              {
                step: '04',
                icon: <FileText size={20} className="text-brand-400" />,
                title: 'Build & get hired',
                desc: 'Follow the plan, ship it to GitHub, and walk into interviews ready to defend every decision.',
              },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 120}>
                <div className="glass-card rounded-2xl p-6 h-full group hover:border-brand-500/30 hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center group-hover:bg-brand-500/20 group-hover:scale-110 transition-all duration-300">
                      {item.icon}
                    </div>
                    <span className="text-4xl font-bold text-white/[0.04] group-hover:text-brand-500/20 transition-colors duration-300">{item.step}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-brand-400 text-sm font-medium mb-3">Why ProjectPilot</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Built for Indian placement season</h2>
            <p className="text-slate-400 mt-4 max-w-lg mx-auto">Every feature is designed to help Tier-2 and Tier-3 college students compete with IITians on the strength of their portfolio.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Target size={18} />, title: 'Company-aware suggestions', desc: 'Tell us your dream company. We tailor projects to what their recruiters value.' },
              { icon: <Shield size={18} />, title: 'Skill-level matched', desc: 'No impossible projects. Every idea is calibrated to your current expertise.' },
              { icon: <Sparkles size={18} />, title: 'Recruiter rationale', desc: 'Know exactly why each project impresses hiring managers before you build it.' },
              { icon: <FileText size={18} />, title: 'Interview-ready prep', desc: 'Every deep dive includes likely interview questions on your project, so you can defend it with confidence.' },
              { icon: <Zap size={18} />, title: 'Instant results', desc: 'No waiting. 5 tailored project ideas generated in under 30 seconds.' },
              { icon: <CheckCircle size={18} />, title: 'Save & revisit', desc: 'Save your generations. Come back and compare options before you decide.' },
            ].map((f) => (
              <div key={f.title} className="p-5 rounded-xl glass-card hover:border-white/10 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 group-hover:bg-brand-500/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24 px-4 border-t border-surface-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-brand-400 text-sm font-medium mb-3">Simple pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Less than a chai. More than a placement.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <div className="glass-card rounded-2xl p-6">
              <p className="text-sm font-medium text-slate-400 mb-1">Free</p>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-bold text-white">₹0</span>
              </div>
              <ul className="space-y-3 mb-6">
                {['All 5 tailored project ideas', '1 full project deep dive — free', 'No login needed to generate'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle size={14} className="text-slate-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={handleCTA} className="w-full py-2.5 rounded-xl border border-surface-border text-sm font-medium text-white hover:bg-white/5 transition-colors">
                Try for free
              </button>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl p-6 bg-gradient-to-b from-brand-500/20 to-brand-600/5 border border-brand-500/40">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-500 text-white text-xs font-medium">
                Most popular
              </div>
              <p className="text-sm font-medium text-brand-400 mb-1">Lifetime unlock</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-white">₹49</span>
                <span className="text-slate-400 text-sm mb-1.5">one-time</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Pay once · unlock forever</p>
              <ul className="space-y-3 mb-6">
                {['Unlimited full project deep dives', 'Step-by-step build plans + code', 'Interview questions per project', 'Company-targeted suggestions', 'Save & revisit history'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white">
                    <CheckCircle size={14} className="text-brand-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => (user ? navigate('/generate') : setShowAuth(true))}
                className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-sm font-semibold text-white transition-colors shadow-lg shadow-brand-500/25"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-24 px-4 border-t border-surface-border">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">Frequently asked</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 px-4 border-t border-surface-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Your next project idea is<br />
            <span className="gradient-text">30 seconds away.</span>
          </h2>
          <p className="text-slate-400 mb-8">Join students who stopped building generic projects and started building careers.</p>
          <button
            onClick={handleCTA}
            className="group inline-flex items-center gap-2 px-6 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/30"
          >
            Generate My Projects
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-surface-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-sm font-medium text-white">Project<span className="text-brand-400">Pilot</span></span>
          </div>
          <p className="text-xs text-slate-600">© 2026 ProjectPilot. Built for Indian placement warriors.</p>
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
