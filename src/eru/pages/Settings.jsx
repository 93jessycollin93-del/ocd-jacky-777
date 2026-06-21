import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Bell, ChevronRight, Lock, AlertTriangle, ExternalLink,
  Blocks, Fingerprint, Activity, ClipboardList, Volume2, Scale, Send, Globe,
  Copy, CheckCircle2, Sparkles, SlidersHorizontal, User2,
} from 'lucide-react';
import BiometricAuth from '../components/BiometricAuth';
import SoundSettings from '../components/SoundSettings';
import TelegramSettings from '../components/TelegramSettings';
import EscrowProfilePanel from '@/eru/components/escrow/EscrowProfilePanel';
import DeleteAccountButton from '@/eru/components/settings/DeleteAccountButton';
import ZeroFakeDataPolicyCard from '@/eru/components/pricing/ZeroFakeDataPolicyCard';
import ZeroFakeDataModeToggle from '@/eru/components/pricing/ZeroFakeDataModeToggle';
import { getZeroFakeDataMode } from '@/eru/lib/zeroFakeData';
import { useAuth } from '@/eru/lib/AuthContext';
import { useLanguage, LANGUAGES } from '@/eru/context/LanguageContext';

/**
 * Settings
 * ----------------------------------------------------------------------------
 * Reorganized for clarity. ALL theme / visual / typography / motion /
 * background / layout-density controls are owned by /visual (Visual Engine).
 * This page focuses on:
 *   1. Account shortcut          → /user-settings, /preferences
 *   2. Appearance entry point    → /visual
 *   3. Language                  (live)
 *   4. Security & privacy        (legal docs, biometric, audit, compliance)
 *   5. Sound & haptics           (inline)
 *   6. Telegram                  (inline sheet)
 *   7. Domain (advanced)         (inline)
 *   8. Admin tools               (admin role only)
 *
 * Removed: SECTIONS placeholder rows that linked nowhere, the embedded
 * Base44ThemeEditor (now reachable via Visual Engine), and the duplicate
 * "Risk Warning" tile (already inside Legal Documents → Non-Liability).
 */

// ─── Domain card (kept — works inline, no theme dep) ─────────────────────────
function DomainRecordRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-xs text-foreground">{value}</p>
      </div>
      <button onClick={handleCopy} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground">
        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function DomainSettingsCard() {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const cleanedDomain = useMemo(() => domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''), [domain]);
  const hostLabel = useMemo(() => {
    if (!cleanedDomain) return 'www';
    if (cleanedDomain.startsWith('www.')) return 'www';
    const parts = cleanedDomain.split('.');
    return parts.length > 2 ? parts[0] : 'www';
  }, [cleanedDomain]);
  const isSubdomain = useMemo(() => cleanedDomain.split('.').filter(Boolean).length > 2 && !cleanedDomain.startsWith('www.'), [cleanedDomain]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full flex items-center px-4 py-3.5 gap-3 hover:bg-secondary/40 transition-colors">
        <Globe className="w-4 h-4 text-muted-foreground" />
        <span className="flex-1 text-sm text-left">Custom domain</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
          <Globe className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Custom Domain</p>
          <p className="mt-1 text-xs text-muted-foreground">Connect your own domain and point it to your hosted site with the DNS records below.</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground">Close</button>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Your domain</label>
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com or app.example.com"
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none"
        />
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground">DNS setup</p>
        {isSubdomain ? (
          <>
            <DomainRecordRow label="Type" value="CNAME" />
            <DomainRecordRow label="Name / Host" value={hostLabel} />
            <DomainRecordRow label="Value / Target" value="base44.onrender.com" />
          </>
        ) : (
          <>
            <DomainRecordRow label="Root domain (@)" value="Use ANAME or ALIAS to base44.onrender.com if your DNS provider supports it" />
            <DomainRecordRow label="Fallback A record" value="216.24.57.1" />
            <DomainRecordRow label="www CNAME" value="www → base44.onrender.com" />
          </>
        )}
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-[11px] text-muted-foreground">
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <p>DNS changes can take up to 48–72 hours to fully propagate. SSL is issued automatically after verification.</p>
      </div>
    </div>
  );
}

// ─── Legal docs sheet (kept) ─────────────────────────────────────────────────
function LegalDocsSheet({ onClose }) {
  const [tab, setTab] = useState('disclaimer');
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <button onClick={onClose} className="text-muted-foreground text-sm">← Back</button>
        <h3 className="font-medium text-sm">Legal Documents</h3>
        <span/>
      </div>
      <div className="flex border-b border-border overflow-x-auto">
        {['disclaimer','terms','privacy','tax'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-xs font-medium capitalize whitespace-nowrap ${tab===t?'text-primary border-b-2 border-primary':'text-muted-foreground'}`}>
            {t === 'disclaimer' ? 'Non-Liability' : t === 'tax' ? 'Tax Notice' : t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-muted-foreground leading-relaxed space-y-4">
        {tab === 'disclaimer' && <>
          <h4 className="text-foreground font-semibold">Non-Liability Disclaimer</h4>
          <p>This platform does not provide financial, investment, or legal advice. All trading and investment decisions are made solely by the user and at their own risk. Past performance of any asset does not guarantee future results.</p>
          <p>The platform is not responsible for any losses, damages, or adverse outcomes resulting from the use of this service. Cryptocurrency markets are highly volatile and speculative. You may lose some or all of your invested capital.</p>
          <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0"/>
            <p className="text-xs">Trading involves significant risk. Only invest what you can afford to lose.</p>
          </div>
        </>}
        {tab === 'terms' && <>
          <h4 className="text-foreground font-semibold">Terms of Use</h4>
          <p>By using this platform, you agree to comply with all applicable laws and regulations in your jurisdiction. Misuse of the platform, including fraudulent transactions or market manipulation, is strictly prohibited and may result in account suspension.</p>
          <p>We reserve the right to update these terms at any time. Continued use of the platform following updates constitutes acceptance of the revised terms.</p>
        </>}
        {tab === 'privacy' && <>
          <h4 className="text-foreground font-semibold">Privacy Policy</h4>
          <p>We collect only the information necessary to provide our services. We do not sell your personal data to third parties. All data is encrypted in transit and at rest.</p>
          <p>Transaction data is retained for regulatory compliance purposes. You may request export or deletion of your personal data at any time.</p>
        </>}
        {tab === 'tax' && <>
          <h4 className="text-foreground font-semibold">Tax Disclaimer</h4>
          <p>Users are solely responsible for reporting and paying any applicable taxes on gains from cryptocurrency trading, NFT sales, or other transactions conducted on this platform.</p>
          <p>We provide transaction history export to assist with tax reporting, but this does not constitute tax advice. Consult a qualified tax professional in your jurisdiction.</p>
        </>}
        <p className="text-xs text-muted-foreground/50 border-t border-border pt-4">Last updated: April 2026 · All documents are tied to your account and timestamped.</p>
      </div>
    </div>
  );
}

function TelegramSheet({ onClose }) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <button onClick={onClose} className="text-muted-foreground text-sm">← Back</button>
        <h3 className="font-medium text-sm">Telegram</h3>
        <span/>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <TelegramSettings />
      </div>
    </div>
  );
}

// ─── Reusable row primitive ──────────────────────────────────────────────────
function Row({ icon: Icon, label, sublabel, badge, badgeTone = 'default', to, onClick, accent }) {
  const tone = {
    default: 'text-muted-foreground bg-secondary',
    primary: 'text-primary bg-primary/10 border border-primary/20',
    warn: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20',
  }[badgeTone];
  const content = (
    <>
      <Icon className={`w-4 h-4 ${accent || 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm text-foreground truncate">{label}</p>
        {sublabel && <p className="text-[11px] text-muted-foreground truncate">{sublabel}</p>}
      </div>
      {badge && <span className={`text-[10px] px-2 py-0.5 rounded-full ${tone}`}>{badge}</span>}
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </>
  );
  const className = "w-full flex items-center px-4 py-3.5 gap-3 hover:bg-secondary/40 transition-colors";
  if (to) return <Link to={to} className={className}>{content}</Link>;
  return <button onClick={onClick} className={className}>{content}</button>;
}

function GroupCard({ title, children }) {
  return (
    <section className="space-y-2">
      {title && <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-1">{title}</p>}
      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {children}
      </div>
    </section>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { lang, setLang, t } = useLanguage();
  const { currentUser } = useAuth();
  const [sheet, setSheet] = useState(null);
  const [biometricOpen, setBiometricOpen] = useState(false);
  const [biometricAction, setBiometricAction] = useState('');
  const [showSoundSettings, setShowSoundSettings] = useState(false);

  const requireBiometric = (action, fn) => {
    setBiometricAction(action);
    setBiometricOpen(true);
    window._biometricCallback = fn;
  };

  if (sheet === 'legal') return <LegalDocsSheet onClose={() => setSheet(null)} />;
  if (sheet === 'telegram') return <TelegramSheet onClose={() => setSheet(null)} />;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <h2 className="text-lg font-semibold">{t('settings.title', undefined, 'Settings')}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Account, language, security, and shortcuts. Visual styling lives in the Visual Engine.</p>
      </div>

      <div className="px-4 py-4 space-y-5 max-w-2xl mx-auto w-full">
        {/* Pricing trust policy — visible to every user */}
        <ZeroFakeDataPolicyCard mode={getZeroFakeDataMode()} expand />
        <ZeroFakeDataModeToggle user={currentUser} />

        {/* Account */}
        <GroupCard title="Account">
          <Row icon={User2} label="User Settings" sublabel="Profile, alerts, and integrations" to="/user-settings" accent="text-primary" />
          <Row icon={SlidersHorizontal} label="Preferences" sublabel="Display, saved content, payment defaults" to="/preferences" />
        </GroupCard>

        {/* Appearance — single entry point to Visual Engine */}
        <GroupCard title="Appearance">
          <Row
            icon={Sparkles}
            label="Visual Engine"
            sublabel="Themes, colors, backgrounds, motion, typography, layout"
            to="/visual"
            badge="Open"
            badgeTone="primary"
            accent="text-primary"
          />
        </GroupCard>

        {/* Language */}
        <section className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-1">{t('settings.language', undefined, 'Language')}</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  lang === code
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/30'
                }`}>
                {name}
              </button>
            ))}
          </div>
          <Link to="/language-diagnostics" className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors text-xs">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span className="flex-1 text-left">{t('settings.translationDiagnostics', undefined, 'Translation diagnostics')}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
        </section>

        {/* Security & Privacy */}
        <GroupCard title="Security & Privacy">
          <Row
            icon={Fingerprint}
            label="Biometric authentication"
            badge="FaceID / Touch"
            badgeTone="primary"
            onClick={() => requireBiometric('wallet access', () => {})}
            accent="text-primary"
          />
          <Row icon={ClipboardList} label="Activity audit log" to="/audit" />
          <Row icon={Activity} label="Performance monitor" to="/performance" />
          <Row icon={Scale} label="Compliance & privacy" to="/compliance" />
          <Row icon={FileText} label="Legal documents" sublabel="Disclaimer, Terms, Privacy, Tax" onClick={() => setSheet('legal')} />
          <Row icon={Lock} label="Session timeout" badge="15 min" />
        </GroupCard>

        {/* Notifications & Telegram */}
        <GroupCard title="Notifications & Channels">
          <Row icon={Bell} label="Notification preferences" sublabel="Manage alerts in User Settings" to="/user-settings" />
          <Row icon={Send} label="Telegram integration" sublabel="Link account, bot tokens, deployment" onClick={() => setSheet('telegram')} accent="text-primary" />
          <Row icon={Send} label="Telegram deployment hub" to="/tgapps" />
        </GroupCard>

        {/* Sound & Haptics — inline, expandable */}
        <section className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-1">Sound & Haptics</p>
          {showSoundSettings ? (
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Sound Settings</span>
                </div>
                <button onClick={() => setShowSoundSettings(false)} className="text-xs text-muted-foreground">Done</button>
              </div>
              <SoundSettings />
            </div>
          ) : (
            <button
              onClick={() => setShowSoundSettings(true)}
              className="w-full flex items-center px-4 py-3.5 gap-3 bg-card border border-border rounded-2xl hover:bg-secondary/40 transition-colors"
            >
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-left">Sound & haptics</span>
              <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">3 packs</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </section>

        {/* Advanced */}
        <GroupCard title="Advanced">
          <DomainSettingsCard />
        </GroupCard>

        {/* Escrow profile (kept — useful summary) */}
        <EscrowProfilePanel userEmail={currentUser?.email || ''} compact />

        {/* Admin */}
        {currentUser?.role === 'admin' && (
          <GroupCard title="Admin">
            <Row icon={Blocks} label="Blockchain admin panel" to="/admin/blockchain" accent="text-primary" />
            <Row icon={Activity} label="Security audit log" to="/security-dashboard" accent="text-orange-500" />
          </GroupCard>
        )}

        <button className="w-full py-3 text-red-400 text-sm font-medium border border-red-400/20 rounded-xl hover:bg-red-400/5 transition-colors">
          {t('security.signOut', undefined, 'Sign Out')}
        </button>

        {/* Danger zone — permanent account + data deletion */}
        <div className="pt-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-1 mb-2">Danger zone</p>
          <DeleteAccountButton />
        </div>
      </div>

      <BiometricAuth
        open={biometricOpen}
        onClose={() => setBiometricOpen(false)}
        onSuccess={() => { window._biometricCallback?.(); }}
        action={biometricAction}
        userEmail={currentUser?.email}
      />
    </div>
  );
}