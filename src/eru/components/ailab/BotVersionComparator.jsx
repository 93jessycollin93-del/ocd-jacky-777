import { useMemo, useState } from 'react';
import { BarChart2, CheckCircle2, Scale } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';

function ScoreBar({ label, value, color }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`${color} h-full rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function BotVersionComparator({ versions = [], selectedBot, onSaved }) {
  const { currentUser } = useAuth();
  const [versionAId, setVersionAId] = useState('');
  const [versionBId, setVersionBId] = useState('');
  const [engagementA, setEngagementA] = useState(50);
  const [engagementB, setEngagementB] = useState(50);
  const [accuracyA, setAccuracyA] = useState(50);
  const [accuracyB, setAccuracyB] = useState(50);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedVersions = useMemo(() => versions.filter((v) => v.bot_id === selectedBot || selectedBot === 'all'), [versions, selectedBot]);
  const versionA = selectedVersions.find((v) => v.id === versionAId);
  const versionB = selectedVersions.find((v) => v.id === versionBId);
  const totalA = Math.round((Number(engagementA) + Number(accuracyA)) / 2);
  const totalB = Math.round((Number(engagementB) + Number(accuracyB)) / 2);
  const winner = totalA === totalB ? 'tie' : totalA > totalB ? 'version_a' : 'version_b';

  const saveComparison = async () => {
    if (!versionA || !versionB || versionA.id === versionB.id) return;
    setSaving(true);
    await base44.entities.BotVersionComparison.create({
      bot_id: versionA.bot_id,
      bot_name: versionA.bot_name,
      version_a_id: versionA.id,
      version_a_label: versionA.version_label,
      version_b_id: versionB.id,
      version_b_label: versionB.version_label,
      engagement_a: Number(engagementA),
      engagement_b: Number(engagementB),
      accuracy_a: Number(accuracyA),
      accuracy_b: Number(accuracyB),
      winner,
      notes,
      user_email: currentUser?.email,
    });
    setSaving(false);
    setNotes('');
    onSaved?.();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">Version Comparison</p>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        <select value={versionAId} onChange={(e) => setVersionAId(e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">Select version A</option>
          {selectedVersions.map((version) => <option key={version.id} value={version.id}>{version.version_label || 'Snapshot'} </option>)}
        </select>
        <select value={versionBId} onChange={(e) => setVersionBId(e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">Select version B</option>
          {selectedVersions.map((version) => <option key={version.id} value={version.id}>{version.version_label || 'Snapshot'} </option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3 rounded-xl bg-secondary/40 border border-border p-3">
          <p className="text-xs font-medium">Version A scores</p>
          <ScoreBar label="Engagement" value={Number(engagementA)} color="bg-blue-400" />
          <input type="range" min="0" max="100" value={engagementA} onChange={(e) => setEngagementA(e.target.value)} className="w-full accent-blue-400" />
          <ScoreBar label="Accuracy" value={Number(accuracyA)} color="bg-green-400" />
          <input type="range" min="0" max="100" value={accuracyA} onChange={(e) => setAccuracyA(e.target.value)} className="w-full accent-green-400" />
        </div>
        <div className="space-y-3 rounded-xl bg-secondary/40 border border-border p-3">
          <p className="text-xs font-medium">Version B scores</p>
          <ScoreBar label="Engagement" value={Number(engagementB)} color="bg-blue-400" />
          <input type="range" min="0" max="100" value={engagementB} onChange={(e) => setEngagementB(e.target.value)} className="w-full accent-blue-400" />
          <ScoreBar label="Accuracy" value={Number(accuracyB)} color="bg-green-400" />
          <input type="range" min="0" max="100" value={accuracyB} onChange={(e) => setAccuracyB(e.target.value)} className="w-full accent-green-400" />
        </div>
      </div>

      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this test or evaluation" className="w-full min-h-[70px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none" />

      <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Comparison result</p>
        </div>
        <p className="text-xs text-muted-foreground">Average score from engagement and response accuracy.</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-card border border-border p-3">
            <p className="text-[10px] text-muted-foreground">Version A</p>
            <p className="font-semibold">{totalA}%</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3">
            <p className="text-[10px] text-muted-foreground">Version B</p>
            <p className="font-semibold">{totalB}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-primary font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {winner === 'tie' ? 'Both versions performed equally.' : winner === 'version_a' ? 'Version A is currently performing better.' : 'Version B is currently performing better.'}
        </div>
      </div>

      <button onClick={saveComparison} disabled={!versionA || !versionB || versionAId === versionBId || saving} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
        {saving ? 'Saving comparison…' : 'Save comparison'}
      </button>
    </div>
  );
}