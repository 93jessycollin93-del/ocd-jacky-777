import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, FlaskConical, Play, MessageSquare, ArrowRight, CheckCircle2, AlertTriangle, Paperclip, X } from 'lucide-react';
import { invokeSelectedModel } from './modelRouting';
import SpeechToTextInput from './SpeechToTextInput.jsx';
import { base44 } from '@/eru/api/base44Client';

export default function BotTestingLabWidget({ bots = [], testCases = [], testRuns = [], globalPolicy }) {
  const [selectedBotId, setSelectedBotId] = useState('');
  const [manualPrompt, setManualPrompt] = useState('');
  const [manualResponse, setManualResponse] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualFiles, setManualFiles] = useState([]);

  const selectedBot = bots.find((bot) => bot.id === selectedBotId) || bots[0];

  const summaries = useMemo(() => bots.slice(0, 6).map((bot) => {
    const botCases = testCases.filter((item) => item.bot_id === bot.id);
    const botRuns = testRuns.filter((item) => item.bot_id === bot.id);
    const latestGroup = botRuns[0]?.run_group;
    const latestRuns = latestGroup ? botRuns.filter((item) => item.run_group === latestGroup) : [];
    const passedCount = latestRuns.filter((item) => item.passed).length;
    const passRate = latestRuns.length ? Math.round((passedCount / latestRuns.length) * 100) : 0;
    const regressions = latestRuns.filter((item) => item.regression_flag).length;
    return { bot, caseCount: botCases.length, passRate, regressions };
  }), [bots, testCases, testRuns]);

  const runManualTest = async () => {
    if (!selectedBot || (!manualPrompt.trim() && manualFiles.length === 0)) return;
    setManualLoading(true);
    const policyBlock = globalPolicy?.is_active ? `\nGlobal instructions: ${globalPolicy.shared_instructions || 'None'}` : '';
    const dataSourceSummary = (selectedBot.data_sources || []).length > 0
      ? (selectedBot.data_sources || []).map((source) => `${source.service || 'source'} (${source.mode || 'direct'}${source.resource_label ? ` · ${source.resource_label}` : ''})`).join(', ')
      : 'None';
    const uploadedUrls = await Promise.all(manualFiles.map(async (file) => {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response.file_url;
    }));
    const prompt = `You are ${selectedBot.name}. ${selectedBot.instructions || ''}\nPersonality: ${selectedBot.personality || 'helpful'}\nResponse style: ${selectedBot.response_style || 'detailed'}${policyBlock}\n\nConnected external/internal data sources: ${dataSourceSummary}\nUse them when relevant to the request and explain when your answer depends on those connected sources.\n\nUser: ${manualPrompt || 'Analyze the attached files.'}\nAttached files: ${manualFiles.length > 0 ? manualFiles.map((file) => file.name).join(', ') : 'None'}\n\n${selectedBot.name}:`;
    const result = await invokeSelectedModel({ provider: selectedBot.model_provider, model: selectedBot.model_name, prompt, botId: selectedBot.id, dataRequest: { mode: 'manual_test', sources: selectedBot.data_sources || [] }, file_urls: uploadedUrls }).catch(() => 'This bot needs its model connection set up before it can be tested here.');
    setManualResponse(result);
    setManualLoading(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Bot Test Station</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">Automated run visibility first, with file-based checks, external-data-aware testing, and quick manual chat validation.</p>
        </div>
        <Link to="/ailab" className="text-[11px] text-primary inline-flex items-center gap-1">
          Open lab <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-secondary/30 p-3">
          <p className="text-[11px] text-muted-foreground">Bots ready</p>
          <p className="text-lg font-semibold">{bots.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/30 p-3">
          <p className="text-[11px] text-muted-foreground">Automated cases</p>
          <p className="text-lg font-semibold">{testCases.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/30 p-3">
          <p className="text-[11px] text-muted-foreground">Recent runs</p>
          <p className="text-lg font-semibold">{testRuns.length}</p>
        </div>
      </div>

      <div className="space-y-2">
        {summaries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Create a bot in AI Lab to start testing.</div>
        ) : summaries.map(({ bot, caseCount, passRate, regressions }) => (
          <div key={bot.id} className="rounded-xl border border-border bg-secondary/20 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{bot.name}</p>
              <p className="text-[11px] text-muted-foreground">{caseCount} cases · {passRate}% pass rate · {regressions} regressions</p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              {passRate >= 80 ? <span className="inline-flex items-center gap-1 rounded-full bg-green-400/10 px-2 py-1 text-green-400"><CheckCircle2 className="w-3 h-3" />Healthy</span> : <span className="inline-flex items-center gap-1 rounded-full bg-red-400/10 px-2 py-1 text-red-400"><AlertTriangle className="w-3 h-3" />Needs work</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold">Quick manual bot check</p>
        </div>
        <select value={selectedBotId} onChange={(e) => setSelectedBotId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none">
          <option value="">Choose bot</option>
          {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
        </select>
        <SpeechToTextInput
          value={manualPrompt}
          onChange={setManualPrompt}
          placeholder="Ask a quick test question..."
        />
        {selectedBot && (selectedBot.data_sources || []).length > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
            This bot can use connected data sources during testing: {(selectedBot.data_sources || []).map((source) => source.resource_label || source.service).join(', ')}
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          <Paperclip className="w-3.5 h-3.5" /> Attach images or files
          <input type="file" multiple onChange={(e) => setManualFiles(Array.from(e.target.files || []))} className="hidden" />
        </label>
        {manualFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {manualFiles.map((file) => (
              <div key={file.name} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                {file.name}
                <button onClick={() => setManualFiles((prev) => prev.filter((item) => item.name !== file.name))} className="text-muted-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <button onClick={runManualTest} disabled={!selectedBot || ((!manualPrompt.trim() && manualFiles.length === 0) || manualLoading)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">
            <Play className="w-3.5 h-3.5" /> {manualLoading ? 'Testing...' : 'Run manual test'}
          </button>
          <Link to="/jackie" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            <Bot className="w-3.5 h-3.5" /> Open Jackie
          </Link>
        </div>
        {manualResponse && (
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Bot response</p>
            <p className="text-sm leading-relaxed text-foreground">{manualResponse}</p>
          </div>
        )}
      </div>
    </div>
  );
}