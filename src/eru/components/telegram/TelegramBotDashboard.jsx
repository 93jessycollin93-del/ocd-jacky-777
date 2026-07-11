import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Loader2, Plus, RefreshCw, Save, Settings2, TerminalSquare, Copy, Trash2, BarChart3 } from 'lucide-react';
import BotFlowBuilder from './BotFlowBuilder';
import TelegramBotAnalytics from './TelegramBotAnalytics';
import TelegramAgentBuilder from './TelegramAgentBuilder';
import BotOverviewCharts from './BotOverviewCharts';
import BotFleetTable from './BotFleetTable';
import TelegramSwarmConfigPanel from './TelegramSwarmConfigPanel';
import TelegramBotOperationsPanel from './TelegramBotOperationsPanel';
import TelegramSwarmHistoryPanel from './TelegramSwarmHistoryPanel';
import TelegramSwarmPerformanceDashboard from './TelegramSwarmPerformanceDashboard';
import TelegramBotAnalyticsDashboard from './TelegramBotAnalyticsDashboard';
import TelegramSwarmSandboxPanel from './TelegramSwarmSandboxPanel';
import TelegramHumanHandoffPanel from './TelegramHumanHandoffPanel';
import TelegramHandoffInbox from './TelegramHandoffInbox';
import TelegramABTestingPanel from './TelegramABTestingPanel';

const DEFAULT_FORM = {
  name: '',
  bot_username: '',
  bot_token: '',
  system_prompt: 'You are a helpful Telegram AI assistant.',
  greeting_message: 'Welcome. Ask me anything.',
  flow_blocks: [],
  memory_enabled: true,
  memory_retention: 'medium',
  memory_message_limit: 20,
  tool_modules: [],
  agent_notes: '',
  human_handoff_enabled: false,
  human_handoff_admin_chat_id: '',
  human_handoff_pause_ai: true,
  human_handoff_keywords: ['human', 'agent', 'person', 'support', 'help', 'escalate', 'complaint', 'refund'],
  swarm_enabled: false,
  router_bot_id: '',
  specialist_bot_ids: [],
  swarm_goal_template: '',
  front_door_role: 'general',
  backend_swarm_size: 25,
  swarm_execution_mode: 'targeted',
  max_specialists_per_request: 6,
  group_response_mode: 'commands_only',
  group_responses_enabled: true,
  channel_post_responses_enabled: false,
};

export default function TelegramBotDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const [purgingHistory, setPurgingHistory] = useState(false);
  const [verification, setVerification] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBotIds, setSelectedBotIds] = useState([]);
  const [data, setData] = useState({ bots: [], messages: [], logs: [], sessions: [], comparisons: [] });
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [labBots, setLabBots] = useState([]);
  const [knowledgeState, setKnowledgeState] = useState({ uploading: false, items: [] });

  const load = async () => {
    setLoading(true);
    const response = await base44.functions.invoke('listTelegramBotDashboard', {});
    setData(response.data || { bots: [], messages: [], logs: [], sessions: [], comparisons: [] });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    base44.entities.UserBot.list('-updated_date', 100).then(setLabBots).catch(() => setLabBots([]));
  }, []);

  const selectedBot = useMemo(
    () => data.bots.find((bot) => bot.id === selectedBotId) || data.bots[0] || null,
    [data.bots, selectedBotId]
  );

  useEffect(() => {
    if (selectedBot) {
      setSelectedBotId(selectedBot.id);
      setForm({
        name: selectedBot.name || '',
        bot_username: selectedBot.bot_username || '',
        bot_token: selectedBot.bot_token || '',
        system_prompt: selectedBot.system_prompt || DEFAULT_FORM.system_prompt,
        greeting_message: selectedBot.greeting_message || DEFAULT_FORM.greeting_message,
        flow_blocks: selectedBot.flow_blocks || [],
        memory_enabled: selectedBot.memory_enabled ?? true,
        memory_retention: selectedBot.memory_retention || 'medium',
        memory_message_limit: selectedBot.memory_message_limit || 20,
        tool_modules: selectedBot.tool_modules || [],
        agent_notes: selectedBot.agent_notes || '',
        human_handoff_enabled: !!selectedBot.human_handoff_enabled,
        human_handoff_admin_chat_id: selectedBot.human_handoff_admin_chat_id || '',
        human_handoff_pause_ai: selectedBot.human_handoff_pause_ai ?? true,
        human_handoff_keywords: selectedBot.human_handoff_keywords || ['human', 'agent', 'person', 'support', 'help', 'escalate', 'complaint', 'refund'],
        swarm_enabled: !!selectedBot.swarm_enabled,
        router_bot_id: selectedBot.router_bot_id || '',
        specialist_bot_ids: selectedBot.specialist_bot_ids || [],
        swarm_goal_template: selectedBot.swarm_goal_template || '',
        front_door_role: selectedBot.front_door_role || 'general',
        backend_swarm_size: selectedBot.backend_swarm_size || 25,
        swarm_execution_mode: selectedBot.swarm_execution_mode || 'targeted',
        max_specialists_per_request: selectedBot.max_specialists_per_request || 6,
        group_response_mode: selectedBot.group_response_mode || 'commands_only',
        group_responses_enabled: selectedBot.group_responses_enabled ?? true,
        channel_post_responses_enabled: selectedBot.channel_post_responses_enabled ?? false,
      });
      setVerification(null);
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [selectedBot?.id]);

  const selectedMessages = useMemo(
    () => data.messages.filter((message) => message.bot_id === selectedBot?.id).slice(0, 12),
    [data.messages, selectedBot?.id]
  );

  const selectedLogs = useMemo(
    () => data.logs.filter((log) => log.bot_id === selectedBot?.id).slice(0, 12),
    [data.logs, selectedBot?.id]
  );

  const selectedSessions = useMemo(
    () => data.sessions.filter((session) => session.bot_id === selectedBot?.id),
    [data.sessions, selectedBot?.id]
  );

  useEffect(() => {
    if (!selectedBot?.id) {
      setKnowledgeState({ uploading: false, items: [] });
      return;
    }
    base44.entities.KnowledgeBaseDocument.filter({ status: 'active' }, '-updated_date', 50)
      .then((rows) => {
        const linked = (rows || [])
          .filter((item) => (item.linked_bot_ids || []).includes(selectedBot.id))
          .slice(0, 5)
          .map((item) => ({ id: item.id, title: item.title, summary: item.content?.slice(0, 220) || '' }));
        setKnowledgeState((prev) => ({ ...prev, items: linked }));
      })
      .catch(() => setKnowledgeState((prev) => ({ ...prev, items: [] })));
  }, [selectedBot?.id]);

  const saveSessionContext = async (session, contextOverride) => {
    setSavingContext(true);
    await base44.entities.TelegramBotSession.update(session.id, {
      context_override: contextOverride,
      memory_summary: contextOverride || session.memory_summary || ''
    });
    await load();
    setSavingContext(false);
  };

  const purgeSessionHistory = async (session) => {
    setPurgingHistory(true);
    await base44.entities.TelegramBotSession.update(session.id, {
      swarm_history: [],
      context_override: '',
      memory_summary: '',
      last_user_message: '',
      last_bot_response: '',
      message_count: 0,
      history_purged_at: new Date().toISOString()
    });
    await load();
    setPurgingHistory(false);
  };

  const selectedAnalytics = useMemo(() => {
    const messageCount = selectedMessages.length;
    const incoming = selectedMessages.filter((message) => message.direction === 'incoming').length;
    const outgoing = selectedMessages.filter((message) => message.direction === 'outgoing').length;
    const errorCount = selectedLogs.filter((log) => log.level === 'error').length;
    const avgLatency = selectedMessages.filter((message) => typeof message.latency_ms === 'number');
    return {
      messageCount,
      incoming,
      outgoing,
      errorCount,
      avgLatency: avgLatency.length ? Math.round(avgLatency.reduce((sum, message) => sum + message.latency_ms, 0) / avgLatency.length) : 0,
    };
  }, [selectedMessages, selectedLogs]);

  const toggleSelectedBot = (botId) => {
    setSelectedBotIds((prev) => prev.includes(botId) ? prev.filter((id) => id !== botId) : [...prev, botId]);
  };

  const deleteSelectedBots = async () => {
    await Promise.all(selectedBotIds.map((id) => base44.entities.TelegramBot.delete(id)));
    setSelectedBotIds([]);
    await load();
  };

  const bulkActivateSelected = async () => {
    await Promise.all(selectedBotIds.map((id) => {
      const bot = data.bots.find((item) => item.id === id);
      return base44.functions.invoke('manageTelegramWebhook', {
        botId: id,
        botToken: bot?.bot_token,
        action: 'activate'
      });
    }));
    setSelectedBotIds([]);
    await load();
  };

  const createBot = async () => {
    setSaving(true);
    const created = await base44.entities.TelegramBot.create({
      ...form,
      system_prompt: [
        form.system_prompt,
        ...(form.flow_blocks || []).map((block) => block.value),
      ].filter(Boolean).join('\n\n'),
      status: 'draft',
      memory_enabled: form.memory_enabled,
      memory_retention: form.memory_retention,
      memory_message_limit: Number(form.memory_message_limit || 20),
      tool_modules: form.tool_modules || [],
      agent_notes: form.agent_notes || '',
      human_handoff_enabled: !!form.human_handoff_enabled,
      human_handoff_admin_chat_id: form.human_handoff_admin_chat_id || '',
      human_handoff_pause_ai: form.human_handoff_pause_ai ?? true,
      human_handoff_keywords: form.human_handoff_keywords || [],
      swarm_enabled: !!form.swarm_enabled,
      router_bot_id: form.router_bot_id || '',
      specialist_bot_ids: form.specialist_bot_ids || [],
      swarm_goal_template: form.swarm_goal_template || '',
      front_door_role: form.front_door_role || 'general',
      backend_swarm_size: Number(form.backend_swarm_size || 25),
      swarm_execution_mode: form.swarm_execution_mode || 'targeted',
      max_specialists_per_request: Number(form.max_specialists_per_request || 6),
      group_response_mode: form.group_response_mode || 'commands_only',
      group_responses_enabled: form.group_responses_enabled ?? true,
      channel_post_responses_enabled: form.channel_post_responses_enabled ?? false,
      commands: [
        { command: '/start', description: 'Start the bot' },
        { command: '/help', description: 'See bot help' },
        { command: '/reset', description: 'Reset memory' }
      ]
    });
    setSelectedBotId(created.id);
    await load();
    setSaving(false);
  };

  const updateBot = async () => {
    if (!selectedBot) return;
    setSaving(true);
    await base44.entities.TelegramBot.update(selectedBot.id, {
      ...form,
      system_prompt: [
        form.system_prompt,
        ...(form.flow_blocks || []).map((block) => block.value),
      ].filter(Boolean).join('\n\n'),
      memory_enabled: form.memory_enabled,
      memory_retention: form.memory_retention,
      memory_message_limit: Number(form.memory_message_limit || 20),
      tool_modules: form.tool_modules || [],
      agent_notes: form.agent_notes || '',
      human_handoff_enabled: !!form.human_handoff_enabled,
      human_handoff_admin_chat_id: form.human_handoff_admin_chat_id || '',
      human_handoff_pause_ai: form.human_handoff_pause_ai ?? true,
      human_handoff_keywords: form.human_handoff_keywords || [],
      swarm_enabled: !!form.swarm_enabled,
      router_bot_id: form.router_bot_id || '',
      specialist_bot_ids: form.specialist_bot_ids || [],
      swarm_goal_template: form.swarm_goal_template || '',
      front_door_role: form.front_door_role || 'general',
      backend_swarm_size: Number(form.backend_swarm_size || 25),
      swarm_execution_mode: form.swarm_execution_mode || 'targeted',
      max_specialists_per_request: Number(form.max_specialists_per_request || 6),
      group_response_mode: form.group_response_mode || 'commands_only',
      group_responses_enabled: form.group_responses_enabled ?? true,
      channel_post_responses_enabled: form.channel_post_responses_enabled ?? false,
    });
    await load();
    setSaving(false);
  };

  const verifyConnection = async () => {
    if (!selectedBot) return;
    setVerifying(true);
    try {
      const response = await base44.functions.invoke('manageTelegramWebhook', {
        botId: selectedBot.id,
        botToken: form.bot_token?.trim() || selectedBot.bot_token,
        action: 'verify'
      });
      setVerification(response.data);
      await load();
    } catch (error) {
      setVerification({ error: error?.response?.data?.error || error?.message || 'Verification failed.' });
    }
    setVerifying(false);
  };

  const registerWebhook = async () => {
    if (!selectedBot) return;
    setRegistering(true);
    try {
      const response = await base44.functions.invoke('manageTelegramWebhook', {
        botId: selectedBot.id,
        botToken: form.bot_token?.trim() || selectedBot.bot_token,
        action: 'activate'
      });
      setVerification(response.data);
      await load();
    } catch (error) {
      setVerification({ error: error?.response?.data?.error || error?.message || 'Webhook setup failed.' });
    }
    setRegistering(false);
  };

  const toggleBotStatus = async () => {
    if (!selectedBot) return;
    setToggling(true);
    try {
      const response = await base44.functions.invoke('manageTelegramWebhook', {
        botId: selectedBot.id,
        botToken: form.bot_token?.trim() || selectedBot.bot_token,
        action: selectedBot.status === 'active' ? 'offline' : 'activate'
      });
      setVerification(response.data);
      await load();
    } catch (error) {
      setVerification({ error: error?.response?.data?.error || error?.message || 'Status update failed.' });
    }
    setToggling(false);
  };

  const cloneBot = async (bot) => {
    const { id, created_date, updated_date, created_by, ...copyData } = bot;
    const created = await base44.entities.TelegramBot.create({
      ...copyData,
      name: `${bot.name} Copy`,
      status: 'draft',
      source_bot_id: bot.id,
    });
    setSelectedBotId(created.id);
    await load();
  };

  const cloneSpecialistBot = async (bot) => {
    const created = await base44.entities.UserBot.create({
      name: `${bot.name} Variant`,
      description: bot.description || '',
      role: bot.role || 'custom',
      personality: bot.personality || '',
      instructions: bot.instructions || '',
      response_style: bot.response_style || 'detailed',
      memory_enabled: bot.memory_enabled ?? true,
      status: bot.status || 'active',
      is_public: false,
      connected_bot_ids: [],
      handoff_instructions: bot.handoff_instructions || '',
      model_provider: bot.model_provider || 'base44',
      model_name: bot.model_name || '',
      prompt_template_id: bot.prompt_template_id || '',
      prompt_template_name: bot.prompt_template_name || '',
      template_variables: bot.template_variables || [],
      data_sources: bot.data_sources || [],
      page_assignments: [],
      tool_modules: bot.tool_modules || []
    });
    setLabBots((prev) => [created, ...prev]);
    setForm((prev) => ({
      ...prev,
      specialist_bot_ids: [...new Set([...(prev.specialist_bot_ids || []), created.id])]
    }));
  };

  const uploadKnowledgeFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBot?.id) return;
    setKnowledgeState((prev) => ({ ...prev, uploading: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const response = await base44.functions.invoke('ingestTelegramBotKnowledge', {
      botId: selectedBot.id,
      sourceType: 'file',
      fileUrl: file_url,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      title: file.name.replace(/\.[^.]+$/, '')
    });
    const doc = response.data?.document;
    const summary = response.data?.summary || '';
    if (doc?.id) {
      setKnowledgeState((prev) => ({
        uploading: false,
        items: [{ id: doc.id, title: doc.title, summary }, ...prev.items].slice(0, 5)
      }));
    } else {
      setKnowledgeState((prev) => ({ ...prev, uploading: false }));
    }
    event.target.value = '';
  };

  const addKnowledgeUrl = async () => {
    if (!selectedBot?.id) return;
    const url = window.prompt('Paste a URL to use as training context');
    if (!url) return;
    setKnowledgeState((prev) => ({ ...prev, uploading: true }));
    const response = await base44.functions.invoke('ingestTelegramBotKnowledge', {
      botId: selectedBot.id,
      sourceType: 'url',
      url,
      title: url
    });
    const doc = response.data?.document;
    const summary = response.data?.summary || '';
    if (doc?.id) {
      setKnowledgeState((prev) => ({
        uploading: false,
        items: [{ id: doc.id, title: doc.title, summary }, ...prev.items].slice(0, 5)
      }));
    } else {
      setKnowledgeState((prev) => ({ ...prev, uploading: false }));
    }
  };

  const deleteBot = async (botId) => {
    await base44.entities.TelegramBot.delete(botId);
    setSelectedBotId(null);
    await load();
  };

  const runBulkAction = async (action) => {
    const bots = data.bots || [];
    if (!bots.length) return;
    if (action === 'activate') {
      await Promise.all(bots.map((bot) => base44.entities.TelegramBot.update(bot.id, { status: 'active' })));
    }
    if (action === 'offline') {
      await Promise.all(bots.map((bot) => base44.entities.TelegramBot.update(bot.id, { status: 'offline' })));
    }
    await load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Bots</p>
          <p className="text-lg font-semibold mt-1">{data.bots.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Sessions</p>
          <p className="text-lg font-semibold mt-1">{selectedSessions.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Messages</p>
          <p className="text-lg font-semibold mt-1">{selectedMessages.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Errors</p>
          <p className="text-lg font-semibold mt-1">{selectedAnalytics.errorCount}</p>
        </div>
      </div>

      <BotOverviewCharts bots={data.bots} messages={data.messages} logs={data.logs} comparisons={data.comparisons || []} />

      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Use the builder below to configure each bot’s agent behavior, memory, and tools.
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={createBot} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50">
          <Plus className="w-4 h-4" /> New Bot
        </button>
        <button onClick={() => setBulkMode((prev) => !prev)} className="px-3 py-3 bg-secondary border border-border rounded-xl text-muted-foreground text-sm">
          Bulk
        </button>
        <button onClick={() => cloneBot(selectedBot)} disabled={!selectedBot} className="px-3 py-3 bg-secondary border border-border rounded-xl text-muted-foreground">
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={load} className="px-3 py-3 bg-secondary border border-border rounded-xl text-muted-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {bulkMode && selectedBotIds.length > 0 && (
        <div className="flex gap-2">
          <button onClick={bulkActivateSelected} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium">Activate selected</button>
          <button onClick={deleteSelectedBots} className="px-4 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm font-medium flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}

      <div className="space-y-3">
        {bulkMode && data.bots.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border bg-card p-3">
            {data.bots.map((bot) => (
              <label key={bot.id} className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={selectedBotIds.includes(bot.id)} onChange={() => toggleSelectedBot(bot.id)} className="accent-primary" />
                <span>{bot.name}</span>
              </label>
            ))}
          </div>
        )}
        <BotFleetTable
          bots={data.bots}
          selectedBotId={selectedBot?.id}
          onSelectBot={setSelectedBotId}
          onCloneBot={cloneBot}
          onDeleteBot={deleteBot}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">AI Behavior</p>
        </div>
        <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Bot name" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <input value={form.bot_username} onChange={(e) => setForm((prev) => ({ ...prev, bot_username: e.target.value }))} placeholder="Telegram username" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <input value={form.bot_token} onChange={(e) => setForm((prev) => ({ ...prev, bot_token: e.target.value }))} placeholder="Telegram bot token" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <p className="text-[11px] text-muted-foreground">Paste the token exactly as provided by BotFather. The saved bot token will also be reused if this field is left unchanged.</p>
        <textarea value={form.greeting_message} onChange={(e) => setForm((prev) => ({ ...prev, greeting_message: e.target.value }))} placeholder="Greeting message" className="w-full min-h-[80px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none" />
        <TelegramAgentBuilder
          form={form}
          setForm={setForm}
          knowledgeState={knowledgeState}
          onUploadKnowledgeFile={uploadKnowledgeFile}
          onAddKnowledgeUrl={addKnowledgeUrl}
        />
        <TelegramSwarmConfigPanel bots={labBots} form={form} setForm={setForm} onCloneSpecialist={cloneSpecialistBot} />
        <TelegramHumanHandoffPanel form={form} setForm={setForm} sessions={selectedSessions} />
        <BotFlowBuilder value={form.flow_blocks} onChange={(flow_blocks) => setForm((prev) => ({ ...prev, flow_blocks }))} />
        <div className="flex gap-2 flex-wrap">
          <button onClick={updateBot} disabled={!selectedBot || saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" /> Save
          </button>
          <button onClick={() => cloneBot(selectedBot)} disabled={!selectedBot} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary border border-border rounded-xl text-sm font-medium disabled:opacity-50">
            <Copy className="w-4 h-4" /> Clone
          </button>
          <button onClick={() => deleteBot(selectedBot.id)} disabled={!selectedBot} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      <TelegramBotOperationsPanel
        selectedBot={selectedBot}
        verification={verification}
        verifying={verifying}
        registering={registering}
        toggling={toggling}
        onVerify={verifyConnection}
        onRegisterWebhook={registerWebhook}
        onToggleBotStatus={toggleBotStatus}
      />

      <TelegramBotAnalytics bot={selectedBot} messages={selectedMessages} logs={selectedLogs} sessions={selectedSessions} />
      <TelegramBotAnalyticsDashboard
        bot={selectedBot}
        messages={data.messages.filter((message) => message.bot_id === selectedBot?.id)}
        logs={data.logs.filter((log) => log.bot_id === selectedBot?.id)}
        sessions={selectedSessions}
        comparisons={data.comparisons || []}
      />

      <TelegramSwarmSandboxPanel bot={selectedBot} sessions={selectedSessions} />

      <TelegramABTestingPanel bot={selectedBot} sessions={selectedSessions} />

      <TelegramHandoffInbox bot={selectedBot} sessions={selectedSessions} onRefresh={load} />

      <TelegramSwarmHistoryPanel
        bot={selectedBot}
        sessions={selectedSessions}
        onSaveContext={saveSessionContext}
        onPurgeHistory={purgeSessionHistory}
        savingContext={savingContext}
        purgingHistory={purgingHistory}
      />

      <TelegramSwarmPerformanceDashboard bot={selectedBot} sessions={selectedSessions} />

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Bot Analytics</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-lg bg-secondary/60 border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Messages</p>
            <p className="text-lg font-semibold mt-1">{selectedAnalytics.messageCount}</p>
          </div>
          <div className="rounded-lg bg-secondary/60 border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Incoming</p>
            <p className="text-lg font-semibold mt-1">{selectedAnalytics.incoming}</p>
          </div>
          <div className="rounded-lg bg-secondary/60 border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Outgoing</p>
            <p className="text-lg font-semibold mt-1">{selectedAnalytics.outgoing}</p>
          </div>
          <div className="rounded-lg bg-secondary/60 border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Avg latency</p>
            <p className="text-lg font-semibold mt-1">{selectedAnalytics.avgLatency}ms</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TerminalSquare className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Live Activity</p>
        </div>
        <div className="space-y-2">
          {selectedMessages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No messages yet.</p>
          ) : selectedMessages.map((message) => (
            <div key={message.id} className="rounded-lg bg-secondary/60 border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] uppercase text-muted-foreground">{message.direction}</span>
                <span className="text-[10px] text-muted-foreground">{message.status}</span>
              </div>
              <p className="text-xs text-foreground whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-border pt-3">
          {selectedLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No logs yet.</p>
          ) : selectedLogs.map((log) => (
            <div key={log.id} className="flex items-start justify-between gap-3 text-xs">
              <div>
                <p className="text-foreground">{log.message}</p>
                <p className="text-muted-foreground mt-0.5">{log.event_type}</p>
              </div>
              <span className={`${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-green-400'}`}>{log.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}