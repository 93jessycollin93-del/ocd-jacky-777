import { useEffect, useState } from 'react';
import { ShieldCheck, Save } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

const DEFAULT_POLICY = {
  name: 'Default Global Policy',
  shared_instructions: '',
  safety_guardrails: '',
  max_response_length: 1200,
  require_caution_for_security: true,
  require_human_review: false,
  is_active: true,
};

export default function BotGlobalPolicyPanel() {
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [policyId, setPolicyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    base44.entities.BotGlobalPolicy.list('-created_date', 1)
      .then((rows) => {
        if (rows?.[0]) {
          setPolicy({ ...DEFAULT_POLICY, ...rows[0] });
          setPolicyId(rows[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Strip server-managed/extra fields before write — only persist editable shape.
  const buildPayload = () => ({
    name: (policy.name || '').trim() || 'Default Global Policy',
    shared_instructions: policy.shared_instructions || '',
    safety_guardrails: policy.safety_guardrails || '',
    max_response_length: Number(policy.max_response_length) || 1200,
    require_caution_for_security: !!policy.require_caution_for_security,
    require_human_review: !!policy.require_human_review,
    is_active: policy.is_active !== false,
  });

  const savePolicy = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      if (policyId) {
        await base44.entities.BotGlobalPolicy.update(policyId, payload);
      } else {
        const created = await base44.entities.BotGlobalPolicy.create(payload);
        setPolicyId(created.id);
      }
      setSavedAt(new Date());
    } catch (err) {
      setError(err?.message || 'Could not save the policy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Loading global policy...</div>;
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Global Bot Policy</h3>
        </div>
        <p className="text-xs text-muted-foreground">Set shared instructions, limits, and safety guardrails once and apply them across all bots automatically.</p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Policy Name</label>
        <input
          value={policy.name}
          onChange={(e) => setPolicy((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none text-foreground"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Shared Instructions</label>
        <textarea
          value={policy.shared_instructions}
          onChange={(e) => setPolicy((prev) => ({ ...prev, shared_instructions: e.target.value }))}
          placeholder="These instructions will be added to all bots automatically."
          className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none min-h-[110px] text-foreground"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Safety Guardrails</label>
        <textarea
          value={policy.safety_guardrails}
          onChange={(e) => setPolicy((prev) => ({ ...prev, safety_guardrails: e.target.value }))}
          placeholder="Define forbidden actions, response limits, approval requirements, and other system-wide rules."
          className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none min-h-[120px] text-foreground"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Default Response Length</label>
        <input
          type="number"
          min="100"
          max="5000"
          value={policy.max_response_length}
          onChange={(e) => setPolicy((prev) => ({ ...prev, max_response_length: Number(e.target.value) || 1200 }))}
          className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none text-foreground"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 px-3 py-2.5 bg-secondary border border-border rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={policy.require_caution_for_security}
            onChange={(e) => setPolicy((prev) => ({ ...prev, require_caution_for_security: e.target.checked }))}
            className="accent-primary"
          />
          <div>
            <p className="text-xs font-medium">Extra caution for security tasks</p>
            <p className="text-[9px] text-muted-foreground">Adds stricter wording for risky analysis</p>
          </div>
        </label>

        <label className="flex items-center gap-2 px-3 py-2.5 bg-secondary border border-border rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={policy.require_human_review}
            onChange={(e) => setPolicy((prev) => ({ ...prev, require_human_review: e.target.checked }))}
            className="accent-primary"
          />
          <div>
            <p className="text-xs font-medium">Require human review</p>
            <p className="text-[9px] text-muted-foreground">Bots should advise review before risky actions</p>
          </div>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      {savedAt && !error && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          Saved at {savedAt.toLocaleTimeString()}.
        </div>
      )}

      <button
        onClick={savePolicy}
        disabled={saving || !policy.name.trim()}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
      >
        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Global Policy'}
      </button>
    </div>
  );
}