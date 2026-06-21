import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, Globe, KeyRound, LogOut, Mail, Shield, SlidersHorizontal, User2, Users, Workflow, Fingerprint, MessageCircleWarning } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import { useLanguage, LANGUAGES } from '@/eru/context/LanguageContext';
import SoundSettings from '@/eru/components/SoundSettings';
import EscrowProfilePanel from '@/eru/components/escrow/EscrowProfilePanel';
import MaskedEmail from '@/eru/components/privacy/MaskedEmail';
import SecretArea from '@/eru/components/privacy/SecretArea';
import DeleteAccountButton from '@/eru/components/settings/DeleteAccountButton';
import { maskEmail } from '@/eru/lib/privacy';

const DEFAULT_PREFS = {
  productUpdates: true,
  marketAlerts: true,
  emailNotifications: false,
  telegramNotifications: true,
};

function getInitials(name = '', email = '') {
  const source = name || email || 'U';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({ icon: Icon, title, description, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-3">
      <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-primary' : 'bg-secondary border border-border'}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function InfoRow({ icon: Icon, title, description, value, action }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-3">
      <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {value && <span className="text-xs text-foreground whitespace-nowrap">{value}</span>}
      {action}
    </div>
  );
}

export default function UserSettings() {
  const { currentUser, logout } = useAuth();
  const { lang, setLang } = useLanguage();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [savingProfile, setSavingProfile] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [roleAssignments, setRoleAssignments] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [profile, setProfile] = useState(() => ({
    displayName: currentUser?.full_name || '',
  }));

  const userEmail = currentUser?.email || '';
  const initials = useMemo(() => getInitials(currentUser?.full_name, currentUser?.email), [currentUser]);
  const activeAssignments = useMemo(() => roleAssignments.filter((item) => item.is_active !== false), [roleAssignments]);
  const effectiveTeamRoles = useMemo(() => activeAssignments.map((assignment) => {
    const matchedRole = customRoles.find((role) => role.id === assignment.custom_role_id);
    return {
      ...assignment,
      permissionCount: matchedRole?.permissions?.length || 0,
      scope: matchedRole?.scope || 'custom',
    };
  }), [activeAssignments, customRoles]);

  useEffect(() => {
    const loadSettingsData = async () => {
      const [apiKeyRows, roleAssignmentRows, customRoleRows] = await Promise.all([
        base44.entities.ApiKey.list('-updated_date', 50).catch(() => []),
        base44.entities.RoleAssignment.list('-assigned_at', 50).catch(() => []),
        base44.entities.CustomRole.list('-created_date', 50).catch(() => []),
      ]);
      setApiKeys(apiKeyRows || []);
      setRoleAssignments(roleAssignmentRows || []);
      setCustomRoles(customRoleRows || []);
    };

    loadSettingsData();
  }, []);

  const handleProfileSave = async () => {
    setSavingProfile(true);
    await base44.auth.updateMe({ display_name: profile.displayName });
    setSavingProfile(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Account</p>
        <h1 className="text-xl font-semibold text-foreground mt-1">User Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile, alerts, language, and connected tools.</p>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-3xl mx-auto">
        <SectionCard title="Profile" subtitle="Update how your account appears across the app.">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/20 p-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-semibold text-primary shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{currentUser?.full_name || 'User'}</p>
              {userEmail ? (
                <MaskedEmail
                  email={userEmail}
                  className="text-xs text-muted-foreground truncate"
                  tooltip="Your email — click the eye to reveal"
                />
              ) : (
                <p className="text-xs text-muted-foreground truncate">No email available</p>
              )}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Display name</span>
            <div className="relative">
              <User2 className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={profile.displayName}
                onChange={(e) => setProfile((prev) => ({ ...prev, displayName: e.target.value }))}
                placeholder="Your display name"
                className="w-full h-11 rounded-xl border border-border bg-card pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={userEmail ? maskEmail(userEmail) : ''}
                disabled
                className="w-full h-11 rounded-xl border border-border bg-secondary/40 pl-10 pr-3 text-sm text-muted-foreground"
              />
            </div>
            <span className="block text-[10px] text-muted-foreground">Hidden for privacy. Reveal it in the Secret Area below.</span>
          </label>

          <button
            onClick={handleProfileSave}
            disabled={savingProfile}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </SectionCard>

        <SectionCard title="Notification preferences" subtitle="Control how you hear from the app across each channel.">
          <div className="space-y-3">
            <ToggleRow icon={Bell} title="Market alerts" description="Price alerts, watchlist changes, and market triggers." checked={prefs.marketAlerts} onChange={(value) => setPrefs((prev) => ({ ...prev, marketAlerts: value }))} />
            <ToggleRow icon={Mail} title="Email notifications" description="Receive summaries and important account messages by email." checked={prefs.emailNotifications} onChange={(value) => setPrefs((prev) => ({ ...prev, emailNotifications: value }))} />
            <ToggleRow icon={Bell} title="In-app notifications" description="Show alerts and reminders inside the app while you work." checked={prefs.productUpdates} onChange={(value) => setPrefs((prev) => ({ ...prev, productUpdates: value }))} />
            <ToggleRow icon={Workflow} title="Telegram notifications" description="Keep bot-linked and mini-app updates active for Telegram use." checked={prefs.telegramNotifications} onChange={(value) => setPrefs((prev) => ({ ...prev, telegramNotifications: value }))} />
            <ToggleRow icon={SlidersHorizontal} title="Product updates" description="Hear about new tools, releases, and feature improvements." checked={prefs.productUpdates} onChange={(value) => setPrefs((prev) => ({ ...prev, productUpdates: value }))} />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-secondary/20 p-3">
              <p className="text-xs font-medium text-foreground">Email</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Account notices and summaries</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/20 p-3">
              <p className="text-xs font-medium text-foreground">In-app</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Real-time alerts in your workspace</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/20 p-3">
              <p className="text-xs font-medium text-foreground">Telegram</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Bot and mini-app delivery channel</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="External service API keys" subtitle="Review your generated keys for external services and API-based access.">
          <div className="space-y-2">
            <InfoRow
              icon={KeyRound}
              title="Active API keys"
              description="Keys you have already created for external tools and service access."
              value={`${apiKeys.filter((item) => item.status !== 'revoked').length}`}
              action={<Link to="/apikeys" className="text-xs font-medium text-primary whitespace-nowrap">Manage</Link>}
            />
            {apiKeys.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-3 text-xs text-muted-foreground">
                No API keys found yet. Create and rotate them from the API keys area.
              </div>
            ) : (
              apiKeys.slice(0, 4).map((key) => (
                <div key={key.id} className="rounded-xl border border-border bg-secondary/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{key.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{key.key_prefix || 'Hidden key'} • {(key.permissions || []).length} permissions</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${key.status === 'revoked' ? 'bg-red-400/10 text-red-400' : 'bg-primary/10 text-primary'}`}>
                      {key.status || 'active'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Team permissions" subtitle="View role-based access for team members when collaboration is enabled.">
          <div className="space-y-2">
            <InfoRow
              icon={Users}
              title="Active role assignments"
              description="Current team member roles and permission levels assigned in the workspace."
              value={`${effectiveTeamRoles.length}`}
              action={<Link to="/role-management" className="text-xs font-medium text-primary whitespace-nowrap">Open</Link>}
            />
            {effectiveTeamRoles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-3 text-xs text-muted-foreground">
                No team role assignments are active for this account right now.
              </div>
            ) : (
              effectiveTeamRoles.slice(0, 4).map((assignment) => (
                <div key={assignment.id} className="rounded-xl border border-border bg-secondary/20 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <MaskedEmail
                        email={assignment.user_email}
                        className="text-sm font-medium text-foreground truncate"
                      />
                      <p className="text-xs text-muted-foreground">{assignment.role_name} • {assignment.permissionCount} permissions • {assignment.scope} scope</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                      active
                    </span>
                  </div>
                </div>
              ))
            )}
            <div className="rounded-xl border border-border bg-secondary/10 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <MessageCircleWarning className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>Granular team permission editing stays in Role Management so account settings remain simple and safe.</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Language" subtitle="Choose the language used throughout the app.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`h-11 rounded-xl border text-sm font-medium transition-colors ${lang === code ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/30'}`}
              >
                {name}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Secret Area" subtitle="Sensitive account details, hidden behind a PIN. Set or unlock it to reveal.">
          <SecretArea
            title="Sensitive account info"
            description="Your full email and account identifiers are hidden by default. Unlock with your PIN to view."
          >
            <div className="space-y-2">
              <div className="rounded-xl border border-border bg-secondary/20 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Account email</p>
                <p className="mt-1 text-sm font-medium text-foreground break-all">{userEmail || 'Unavailable'}</p>
              </div>
              {currentUser?.full_name && (
                <div className="rounded-xl border border-border bg-secondary/20 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Full name</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{currentUser.full_name}</p>
                </div>
              )}
              {currentUser?.id && (
                <div className="rounded-xl border border-border bg-secondary/20 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Account ID</p>
                  <p className="mt-1 font-mono text-xs text-foreground break-all">{currentUser.id}</p>
                </div>
              )}
            </div>
          </SecretArea>
        </SectionCard>

        <EscrowProfilePanel userEmail={userEmail} />

        <SectionCard title="Integrations" subtitle="Access connected tools and app-linked services.">
          <div className="space-y-2">
            <Link to="/tgapps" className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-3 hover:bg-secondary/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Workflow className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Telegram integrations</p>
                <p className="text-xs text-muted-foreground">Manage bot-linked app connections and deployment tools.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link to="/settings" className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-3 hover:bg-secondary/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">System settings</p>
                <p className="text-xs text-muted-foreground">Open advanced app, privacy, visual, and admin controls.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Security & experience" subtitle="Quick access to the tools most users need often.">
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to="/performance" className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-3 hover:bg-secondary/40 transition-colors">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">Performance</span>
            </Link>
            <Link to="/compliance" className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-3 hover:bg-secondary/40 transition-colors">
              <Fingerprint className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">Privacy & compliance</span>
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-3">
            <SoundSettings />
          </div>
        </SectionCard>

        <button
          onClick={() => logout(true)}
          className="w-full h-11 rounded-xl border border-red-400/20 text-red-400 text-sm font-medium hover:bg-red-400/5 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>

        {/* Delete account — destructive, gated by ConfirmDialog inside the
            DeleteAccountButton component. Calls the existing deleteMyData
            backend function and signs the user out on success. */}
        <SectionCard title="Delete account" subtitle="Permanently remove your account and all associated data. This cannot be undone.">
          <DeleteAccountButton />
        </SectionCard>
      </div>
    </div>
  );
}