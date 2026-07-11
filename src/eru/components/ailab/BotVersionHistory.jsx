import { useState, useEffect } from 'react';
import { History, Save, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import BotVersionComparator from './BotVersionComparator';

export default function BotVersionHistory({ bots, onRollback }) {
  const { currentUser } = useAuth();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(null);
  const [versionLabel, setVersionLabel] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(null); // bot id

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.BotVersion.list('-created_date', 100);
    setVersions(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveVersion = async (bot) => {
    setSaving(bot.id);
    await base44.entities.BotVersion.create({
      bot_id: bot.id,
      bot_name: bot.name,
      version_label: versionLabel || `v${new Date().toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      instructions: bot.instructions || '',
      personality: bot.personality || '',
      response_style: bot.response_style || '',
      handoff_instructions: bot.handoff_instructions || '',
      prompt_template_id: bot.prompt_template_id || '',
      prompt_template_values: bot.prompt_template_values || {},
      notes: saveNotes,
      user_email: currentUser?.email,
    });
    setVersionLabel('');
    setSaveNotes('');
    setShowSaveForm(null);
    setSaving(null);
    load();
  };

  const rollback = async (version) => {
    const bot = bots?.find(b => b.id === version.bot_id);
    if (!bot) return;
    await base44.entities.UserBot.update(bot.id, {
      instructions: version.instructions,
      personality: version.personality,
      response_style: version.response_style,
      handoff_instructions: version.handoff_instructions,
      prompt_template_id: version.prompt_template_id || '',
      prompt_template_values: version.prompt_template_values || {},
    });
    await base44.entities.BotDeployment.create({
      bot_id: bot.id,
      bot_name: bot.name,
      source_version_id: version.id,
      source_version_label: version.version_label || '',
      target_type: 'mixed',
      target_pages: bot.page_assignments || [],
      target_environment: bot.deployment_environment || 'draft',
      deployment_status: 'rolled_back',
      deployment_notes: 'Rollback triggered from version history',
      triggered_from: 'rollback',
      rollback_version_id: version.id,
      rolled_back_at: new Date().toISOString()
    });
    onRollback?.();
    load();
  };

  const del = async (id) => { await base44.entities.BotVersion.delete(id); load(); };

  const filtered = selectedBot === 'all' ? versions : versions.filter(v => v.bot_id === selectedBot);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3">
        <p className="text-xs font-semibold text-yellow-400 mb-1">📸 Version History</p>
        <p className="text-[10px] text-muted-foreground">Save snapshots of bot instructions and roll back to any previous stable configuration.</p>
      </div>

      {/* Save snapshot per bot */}
      {bots?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Save Current State</p>
          {bots.map(bot => (
            <div key={bot.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2.5">
                <p className="text-xs font-medium flex-1">{bot.name}</p>
                <span className="text-[9px] text-muted-foreground">{versions.filter(v => v.bot_id === bot.id).length} versions</span>
                <button onClick={() => setShowSaveForm(showSaveForm === bot.id ? null : bot.id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium">
                  <Save className="w-3 h-3" /> Snapshot
                </button>
              </div>
              {showSaveForm === bot.id && (
                <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                  <input value={versionLabel} onChange={e => setVersionLabel(e.target.value)}
                    placeholder="Version label (e.g. v2.0-stable)"
                    className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none text-foreground" />
                  <input value={saveNotes} onChange={e => setSaveNotes(e.target.value)}
                    placeholder="Notes (e.g. Before training update)"
                    className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none text-foreground" />
                  <button onClick={() => saveVersion(bot)} disabled={saving === bot.id}
                    className="w-full bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-semibold disabled:opacity-40">
                    {saving === bot.id ? 'Saving…' : 'Save Snapshot'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <BotVersionComparator versions={versions} selectedBot={selectedBot} onSaved={load} />

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setSelectedBot('all')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium ${selectedBot === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
          All Bots
        </button>
        {bots?.map(b => (
          <button key={b.id} onClick={() => setSelectedBot(b.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium ${selectedBot === b.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
            {b.name}
          </button>
        ))}
      </div>

      {/* Version list */}
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <History className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No snapshots yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Save a snapshot before making major changes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(v => (
            <div key={v.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-secondary/30">
                <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center flex-shrink-0">
                  <History className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{v.version_label || 'Snapshot'}</p>
                  <p className="text-[9px] text-muted-foreground">{v.bot_name} · {new Date(v.created_date).toLocaleString()}</p>
                  {v.notes && <p className="text-[9px] text-muted-foreground/70 italic mt-0.5">{v.notes}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={e => { e.stopPropagation(); del(v.id); }}
                    className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                  {expanded === v.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
              </button>

              {expanded === v.id && (
                <div className="px-3 pb-3 border-t border-border/50 space-y-2 pt-2">
                  <div className="bg-secondary rounded-lg p-2.5 text-[10px] text-foreground/80 leading-relaxed max-h-32 overflow-y-auto">
                    <p className="text-muted-foreground font-medium mb-1">Instructions:</p>
                    {v.instructions || '(empty)'}
                  </div>
                  {v.personality && <p className="text-[10px]"><span className="text-muted-foreground">Personality: </span>{v.personality}</p>}
                  <button onClick={() => rollback(v)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 rounded-lg text-xs font-semibold hover:bg-yellow-400/20 transition-all">
                    <RotateCcw className="w-3 h-3" /> Roll Back to This Version
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}