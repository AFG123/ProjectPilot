import { useState, useRef } from 'react';
import { Plus, X, Loader2, ChevronDown, Zap, ArrowRight, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import UnlockButton from '../components/UnlockButton';

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const ROLES = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Engineer', 'ML Engineer', 'DevOps Engineer', 'Android Developer', 'iOS Developer', 'Other'];
const PRESET_TIMES = ['1 week', '2 weeks', '1 month', '2 months'];
const DIFF_COLORS = { Easy: 'text-green-400 bg-green-500/10', Medium: 'text-yellow-400 bg-yellow-500/10', Hard: 'text-red-400 bg-red-500/10' };

export default function GeneratePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);

  const [skills, setSkills] = useState([{ name: '', level: 'intermediate' }]);
  const [targetRole, setTargetRole] = useState('');
  const [company, setCompany] = useState('');
  const [timeAvailable, setTimeAvailable] = useState('2 weeks');
  const [customWeeks, setCustomWeeks] = useState('');
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [skillGap, setSkillGap] = useState('');
  const [error, setError] = useState('');

  // Resume upload state
  const [inputMode, setInputMode] = useState('manual'); // 'manual' | 'upload'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extracted, setExtracted] = useState(false); // true after successful extraction
  const fileInputRef = useRef(null);

  function addSkill() {
    if (skills.length < 6) setSkills([...skills, { name: '', level: 'intermediate' }]);
  }
  function removeSkill(i) { setSkills(skills.filter((_, idx) => idx !== i)); }
  function updateSkill(i, field, val) {
    setSkills(skills.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  async function handleResumeUpload(file) {
    if (!file || file.type !== 'application/pdf') {
      setExtractError('Please upload a PDF file.');
      return;
    }
    setUploadedFile(file);
    setExtracting(true);
    setExtractError('');
    setExtracted(false);

    // Build multipart form — backend expects field named "resume"
    const formData = new FormData();
    formData.append('resume', file);
    if (targetRole) formData.append('targetRole', targetRole);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/resume/extract`, {
        method: 'POST',
        credentials: 'include',
        body: formData, // no Content-Type header — browser sets it with boundary automatically
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');

      // Pre-fill the form with extracted data — user can still edit everything
      if (data.skills?.length) setSkills(data.skills);
      if (data.inferredRole && !targetRole) setTargetRole(data.inferredRole);
      if (data.skillGaps) setSkillGap(data.skillGaps);
      setExtracted(true);
    } catch (err) {
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    const validSkills = skills.filter(s => s.name.trim());
    if (!validSkills.length || !targetRole) return;

    setLoading(true);
    setError('');
    setProjects([]);
    setSkillGap('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // sends auth cookie so logged-in generations get saved
        body: JSON.stringify({ skills: validSkills, targetRole, company, timeAvailable }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setProjects(data.projects);
      setSkillGap(data.skillGap || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleProjectClick(project, index) {
    // Store everything the deep dive page needs — no DB required yet
    sessionStorage.setItem('pp_projects', JSON.stringify(projects));
    sessionStorage.setItem('pp_profile', JSON.stringify({ skills, targetRole, company, timeAvailable }));
    navigate(`/project/${index}`);
  }

  return (
    <div className="min-h-screen bg-surface pt-20">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6">
            <Zap size={12} /> ProjectPilot
          </Link>
          <h1 className="text-3xl font-bold text-white">Generate your projects</h1>
          <p className="text-slate-400 mt-1.5 text-sm">Fill in your profile and get 5 tailored project ideas in seconds.</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8 items-start">
          {/* ── FORM ── */}
          <form onSubmit={handleGenerate} className="glass-card rounded-2xl p-6 space-y-6">

            {/* ── Input mode toggle ── */}
            <div className="flex rounded-lg border border-surface-border p-0.5 gap-0.5">
              {['manual', 'upload'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setInputMode(mode); setExtractError(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                    inputMode === mode
                      ? 'bg-brand-500 text-white shadow'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {mode === 'manual' ? <><FileText size={12} /> Enter manually</> : <><Upload size={12} /> Upload resume</>}
                </button>
              ))}
            </div>

            {/* ── Resume upload dropzone ── */}
            {inputMode === 'upload' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleResumeUpload(e.target.files[0])}
                />

                {/* Drop zone — click to open file picker */}
                <div
                  onClick={() => !extracting && fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleResumeUpload(f); }}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    extracting
                      ? 'border-brand-500/40 bg-brand-500/5 cursor-wait'
                      : extracted
                      ? 'border-green-500/40 bg-green-500/5'
                      : 'border-surface-border hover:border-brand-500/40 hover:bg-brand-500/5'
                  }`}
                >
                  {extracting ? (
                    <>
                      <Loader2 size={24} className="animate-spin text-brand-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-300 font-medium">Reading your resume…</p>
                      <p className="text-xs text-slate-500 mt-1">Extracting skills with AI</p>
                    </>
                  ) : extracted ? (
                    <>
                      <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
                      <p className="text-sm text-white font-medium">Skills extracted!</p>
                      <p className="text-xs text-slate-500 mt-1">{uploadedFile?.name} — review and edit below</p>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setExtracted(false); setUploadedFile(null); fileInputRef.current?.click(); }} className="mt-3 text-xs text-brand-400 hover:text-brand-300">
                        Upload different file
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload size={24} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-white font-medium">Drop your resume here</p>
                      <p className="text-xs text-slate-500 mt-1">PDF only · Max 5MB · Click to browse</p>
                    </>
                  )}
                </div>

                {extractError && (
                  <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{extractError}</p>
                )}

                {/* After extraction: show the pre-filled skills so user knows what was found */}
                {extracted && (
                  <p className="mt-2 text-xs text-green-400/80">
                    Found {skills.filter(s => s.name).length} skills · Review and edit them below before generating
                  </p>
                )}
              </div>
            )}

            {/* Skills */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-3">Your skills</label>
              <div className="space-y-2">
                {skills.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={s.name}
                      onChange={(e) => updateSkill(i, 'name', e.target.value)}
                      placeholder="e.g. React, Python…"
                      maxLength={60}
                      className="flex-1 bg-white/[0.04] border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/50 transition-colors"
                    />
                    <div className="relative">
                      <select
                        value={s.level}
                        onChange={(e) => updateSkill(i, 'level', e.target.value)}
                        className="appearance-none bg-white/[0.04] border border-surface-border rounded-lg pl-3 pr-7 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-500/50 transition-colors cursor-pointer"
                      >
                        {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                    {skills.length > 1 && (
                      <button type="button" onClick={() => removeSkill(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {skills.length < 6 && (
                <button type="button" onClick={addSkill} className="mt-2 flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  <Plus size={12} /> Add skill
                </button>
              )}
            </div>

            {/* Target role */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Target role</label>
              <div className="relative">
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  required
                  className="w-full appearance-none bg-white/[0.04] border border-surface-border rounded-lg pl-3 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors cursor-pointer"
                >
                  <option value="" className="bg-surface-card">Select a role…</option>
                  {ROLES.map(r => <option key={r} value={r} className="bg-surface-card">{r}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Dream company <span className="text-slate-600">(optional)</span>
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Zoho, Infosys, Google…"
                maxLength={100}
                className="w-full bg-white/[0.04] border border-surface-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500/50 transition-colors"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Time available</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_TIMES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTimeAvailable(t); setUseCustomTime(false); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      !useCustomTime && timeAvailable === t
                        ? 'border-brand-500/60 bg-brand-500/15 text-brand-400'
                        : 'border-surface-border text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setUseCustomTime(true); if (customWeeks) setTimeAvailable(`${customWeeks} weeks`); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    useCustomTime
                      ? 'border-brand-500/60 bg-brand-500/15 text-brand-400'
                      : 'border-surface-border text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Custom
                </button>
              </div>
              {useCustomTime && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={customWeeks}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCustomWeeks(v);
                      if (v) setTimeAvailable(`${v} week${v === '1' ? '' : 's'}`);
                    }}
                    placeholder="3"
                    className="w-20 bg-white/[0.04] border border-brand-500/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                  <span className="text-xs text-slate-400">weeks</span>
                  {customWeeks && <span className="text-xs text-brand-400 font-medium">= {timeAvailable}</span>}
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={loading || !skills.some(s => s.name.trim()) || !targetRole}
              className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : 'Generate 5 Projects'}
            </button>
          </form>

          {/* ── RESULTS ── */}
          <div>
            {!projects.length && !loading && (
              <div className="glass-card rounded-2xl p-10 text-center border-dashed">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
                  <Zap size={22} className="text-brand-400" />
                </div>
                <p className="text-sm font-medium text-white mb-1">Your projects will appear here</p>
                <p className="text-xs text-slate-500">Fill in your profile and click Generate</p>
              </div>
            )}

            {loading && (
              <div className="glass-card rounded-2xl p-10 text-center">
                <Loader2 size={28} className="animate-spin text-brand-400 mx-auto mb-4" />
                <p className="text-sm text-white font-medium">Crafting your projects…</p>
                <p className="text-xs text-slate-500 mt-1">This takes about 15–30 seconds</p>
              </div>
            )}

            {projects.length > 0 && (
              <div className="space-y-3">
                {/* Guest notice — generations aren't saved for signed-out users.
                    Honest heads-up + gentle nudge to sign in (opens AuthModal). */}
                {!user && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-brand-500/8 border border-brand-500/20">
                    <span className="text-base leading-none mt-0.5">👋</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      You're browsing as a guest — these ideas won't be saved.{' '}
                      <button
                        onClick={() => setShowAuth(true)}
                        className="text-brand-400 font-medium hover:text-brand-300 underline underline-offset-2 transition-colors"
                      >
                        Sign in
                      </button>{' '}
                      to keep them and claim your free deep dive.
                    </p>
                  </div>
                )}
                {/* Skill gap callout — shown when AI identified missing skills */}
                {skillGap && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                    <span className="text-amber-400 text-base leading-none mt-0.5">⚡</span>
                    <p className="text-xs text-amber-200/80 leading-relaxed">{skillGap}</p>
                  </div>
                )}
                {/* All 5 ideas are free now — the deep dive is the paid product. */}
                {projects.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => handleProjectClick(p, i)}
                    className="glass-card rounded-2xl p-5 hover:border-brand-500/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-brand-400 transition-colors">{p.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${DIFF_COLORS[p.difficulty] || 'text-slate-400 bg-white/5'}`}>
                        {p.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{p.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {p.techStack?.map(t => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-400">{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-surface-border">
                      <p className="text-xs text-slate-500">
                        <span className="text-slate-300">Why it impresses:</span> {p.whyItImpresses}
                      </p>
                      <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                        <span className="text-xs text-slate-600">{p.estimatedTime}</span>
                        <span className="flex items-center gap-1 text-xs text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          Deep dive <ArrowRight size={11} />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Deep-dive CTA — ideas are free; the full build plan is the paid part.
                    Guests sign in to claim their 1 free deep dive; unpaid users unlock the rest for ₹49. */}
                {!user?.isPaid && (
                  !user ? (
                    <div className="text-center py-5 px-4 rounded-2xl border border-dashed border-surface-border">
                      <p className="text-sm font-semibold text-white mb-1">All 5 ideas are free</p>
                      <p className="text-xs text-slate-500 mb-3">Open any project for a full build plan. Sign in to claim your <span className="text-brand-400 font-medium">first deep dive free</span>.</p>
                      <button
                        onClick={() => setShowAuth(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/30"
                      >
                        Sign in — first deep dive free
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-5 px-4 rounded-2xl border border-dashed border-surface-border">
                      <p className="text-sm font-semibold text-white mb-0.5">Your first deep dive is on us</p>
                      <p className="text-xs text-slate-500 mb-1">Each deep dive = a full build plan: setup, step-by-step order, code for the hard parts, mistakes to avoid & interview questions.</p>
                      <UnlockButton label="Unlock all deep dives · ₹49" subtext="One-time · every project, forever" />
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
