import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, RefreshCw, ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, Lock, FlaskConical } from 'lucide-react';
import PermissionGate from '@/eru/components/PermissionGate';
import TruthState from '@/eru/components/TruthState';
import { isAdmin, isOwner } from '@/eru/lib/permissions';
import { useAuth } from '@/eru/lib/AuthContext';
import { runAllChecks, summarize } from '@/eru/lib/securityChecks';

/**
 * Owner Security Command Center
 * ----------------------------------------------------------------------------
 * Owner/admin-only readiness dashboard. Aggregates honest signals from
 * lib/securityChecks.js — never claims security the frontend cannot verify.
 * Anything that depends on server/RLS/payment-provider/chain enforcement is
 * surfaced as Backend Rule Required so the owner sees the real gap.
 *
 * Complements (does NOT replace):
 *   - /security-dashboard       — live SecurityAuditLog feed
 *   - /admin/review             — portal/storefront moderation queue
 * --------------------------------------------------------------------------*/
export default function SecurityCommandCenter() {
  return (
    <PermissionGate
      allow={isAdmin}
      deniedTitle="Owner / admin only"
      deniedMessage="The Security Command Center is restricted."
    >
      <CommandCenterInner />
    </PermissionGate>
  );
}

function CommandCenterInner() {
  const { user } = useAuth();
  const ownerMode = isOwner(user);
  const [tick, setTick] = useState(0);

  // Re-run on mount and on manual refresh.
  // Checks are pure/sync so this is cheap.
  useEffect(() => { setTick((t) => t + 1); }, []);

  const checks = useMemo(() => runAllChecks(), [tick]);
  const summary = useMemo(() => summarize(checks), [checks]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header onRefresh={() => setTick((t) => t + 1)} />

      <div className="p-4 space-y-4">
        <ScoreCard summary={summary} />
        {ownerMode && <TestRunnerCallout />}
        <QuickLinks />

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Posture checks</h2>
          <div className="space-y-2">
            {checks.map((c) => <CheckRow key={c.id} check={c} />)}
          </div>
        </section>

        <ChecklistCard summary={summary} />

        <p className="text-[10px] text-muted-foreground/70 px-1 leading-relaxed">
          The frontend cannot verify server-side enforcement. Items marked <span className="text-yellow-300">Backend Rule Required</span> need entity RLS, webhook signing, or chain/wallet verification configured server-side.
        </p>
      </div>
    </div>
  );
}

function Header({ onRefresh }) {
  return (
    <div className="sticky top-0 z-10 px-4 py-3 border-b border-border bg-card/85 backdrop-blur-sm flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
          <Shield className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">Security Command Center</h1>
          <p className="text-[11px] text-muted-foreground truncate">Readiness posture · admin only</p>
        </div>
      </div>
      <button
        onClick={onRefresh}
        className="p-1.5 rounded-lg bg-secondary hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Refresh checks"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ScoreCard({ summary }) {
  // Cap at 8.0 until backend RLS / webhooks / chain ownership are formally
  // reviewed. Surface this honestly instead of overstating posture.
  const verifiedScore = Math.min(summary.score, 8.0);
  const tone = verifiedScore >= 8 ? 'ok' : verifiedScore >= 5 ? 'warn' : 'fail';
  const ring = tone === 'ok' ? 'ring-primary/30' : tone === 'warn' ? 'ring-yellow-400/30' : 'ring-destructive/30';
  const text = tone === 'ok' ? 'text-primary' : tone === 'warn' ? 'text-yellow-300' : 'text-destructive';

  return (
    <div className={`rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-4 ring-1 ${ring}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Frontend posture score</p>
          <p className={`text-3xl font-bold ${text}`}>{verifiedScore.toFixed(1)}<span className="text-sm font-medium text-muted-foreground"> / 10</span></p>
          <p className="text-[11px] text-muted-foreground mt-1">Capped at 8.0 — 9/10 requires verified backend RLS, payment webhooks, and chain ownership.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
          <Stat label="OK" value={summary.ok} tone="ok" />
          <Stat label="Warn" value={summary.warn} tone="warn" />
          <Stat label="Fail" value={summary.fail} tone="fail" />
          <Stat label="Backend" value={summary.backendRules} tone="info" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const cls = tone === 'ok' ? 'text-primary'
    : tone === 'warn' ? 'text-yellow-300'
    : tone === 'fail' ? 'text-destructive'
    : 'text-blue-300';
  return (
    <div className="rounded-xl border border-border bg-secondary/50 px-2 py-1.5">
      <p className={`text-base font-semibold ${cls}`}>{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

function TestRunnerCallout() {
  return (
    <Link
      to="/admin/security-test"
      className="block rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors p-3"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
          <FlaskConical className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Permission Attack Simulator</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Owner-only · runs simulated route, action, ownership, embed and confirmation tests across 8 roles. Read-only.
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </Link>
  );
}

function QuickLinks() {
  const links = [
    { to: '/admin/review', label: 'Admin Review Center', desc: 'Portals, moderation, audit ring' },
    { to: '/security-dashboard', label: 'Live audit log', desc: 'SecurityAuditLog feed' },
    { to: '/role-management', label: 'Role management', desc: 'Custom roles & assignments' },
    { to: '/audit', label: 'Activity audit log', desc: 'Recent platform activity' },
  ];
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="rounded-2xl border border-border bg-card/60 hover:bg-card/90 transition-colors p-3 flex items-center gap-3"
        >
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{l.label}</p>
            <p className="text-[11px] text-muted-foreground truncate">{l.desc}</p>
          </div>
        </Link>
      ))}
    </section>
  );
}

function CheckRow({ check }) {
  const Icon = check.status === 'ok' ? CheckCircle2 : check.status === 'warn' ? AlertTriangle : AlertCircle;
  const tone = check.status === 'ok' ? 'text-primary'
    : check.status === 'warn' ? 'text-yellow-300'
    : 'text-destructive';
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3">
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tone}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{check.label}</p>
            {check.rule === 'backend-rule-required' && <TruthState kind="backend-rule-required" />}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{check.note}</p>
          {check.ruleNote && (
            <p className="text-[11px] text-yellow-300/80 mt-1 leading-relaxed">{check.ruleNote}</p>
          )}
          {Array.isArray(check.detail) && check.detail.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground/80 font-mono">
              {check.detail.map((d, i) => <li key={i}>· {d}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistCard({ summary }) {
  const items = [
    { label: 'Role helpers centralized', done: true },
    { label: 'Route guards in place', done: true },
    { label: 'Ownership checks on listings/storefronts', done: true },
    { label: 'Confirmation dialog primitive', done: true },
    { label: 'Demo data labelled (TruthState / banners)', done: true },
    { label: 'External embed safety + fallback', done: true },
    { label: 'Sticky ticker+nav shell', done: true },
    { label: 'Server-side RLS validated end-to-end', done: false, hint: 'Backend rule — review entity RLS in dashboard.' },
    { label: 'Payment webhook signatures verified', done: false, hint: 'Backend rule — required before going live.' },
    { label: 'Wallet/NFT ownership verified server-side', done: false, hint: 'Backend rule — chain verification.' },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Final checklist</p>
      {items.map((it) => (
        <div key={it.label} className="flex items-start gap-2 text-xs">
          {it.done
            ? <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
            : <Lock className="w-3.5 h-3.5 text-yellow-300 mt-0.5 flex-shrink-0" />}
          <div className="min-w-0">
            <p className={`leading-relaxed ${it.done ? 'text-foreground' : 'text-yellow-300/90'}`}>{it.label}</p>
            {it.hint && <p className="text-[10px] text-muted-foreground/70">{it.hint}</p>}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground/70 pt-1">{summary.ok} OK · {summary.warn} warn · {summary.fail} fail · {summary.backendRules} backend rules</p>
    </div>
  );
}