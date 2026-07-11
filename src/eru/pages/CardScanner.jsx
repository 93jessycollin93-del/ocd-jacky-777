import { useState, useMemo } from 'react';
import { ScanLine, History, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/eru/lib/AuthContext';
import { base44 } from '@/eru/api/base44Client';
import {
  getZeroFakeDataMode,
  getPricingProviderStatus,
  TRUST_LABELS,
  logPricingAudit,
  summarizePricingResults,
} from '@/eru/lib/zeroFakeData';
import { useRealtimeEntityList } from '@/eru/hooks/useLiveSync';

import ZeroFakeDataPolicyCard from '@/eru/components/pricing/ZeroFakeDataPolicyCard';
import ZeroFakeDataModeToggle from '@/eru/components/pricing/ZeroFakeDataModeToggle';
import VerifiedPriceDisplay from '@/eru/components/pricing/VerifiedPriceDisplay';
import PricingTrustBadge from '@/eru/components/pricing/PricingTrustBadge';
import ScanCapture from '@/eru/components/pricing/scanner/ScanCapture';
import IdentityResults from '@/eru/components/pricing/scanner/IdentityResults';
import ConditionPicker from '@/eru/components/pricing/scanner/ConditionPicker';
import ManualPriceEntry from '@/eru/components/pricing/scanner/ManualPriceEntry';
import PricingProviderStatus from '@/eru/components/pricing/scanner/PricingProviderStatus';

const TABS = [
  { id: 'scan',     label: 'Scanner',  icon: ScanLine },
  { id: 'history',  label: 'History',  icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/**
 * CardScanner — Pokémon card scanner/pricing page.
 *
 * Product law: Zero Fake Data. No invented prices. Every value rendered must
 * come from a connected, verified source or be explicitly labeled as manual/
 * needs-review/no-data/not-connected.
 *
 * Because no real pricing API is wired yet, the page boots into "Not
 * Connected" states for every provider and shows the full honest empty state.
 * Real data surfaces the moment a provider is connected server-side.
 */
export default function CardScanner() {
  const { user, currentUser } = useAuth();
  const me = user || currentUser;
  const isAdmin = me?.role === 'admin';
  const userEmail = me?.email || '';
  const mode = getZeroFakeDataMode();
  const demoMode = mode === 'off';

  const [tab, setTab] = useState('scan');
  const [session, setSession] = useState(null);
  const [conditionState, setConditionState] = useState({ condition: 'unknown', grade: '' });
  const [busy, setBusy] = useState(false);

  const { data: scanHistory } = useRealtimeEntityList('CardScanSession', {
    sort: '-created_date', limit: 30, enabled: !!userEmail,
  });

  const providerStatus = useMemo(getPricingProviderStatus, []);
  const anyProviderConnected = useMemo(() => Object.values(providerStatus).includes('connected'), [providerStatus]);

  // ---- Scanner flow -------------------------------------------------------
  const handleImageUploaded = async ({ image_url, image_meta }) => {
    setBusy(true);
    const row = await base44.entities.CardScanSession.create({
      image_url,
      image_meta,
      status: 'created',
      candidates: [],
      pricing_results: [],
      final_user_label: TRUST_LABELS.NOT_CONNECTED,
      owner_email: userEmail,
    });
    setSession(row);
    setConditionState({ condition: 'unknown', grade: '' });

    // HONESTY: if no identification source connected, stop here. The UI
    // renders "Identification source not connected" rather than faking
    // candidate results. When a real source is wired, this is where you'd
    // call the identification backend function.
    if (!anyProviderConnected) {
      await base44.entities.CardScanSession.update(row.id, { status: 'needs_review' });
      setSession((s) => ({ ...s, status: 'needs_review' }));
    }
    setBusy(false);
  };

  const handleSelectCandidate = async (candidateId) => {
    if (!session?.id) return;
    const updated = await base44.entities.CardScanSession.update(session.id, {
      selected_candidate_id: candidateId,
    });
    setSession((s) => ({ ...s, ...updated }));
  };

  const handleConditionChange = async ({ condition, grade }) => {
    setConditionState({ condition, grade });
    if (!session?.id) return;
    await base44.entities.CardScanSession.update(session.id, {
      selected_condition: condition,
      selected_grade: condition === 'graded' ? grade : '',
    });
  };

  // ---- Pricing (honest) ---------------------------------------------------
  // Right now, no provider is wired. When one is, add a requestPricing()
  // function that calls a backend function, routes through the connected
  // source, and populates pricing_results + PricingAuditLog. Until then the
  // UI stays in "Not Connected" state.

  const handleManualPriceSaved = (row) => {
    if (!session) return;
    // Append to local pricing_results as "manual_owner" so the display
    // component picks it up correctly.
    const entry = {
      source: 'manual_owner',
      source_type: 'manual_owner',
      request_status: 'ok',
      returned_value: row.amount,
      currency: row.currency,
      condition_basis: row.condition_basis || conditionState.condition,
      grade: row.grade || conditionState.grade,
      user_label_shown: TRUST_LABELS.MANUAL,
      warnings: [],
      last_updated: new Date().toISOString(),
    };
    const nextResults = [...(session.pricing_results || []), entry];
    setSession((s) => ({ ...s, pricing_results: nextResults }));
    base44.entities.CardScanSession.update(session.id, { pricing_results: nextResults }).catch(() => null);
    logPricingAudit({
      scanId: session.id,
      source: 'manual_owner',
      sourceType: 'manual_owner',
      requestStatus: 'ok',
      returnedValue: row.amount,
      currency: row.currency,
      conditionBasis: entry.condition_basis,
      grade: entry.grade,
      userLabelShown: TRUST_LABELS.MANUAL,
      ownerEmail: userEmail,
    });
  };

  const selectedCandidate = session?.candidates?.find((c) => c.candidate_id === session?.selected_candidate_id);

  return (
    <div
      className="flex min-h-screen flex-col bg-background pb-24"
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Header */}
      <div className="border-b border-border bg-card/80 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pokémon Card</p>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <ScanLine className="h-5 w-5 text-primary" /> Scanner & Pricing
        </h1>
      </div>

      {/* Tabs */}
      <nav className="sticky top-0 z-10 flex border-b border-border bg-background/95 backdrop-blur-md">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            data-no-min-touch
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </nav>

      {/* Policy card — always visible on every scanner surface */}
      <div className="px-4 pt-4">
        <ZeroFakeDataPolicyCard mode={mode} />
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* === SCAN TAB === */}
        {tab === 'scan' && (
          <>
            <ScanCapture onUploaded={handleImageUploaded} busy={busy} />

            {session?.image_url && (
              <div className="rounded-2xl border border-border bg-card p-3">
                <img
                  src={session.image_url}
                  alt="Scanned card"
                  className="w-full max-h-64 rounded-xl object-contain bg-secondary"
                />
              </div>
            )}

            {session && (
              <>
                <IdentityResults
                  candidates={session.candidates}
                  selectedId={session.selected_candidate_id}
                  onSelect={handleSelectCandidate}
                  identityConnected={anyProviderConnected}
                />

                <ConditionPicker
                  value={conditionState.condition}
                  grade={conditionState.grade}
                  onChange={handleConditionChange}
                />

                {/* Pricing panel — the moment of truth */}
                <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold text-foreground">Verified pricing</p>
                  </div>
                  <VerifiedPriceDisplay
                    results={session.pricing_results || []}
                    demoMode={demoMode}
                    displayCurrency="CAD"
                  />
                </section>

                <ManualPriceEntry
                  scanId={session.id}
                  candidateId={session.selected_candidate_id}
                  cardName={selectedCandidate?.card_name}
                  userEmail={userEmail}
                  onSaved={handleManualPriceSaved}
                />
              </>
            )}
          </>
        )}

        {/* === HISTORY TAB === */}
        {tab === 'history' && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Recent scans</p>
            {!scanHistory?.length ? (
              <p className="rounded-2xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">
                No scan history yet.
              </p>
            ) : scanHistory.map((scan) => {
              const summary = summarizePricingResults(scan.pricing_results || []);
              return (
                <button
                  key={scan.id}
                  onClick={() => { setSession(scan); setTab('scan'); }}
                  className="w-full text-left rounded-2xl border border-border bg-card p-3 hover:border-primary/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {scan.candidates?.[0]?.card_name || 'Unknown card'}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {scan.status} · {new Date(scan.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <PricingTrustBadge kind={summary.badge} label={summary.label} />
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {/* === SETTINGS TAB === */}
        {tab === 'settings' && (
          <>
            <ZeroFakeDataModeToggle user={me} />
            <PricingProviderStatus isAdmin={isAdmin} />
          </>
        )}
      </div>
    </div>
  );
}