import { useEffect, useState, useCallback } from 'react';
import { FileSpreadsheet, Link2, Unlink, RefreshCw, Eye, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

const CONNECTOR_ID = '69d3600598df7cb56812ae75';

const TARGET_OPTIONS = [
  { value: 'study_module', label: 'Study Modules', hint: 'Columns: title, chapter_number, category, difficulty, description, content_narrative, key_concepts, tools_used, estimated_time_minutes' },
  { value: 'resource', label: 'Resource List', hint: 'Columns: title, type, description, url, content, tags, platform' },
];

export default function SheetsSync() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [spreadsheet, setSpreadsheet] = useState('');
  const [range, setRange] = useState('Sheet1');
  const [target, setTarget] = useState('study_module');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const probeConnection = useCallback(async () => {
    try {
      // Light probe: dryRun against an empty/invalid input will 400, so we only
      // mark connected once the user actually runs a preview/sync successfully.
      // Instead, rely on the popup-close flow below. This keeps it simple.
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        // Assume connected until an action fails with 403; this avoids a noisy probe.
        setConnected(true);
      }
      setAuthLoading(false);
    })();
  }, []);

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        setConnected(true);
        probeConnection();
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
    setPreview(null);
    setResult(null);
  };

  const run = async (dryRun) => {
    if (!spreadsheet.trim()) {
      setError('Paste your Google Sheet URL or ID.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    if (dryRun) setPreview(null);
    try {
      const res = await base44.functions.invoke('syncGoogleSheet', {
        spreadsheet: spreadsheet.trim(),
        range: range.trim() || 'Sheet1',
        target,
        dryRun,
      });
      const data = res?.data || res;
      if (data?.error) {
        if (res?.status === 403) setConnected(false);
        setError(data.error);
      } else if (dryRun) {
        setPreview(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err?.message || 'Sync failed');
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-sm text-muted-foreground">Sign in to link your Google Sheets.</p>
          <button onClick={() => base44.auth.redirectToLogin()} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Sign in</button>
        </div>
      </div>
    );
  }

  const currentOption = TARGET_OPTIONS.find((o) => o.value === target);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Integrations</p>
        <h1 className="text-xl font-semibold text-foreground mt-1 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" /> Google Sheets Sync
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Import study materials and resource lists from your Google Sheets.</p>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        <section className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${connected ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-secondary border-border text-muted-foreground'}`}>
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Google Sheets</p>
            <p className="text-xs text-muted-foreground">{connected ? 'Connected to your Google account.' : 'Not connected yet.'}</p>
          </div>
          {connected ? (
            <button onClick={handleDisconnect} className="h-9 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Unlink className="w-3.5 h-3.5" /> Disconnect
            </button>
          ) : (
            <button onClick={handleConnect} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5" /> Connect
            </button>
          )}
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Source sheet</h3>
            <p className="text-xs text-muted-foreground mt-1">Paste the full share URL or the spreadsheet ID. First row must contain headers.</p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Spreadsheet URL or ID</span>
            <input
              value={spreadsheet}
              onChange={(e) => setSpreadsheet(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Sheet / range</span>
              <input
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="Sheet1 or Sheet1!A1:Z"
                className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Import into</span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {TARGET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-[11px] text-muted-foreground">{currentOption?.hint}</p>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => run(true)}
              disabled={busy || !connected}
              className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-secondary/30 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Preview
            </button>
            <button
              onClick={() => run(false)}
              disabled={busy || !connected}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Import now
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-3 text-xs text-red-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {preview && (
          <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Preview</h3>
              <span className="text-xs text-muted-foreground">{preview.total ?? preview.preview?.length ?? 0} rows</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-auto">
              {(preview.preview || []).map((row, i) => (
                <div key={i} className="rounded-xl border border-border bg-secondary/20 p-3 text-xs">
                  <p className="font-medium text-foreground truncate">{row.title || '(untitled)'}</p>
                  <p className="text-muted-foreground truncate">{row.description || row.type || row.category || '—'}</p>
                </div>
              ))}
              {(!preview.preview || preview.preview.length === 0) && (
                <p className="text-xs text-muted-foreground">No rows to preview.</p>
              )}
            </div>
          </section>
        )}

        {result && (
          <section className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Imported {result.imported} row{result.imported === 1 ? '' : 's'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Into {currentOption?.label}.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}