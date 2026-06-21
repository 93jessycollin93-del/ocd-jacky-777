import { useState } from 'react';
import { Loader2, AlertTriangle, ShieldPlus } from 'lucide-react';
import { createGuild, validateGuildName, validateGuildTag } from '@/eru/lib/guildSystem';

const FACTIONS = ['Neutral', 'Ember Clan', 'Tide Order', 'Stone Legion', 'Gale Court', 'Void Syndicate', 'Dawn Conclave'];
const POLICIES = [
  { id: 'open',        label: 'Open' },
  { id: 'request',     label: 'Request' },
  { id: 'invite_only', label: 'Invite-only' },
];

export default function CreateGuildForm({ onCreated }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [faction, setFaction] = useState('Neutral');
  const [joinPolicy, setJoinPolicy] = useState('open');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const nameErr = validateGuildName(name);
    const tagErr = validateGuildTag(tag);
    if (nameErr || tagErr) {
      setError(nameErr || tagErr);
      return;
    }
    setSubmitting(true);
    try {
      const guild = await createGuild({ name, tag, description, faction, join_policy: joinPolicy });
      onCreated?.(guild);
    } catch (err) {
      setError(err?.message || 'Could not create guild.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldPlus className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold">Found a Guild</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Guild name"
          className="col-span-2 rounded-xl border border-border bg-secondary px-3 py-2 text-sm"
          maxLength={32}
        />
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value.toUpperCase())}
          placeholder="TAG"
          className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm uppercase tracking-widest"
          maxLength={5}
        />
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description (optional)"
        rows={2}
        maxLength={500}
        className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm"
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-muted-foreground space-y-1">
          Faction
          <select
            value={faction}
            onChange={(e) => setFaction(e.target.value)}
            className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm"
          >
            {FACTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-muted-foreground space-y-1">
          Join policy
          <select
            value={joinPolicy}
            onChange={(e) => setJoinPolicy(e.target.value)}
            className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm"
          >
            {POLICIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 inline-flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldPlus className="w-4 h-4" />}
        Found Guild
      </button>
    </form>
  );
}