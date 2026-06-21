import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Play, Filter, Download, Copy, ShieldCheck, CheckCircle2,
  XCircle, AlertTriangle, Database, Wrench, Eye,
} from 'lucide-react';
import PermissionGate from '@/eru/components/PermissionGate';
import TruthState from '@/eru/components/TruthState';
import { isOwner, isAdmin } from '@/eru/lib/permissions';
import {
  CATEGORIES, STATUS,
  runAllTests, summarize, summarizeByCategory, backendConfidence,
} from '@/eru/lib/securityTestRunner';
import { useAuth } from '@/eru/lib/AuthContext';

/**
 * Owner-only Security Test Runner / Permission Attack Simulator
 * ----------------------------------------------------------------------------
 * Pure simulation. Calls existing permission helpers across 8 simulated roles
 * × 7 categories. NO destructive operations. NO secrets. Admins see a
 * read-only summary; only owners can run the full suite + export reports.
 * --------------------------------------------------------------------------*/

const STATUS_META = {
  [STATUS.PASS]:              { label: 'Pass',                       icon: CheckCircle2, tone: 'ok' },
  [STATUS.FAIL]:              { label: 'Fail',                       icon: XCircle,      tone: 'fail' },
  [STATUS.WARN]:              { label: 'Warning',                    icon: AlertTriangle,tone: 'warn' },
  [STATUS.NEEDS_BACKEND]:     { label: 'Needs Backend Rule',         icon: Database,     tone: 'info' },
  [STATUS.NEEDS_INTEGRATION]: { label: 'Needs Integration',          icon: Wrench,       tone: 'info' },
  [STATUS.MANUAL]:            { label: 'Manual Verification',        icon: Eye,          tone: 'muted' },
};

const TONE = {
  ok:    'border-primary/30 bg-primary/10 text-primary',
  fail:  'border-destructive/40 bg-destructive/10 text-destructive',
  warn:  'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
  info:  'border-blue-400/30 bg-blue-400/10 text-blue-300',
  muted: 'border-border bg-secondary text-muted-foreground',
};

export default function SecurityTestRunnerPage() {
  return (
    <PermissionGate
      allow={(u) => isAdmin(u)}
      deniedTitle="Owner / admin only"
      deniedMessage="The Security Test Runner is restricted."
    >
      <RunnerInner />
    </PermissionGate>
  );
}

function RunnerInner() {
  const { user } = useAuth();
  const ownerMode = isOwner(user);
  const [hasRun, setHasRun] = useState(false);
  const [results, setResults] = useState([]);
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [copied, setCopied] = useState(false);

  const runTests = () => {
    const out = runAllTests();
    setResults(out);
    setHasRun(true);
  };

  const total = useMemo(() => summarize(results), [results]);
  const byCat = useMemo(() => summarizeByCategory(results), [results]);
  const backend = useMemo(() => backendConfidence(results), [results]);

  const filtered = useMemo(() => {
    return results.filter((r) =>
      (filterCat === 'all' || r.category === filterCat) &&
      (filterStatus === 'all' || r.status === filterStatus) &&
      (filterRole === 'all' || r.role === filterRole),
    );
  }, [results, filterCat, filterStatus, filterRole]);

  const roleOptions = useMemo(() => {
    const set = new Set(results.map((r) => r.role));
    return Array.from(set);
  }, [results]);

  const handleCopyReport = async () => {
    const report = {
      generated_at: new Date().toISOString(),
      generated_by: user?.email || null,
      score: total.score,
      counts: total.counts,
      backend_confidence: backend,
      categories: byCat,
      results,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleDownloadReport = () => {
    const report = {
      generated_at: new Date().toISOString(),
      generated_by: user?.email || null,
      score: total.score,
      counts: total.counts,
      backend_confidence: backend,
      categories: byCat,
      results,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eru-security-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header ownerMode={ownerMode} />

      <div className="p-4 space-y-4">
        {!hasRun ? (
          <EmptyState ownerMode={ownerMode} onRun={runTests} />
        ) : (
          <>
            <ScoreCards total={total} byCat={byCat} backend={backend} />

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/60 p-3">
              <button
                onClick={runTests}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5" /> Re-run
              </button>
              <FilterPill icon={Filter} label="Category" value={filterCat} onChange={setFilterCat}
                options={[{ id: 'all', label: 'All' }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label }))]} />
              <FilterPill icon={Filter} label="Status" value={filterStatus} onChange={setFilterStatus}
                options={[
                  { id: 'all', label: 'All' },
                  ...Object.entries(STATUS_META).map(([id, m]) => ({ id, label: m.label })),
                ]} />
              <FilterPill icon={Filter} label="Role" value={filterRole} onChange={setFilterRole}
                options={[{ id: 'all', label: 'All roles' }, ...roleOptions.map((r) => ({ id: r, label: r }))]} />
              {ownerMode && (
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={handleCopyReport}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                    <Copy className="w-3 h-3" /> {copied ? 'Copied' : 'Copy JSON'}
                  </button>
                  <button onClick={handleDownloadReport}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                    <Download className="w-3 h-3" /> Export
                  </button>
                </div>
              )}
            </div>

            <ResultsTable rows={filtered} />

            <NotesCard />
          </>
        )}
      </div>
    </div>
  );
}

function Header({ ownerMode }) {
  return (
    <div className="sticky top-0 z-10 px-4 py-3 border-b border-border bg-card/85 backdrop-blur-sm flex items-center gap-3">
      <Link to="/admin/security" className="p-1.5 rounded-lg bg-secondary hover:bg-border transition-colors" aria-label="Back">
        <ArrowLeft className="w-4 h-4 text-muted-foreground" />
      </Link>
      <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
        <ShieldCheck className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-semibold text-foreground truncate">Security Test Runner</h1>
        <p className="text-[11px] text-muted-foreground truncate">
          Permission attack simulator · {ownerMode ? 'owner mode' : 'admin read-only'}
        </p>
      </div>
      {!ownerMode && <TruthState kind="admin-only" />}
    </div>
  );
}

function EmptyState({ ownerMode, onRun }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-6 text-center space-y-4">
      <div className="h-12 w-12 mx-auto rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
        <ShieldCheck className="w-5 h-5" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">Simulated permission test suite</p>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
          Runs read-only checks against the existing permission helpers across 8 roles and 7 categories.
          No data is written, no destructive operations are performed.
        </p>
      </div>
      <button
        onClick={onRun}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold"
      >
        <Play className="w-3.5 h-3.5" /> Run simulated tests
      </button>
      {!ownerMode && (
        <p className="text-[11px] text-muted-foreground/70">Admin view — owner can also export the JSON report.</p>
      )}
    </div>
  );
}

function ScoreCards({ total, byCat, backend }) {
  const overallTone = total.score >= 8 ? 'ok' : total.score >= 5 ? 'warn' : 'fail';
  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border p-4 ring-1 ${TONE[overallTone]} bg-card/80 backdrop-blur-sm`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide opacity-80">Overall security test score</p>
            <p className="text-3xl font-bold">{total.score.toFixed(1)}<span className="text-sm font-medium opacity-70"> / 10</span></p>
            <p className="text-[11px] opacity-80 mt-0.5">{total.total} simulated checks</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <Mini value={total.counts.pass} label="Pass" tone="ok" />
            <Mini value={total.counts.warn} label="Warn" tone="warn" />
            <Mini value={total.counts.fail} label="Fail" tone="fail" />
            <Mini value={total.counts.needs_backend} label="Backend" tone="info" />
            <Mini value={total.counts.needs_integration} label="Int." tone="info" />
            <Mini value={total.counts.manual} label="Manual" tone="muted" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {byCat.map((c) => {
          const tone = c.score >= 8 ? 'ok' : c.score >= 5 ? 'warn' : 'fail';
          return (
            <div key={c.id} className={`rounded-2xl border p-3 ${TONE[tone]} bg-card/60`}>
              <p className="text-[10px] uppercase tracking-wide opacity-80">{c.label}</p>
              <p className="text-lg font-semibold">{c.score.toFixed(1)}<span className="text-[10px] opacity-70"> /10</span></p>
              <p className="text-[10px] opacity-70">{c.total} checks</p>
            </div>
          );
        })}
        <div className="rounded-2xl border border-blue-400/30 bg-blue-400/5 p-3">
          <p className="text-[10px] uppercase tracking-wide text-blue-300/90">Backend confidence</p>
          <p className="text-lg font-semibold text-blue-300">{backend.score.toFixed(1)}<span className="text-[10px] opacity-70"> /10</span></p>
          <p className="text-[10px] text-blue-300/70 leading-snug">Capped until RLS + webhooks are formally reviewed.</p>
        </div>
      </div>
    </div>
  );
}

function Mini({ value, label, tone }) {
  return (
    <div className={`rounded-lg border px-1.5 py-1 ${TONE[tone]}`}>
      <p className="text-sm font-semibold">{value}</p>
      <p className="opacity-80">{label}</p>
    </div>
  );
}

function FilterPill({ icon: Icon, label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-2 py-1.5 text-[11px] text-muted-foreground">
      <Icon className="w-3 h-3" />
      <span className="hidden sm:inline">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-foreground text-[11px] outline-none"
      >
        {options.map((o) => <option key={o.id} value={o.id} className="bg-card text-foreground">{o.label}</option>)}
      </select>
    </label>
  );
}

function ResultsTable({ rows }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-6 text-center text-xs text-muted-foreground">
        No results match the current filter.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-3 py-2 border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground bg-secondary/40">
        <span>Test</span><span>Role</span><span>Expected</span><span>Status</span>
      </div>
      <ul>
        {rows.map((r, i) => <ResultRow key={i} r={r} />)}
      </ul>
    </div>
  );
}

function ResultRow({ r }) {
  const meta = STATUS_META[r.status] || STATUS_META[STATUS.MANUAL];
  const Icon = meta.icon;
  return (
    <li className="grid sm:grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-3 py-2.5 border-b border-border last:border-b-0 items-start">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{r.name}</p>
        {r.notes && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{r.notes}</p>}
      </div>
      <p className="text-[11px] text-muted-foreground sm:pt-0.5"><span className="sm:hidden text-muted-foreground/70">Role: </span>{r.role}</p>
      <p className="text-[11px] text-muted-foreground sm:pt-0.5 font-mono">
        <span className="sm:hidden text-muted-foreground/70">Expected: </span>{formatExpected(r.expected)}
      </p>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium w-fit ${TONE[meta.tone]}`}>
        <Icon className="w-3 h-3" />
        {meta.label}
      </span>
    </li>
  );
}

function formatExpected(v) {
  if (typeof v === 'boolean') return v ? 'allow' : 'deny';
  return String(v).replace(/_/g, ' ');
}

function NotesCard() {
  return (
    <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-3">
      <p className="text-[11px] text-yellow-300 leading-relaxed">
        Simulated tests validate UI/permission logic only. A true 9/10 rating requires:
        backend RLS verification, payment webhook signature validation, real chain/wallet ownership checks,
        and manual multi-account testing. Items marked <strong>Needs Backend Rule</strong> or
        <strong> Manual Verification</strong> must be confirmed outside this runner.
      </p>
    </div>
  );
}