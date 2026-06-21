import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Plus, Save, UserRound, X } from 'lucide-react';

export const VOICES = [
  { id: 'default', name: 'Jackie', emoji: '🤖', desc: 'Balanced & smart', style: 'Be clear, helpful, and direct.' },
  { id: 'sage', name: 'Sage', emoji: '🧘', desc: 'Wise & philosophical', style: 'Be thoughtful, use analogies, speak with depth and wisdom.' },
  { id: 'hacker', name: 'Hacker', emoji: '💻', desc: 'Technical & blunt', style: 'Be extremely technical, terse, use code first. No fluff.' },
  { id: 'mentor', name: 'Mentor', emoji: '🎓', desc: 'Warm & encouraging', style: 'Be warm, encouraging, break things down patiently like a great teacher.' },
  { id: 'analyst', name: 'Analyst', emoji: '📊', desc: 'Data-driven & precise', style: 'Be data-driven. Use structure, bullet points, and logical frameworks.' },
  { id: 'creator', name: 'Creator', emoji: '✨', desc: 'Creative & energetic', style: 'Be imaginative, enthusiastic, and push creative boundaries.' },
  { id: 'strategist', name: 'Strat', emoji: '♟️', desc: 'Strategic & calculated', style: 'Think long-term. Break every answer into strategy, tactics, and execution.' },
  { id: 'operator', name: 'Operator', emoji: '🛠️', desc: 'Execution-focused', style: 'Be practical, action-oriented, and focused on execution steps.' },
  { id: 'visionary', name: 'Visionary', emoji: '🚀', desc: 'Big-picture thinker', style: 'Think boldly, zoom out, and connect ideas into ambitious direction.' },
  { id: 'scientist', name: 'Scientist', emoji: '🧪', desc: 'Evidence-first', style: 'Be methodical, skeptical, and evidence-based in your reasoning.' },
  { id: 'negotiator', name: 'Negotiator', emoji: '🤝', desc: 'Diplomatic & persuasive', style: 'Be tactful, persuasive, and balanced when presenting options.' },
  { id: 'coach', name: 'Coach', emoji: '🏆', desc: 'Motivating & sharp', style: 'Be motivating, direct, and focused on progress and accountability.' },
];

const STORAGE_KEY = 'jackie_custom_profiles_v1';

function loadProfiles() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function VoiceSelector({ voice, setVoice }) {
  const [open, setOpen] = useState(false);
  const [customProfiles, setCustomProfiles] = useState([]);
  const [showCreator, setShowCreator] = useState(false);
  const [draft, setDraft] = useState({ name: '', emoji: '🪄', desc: '', style: '' });

  useEffect(() => {
    setCustomProfiles(loadProfiles());
  }, []);

  const allVoices = useMemo(() => [...VOICES, ...customProfiles], [customProfiles]);
  const current = allVoices.find((item) => item.id === voice) || allVoices[0];

  const saveProfiles = (next) => {
    setCustomProfiles(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleCreateProfile = () => {
    if (!draft.name.trim() || !draft.style.trim()) return;
    const profile = {
      id: `custom_${Date.now()}`,
      name: draft.name.trim(),
      emoji: draft.emoji.trim() || '🪄',
      desc: draft.desc.trim() || 'Custom Jackie persona',
      style: draft.style.trim(),
    };
    const next = [profile, ...customProfiles];
    saveProfiles(next);
    setVoice(profile.id);
    setDraft({ name: '', emoji: '🪄', desc: '', style: '' });
    setShowCreator(false);
  };

  const deleteProfile = (profileId) => {
    const next = customProfiles.filter((item) => item.id !== profileId);
    saveProfiles(next);
    if (voice === profileId) {
      setVoice('default');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-secondary border border-border text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-all"
      >
        <span>{current.emoji}</span>
        <span className="font-medium">{current.name}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-[19rem] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-xl z-[120] overflow-hidden">
          <div className="px-3 py-3 border-b border-border bg-card">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-foreground">Jackie Personas</p>
              <button
                onClick={() => setShowCreator((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary"
              >
                <Plus className="w-3 h-3" /> New profile
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {allVoices.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setVoice(item.id);
                    setOpen(false);
                  }}
                  className={`min-w-[112px] rounded-xl border px-3 py-2 text-left transition-colors ${voice === item.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{item.emoji}</span>
                    <span className={`text-xs font-semibold ${voice === item.id ? 'text-primary' : 'text-foreground'}`}>{item.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {showCreator && (
            <div className="p-3 border-b border-border bg-secondary/20 space-y-2">
              <div className="grid grid-cols-[72px_1fr] gap-2">
                <input
                  value={draft.emoji}
                  onChange={(e) => setDraft((prev) => ({ ...prev, emoji: e.target.value }))}
                  placeholder="✨"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                />
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Profile name"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>
              <input
                value={draft.desc}
                onChange={(e) => setDraft((prev) => ({ ...prev, desc: e.target.value }))}
                placeholder="Short description"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
              <textarea
                value={draft.style}
                onChange={(e) => setDraft((prev) => ({ ...prev, style: e.target.value }))}
                placeholder="How should Jackie respond in this profile?"
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none resize-none"
              />
              <button
                onClick={handleCreateProfile}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                <Save className="w-3.5 h-3.5" /> Save profile
              </button>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {allVoices.map((item) => {
              const isCustom = item.id.startsWith('custom_');
              return (
                <div key={item.id} className="border-b border-border last:border-b-0">
                  <button
                    onClick={() => {
                      setVoice(item.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-secondary ${voice === item.id ? 'bg-primary/10' : ''}`}
                  >
                    <span className="text-base leading-none">{item.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-semibold ${voice === item.id ? 'text-primary' : 'text-foreground'}`}>{item.name}</p>
                        {isCustom && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[9px] text-muted-foreground"><UserRound className="w-2.5 h-2.5" /> Saved</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                    {isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProfile(item.id);
                        }}
                        className="rounded-lg border border-border bg-background p-1 text-muted-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {voice === item.id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}