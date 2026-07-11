import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { BrainCircuit, Database, FlaskConical, RefreshCcw, Tag, Upload } from 'lucide-react';

const EMPTY_LABELS = {
  memory_category: 'conversation',
  keywords: '',
  quality_score: 70,
  retrieval_score: 50,
};

export default function BotFineTuningWorkbench({ bots = [], globalPolicy }) {
  const [selectedBotId, setSelectedBotId] = useState('');
  const [datasetFile, setDatasetFile] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [semanticMemories, setSemanticMemories] = useState([]);
  const [selectedChunkId, setSelectedChunkId] = useState('');
  const [chunkLabels, setChunkLabels] = useState(EMPTY_LABELS);
  const [savingLabels, setSavingLabels] = useState(false);
  const [testCases, setTestCases] = useState([]);
  const [testRuns, setTestRuns] = useState([]);
  const [rerunning, setRerunning] = useState(false);

  const selectedBot = useMemo(() => bots.find((bot) => bot.id === selectedBotId) || null, [bots, selectedBotId]);
  const selectedChunk = useMemo(() => chunks.find((item) => item.id === selectedChunkId) || null, [chunks, selectedChunkId]);

  const loadBotData = async (botId) => {
    if (!botId) {
      setChunks([]);
      setSemanticMemories([]);
      setTestCases([]);
      setTestRuns([]);
      setSelectedChunkId('');
      return;
    }

    const [chunkRows, semanticRows, caseRows, runRows] = await Promise.all([
      base44.entities.BotMemoryChunk.filter({ bot_id: botId }, '-updated_date', 100).catch(() => []),
      base44.entities.BotSemanticMemory.filter({ bot_id: botId }, '-updated_date', 100).catch(() => []),
      base44.entities.BotTestCase.filter({ bot_id: botId }, '-updated_date', 100).catch(() => []),
      base44.entities.BotTestRun.filter({ bot_id: botId }, '-updated_date', 200).catch(() => []),
    ]);

    setChunks(chunkRows || []);
    setSemanticMemories(semanticRows || []);
    setTestCases(caseRows || []);
    setTestRuns(runRows || []);
    setSelectedChunkId((chunkRows || [])[0]?.id || '');
  };

  useEffect(() => {
    loadBotData(selectedBotId);
  }, [selectedBotId]);

  useEffect(() => {
    if (!selectedChunk) {
      setChunkLabels(EMPTY_LABELS);
      return;
    }

    setChunkLabels({
      memory_category: selectedChunk.memory_category || 'conversation',
      keywords: (selectedChunk.keywords || []).join(', '),
      quality_score: selectedChunk.quality_score ?? 70,
      retrieval_score: selectedChunk.retrieval_score ?? 50,
    });
  }, [selectedChunkId, selectedChunk]);

  const latestRunGroup = testRuns[0]?.run_group;
  const latestRuns = latestRunGroup ? testRuns.filter((item) => item.run_group === latestRunGroup) : [];
  const passRate = latestRuns.length ? Math.round((latestRuns.filter((item) => item.passed).length / latestRuns.length) * 100) : 0;

  const uploadDataset = async () => {
    if (!selectedBot || !datasetFile) return;
    setUploading(true);
    const uploaded = await base44.integrations.Core.UploadFile({ file: datasetFile });
    await base44.entities.BotSemanticMemory.create({
      source_type: 'bot_memory_chunk',
      source_id: `dataset_${Date.now()}`,
      bot_id: selectedBot.id,
      title: datasetName || datasetFile.name,
      summary: `Training dataset uploaded for ${selectedBot.name}`,
      search_text: `${datasetName || datasetFile.name} training dataset uploaded for ${selectedBot.name}`,
      keywords: ['training-dataset', 'fine-tuning', selectedBot.name],
      memory_category: 'knowledge',
      metadata: {
        file_url: uploaded.file_url,
        file_name: datasetFile.name,
        uploaded_for: selectedBot.id,
        global_policy_active: !!globalPolicy?.is_active,
      },
    });
    setDatasetFile(null);
    setDatasetName('');
    setUploading(false);
    loadBotData(selectedBot.id);
  };

  const saveChunkLabels = async () => {
    if (!selectedChunk) return;
    setSavingLabels(true);
    await Promise.all([
      base44.entities.BotMemoryChunk.update(selectedChunk.id, {
        memory_category: chunkLabels.memory_category,
        keywords: chunkLabels.keywords.split(',').map((item) => item.trim()).filter(Boolean),
        quality_score: Number(chunkLabels.quality_score),
        retrieval_score: Number(chunkLabels.retrieval_score),
      }),
      base44.entities.BotSemanticMemory.create({
        source_type: 'bot_memory_chunk',
        source_id: selectedChunk.id,
        bot_id: selectedChunk.bot_id,
        title: `Labeled memory chunk ${selectedChunk.chunk_key || selectedChunk.id}`,
        summary: selectedChunk.summary,
        search_text: `${selectedChunk.summary} ${chunkLabels.keywords}`.trim(),
        keywords: chunkLabels.keywords.split(',').map((item) => item.trim()).filter(Boolean),
        memory_category: chunkLabels.memory_category === 'system' ? 'knowledge' : 'conversation',
        quality_score: Number(chunkLabels.quality_score),
        retrieval_score: Number(chunkLabels.retrieval_score),
        metadata: {
          linked_chunk_id: selectedChunk.id,
          storage_tier: selectedChunk.storage_tier,
        },
      }),
    ]);
    setSavingLabels(false);
    loadBotData(selectedChunk.bot_id);
  };

  const rerunSuite = async () => {
    if (!selectedBot || testCases.length === 0) return;
    setRerunning(true);
    const runGroup = `manual_finetune_${Date.now()}`;

    for (const testCase of testCases.filter((item) => item.is_active !== false)) {
      const prompt = `You are ${selectedBot.name}. ${selectedBot.instructions || ''}\nPersonality: ${selectedBot.personality || 'helpful'}\nResponse style: ${selectedBot.response_style || 'detailed'}\n${globalPolicy?.is_active ? `Global instructions: ${globalPolicy.shared_instructions || 'None'}` : ''}\n\nUser: ${testCase.input}\n\n${selectedBot.name}:`;
      const actualOutput = await base44.integrations.Core.InvokeLLM({ prompt });
      const graded = await base44.integrations.Core.InvokeLLM({
        prompt: `Expected output:\n${testCase.expected_output}\n\nActual output:\n${actualOutput}\n\nReturn semantic similarity from 0 to 1 and a short reason.`,
        response_json_schema: {
          type: 'object',
          properties: {
            similarity_score: { type: 'number' },
            reason: { type: 'string' }
          },
          required: ['similarity_score', 'reason']
        }
      });
      const similarity = Number(graded.similarity_score || 0);
      await base44.entities.BotTestRun.create({
        bot_id: selectedBot.id,
        bot_name: selectedBot.name,
        test_case_id: testCase.id,
        test_title: testCase.title,
        input: testCase.input,
        expected_output: testCase.expected_output,
        actual_output: actualOutput,
        similarity_score: similarity,
        passed: similarity >= Number(testCase.min_similarity_score || 0.75),
        pass_rate_snapshot: similarity >= Number(testCase.min_similarity_score || 0.75) ? 100 : 0,
        regression_flag: false,
        regression_reason: graded.reason,
        run_group: runGroup,
        input_file_urls: testCase.input_file_urls || [],
        input_file_names: testCase.input_file_names || [],
      });
    }

    setRerunning(false);
    loadBotData(selectedBot.id);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Fine-Tuning Workbench</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Upload training datasets, label memory chunks, and re-run performance suites to track improvement.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <select value={selectedBotId} onChange={(e) => setSelectedBotId(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
          <option value="">Choose bot</option>
          {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
        </select>

        {selectedBot && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">Memory chunks <span className="block text-lg font-semibold text-foreground">{chunks.length}</span></div>
              <div className="rounded-xl border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">Datasets / semantic entries <span className="block text-lg font-semibold text-foreground">{semanticMemories.length}</span></div>
              <div className="rounded-xl border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">Latest suite pass rate <span className="block text-lg font-semibold text-foreground">{passRate}%</span></div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-foreground">Training dataset upload</p>
              </div>
              <input value={datasetName} onChange={(e) => setDatasetName(e.target.value)} placeholder="Dataset label" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-secondary px-3 py-3 text-xs text-muted-foreground">
                <Upload className="w-3.5 h-3.5" />
                {datasetFile ? datasetFile.name : 'Choose CSV, JSON, TXT, PDF, image, or spreadsheet'}
                <input type="file" onChange={(e) => setDatasetFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
              <button onClick={uploadDataset} disabled={!datasetFile || uploading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">
                <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading...' : 'Upload dataset'}
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-xl border border-border bg-background p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-foreground">Memory chunks</p>
                </div>
                <div className="space-y-2 max-h-[24rem] overflow-y-auto">
                  {chunks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No memory chunks found for this bot yet.</div>
                  ) : chunks.map((chunk) => (
                    <button key={chunk.id} onClick={() => setSelectedChunkId(chunk.id)} className={`w-full rounded-xl border p-3 text-left ${selectedChunkId === chunk.id ? 'border-primary bg-primary/5' : 'border-border bg-secondary/20'}`}>
                      <p className="text-xs font-semibold text-foreground truncate">{chunk.chunk_key || chunk.id}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-3">{chunk.summary}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-foreground">Chunk labeling</p>
                </div>
                {selectedChunk ? (
                  <>
                    <div className="rounded-xl border border-border bg-secondary/20 p-3">
                      <p className="text-[11px] font-medium text-foreground">{selectedChunk.chunk_key || selectedChunk.id}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{selectedChunk.summary}</p>
                    </div>
                    <select value={chunkLabels.memory_category} onChange={(e) => setChunkLabels((prev) => ({ ...prev, memory_category: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
                      <option value="conversation">Conversation</option>
                      <option value="preference">Preference</option>
                      <option value="fact">Fact</option>
                      <option value="task">Task</option>
                      <option value="strategy">Strategy</option>
                      <option value="system">System</option>
                    </select>
                    <input value={chunkLabels.keywords} onChange={(e) => setChunkLabels((prev) => ({ ...prev, keywords: e.target.value }))} placeholder="Keywords, comma separated" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
                    <input type="number" min="0" max="100" value={chunkLabels.quality_score} onChange={(e) => setChunkLabels((prev) => ({ ...prev, quality_score: e.target.value }))} placeholder="Quality score" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
                    <input type="number" min="0" max="100" value={chunkLabels.retrieval_score} onChange={(e) => setChunkLabels((prev) => ({ ...prev, retrieval_score: e.target.value }))} placeholder="Retrieval score" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
                    <button onClick={saveChunkLabels} disabled={savingLabels} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">
                      <Tag className="w-3.5 h-3.5" /> {savingLabels ? 'Saving...' : 'Save labels'}
                    </button>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Select a memory chunk to label it.</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-foreground">Performance suite</p>
                </div>
                <button onClick={rerunSuite} disabled={rerunning || testCases.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40">
                  <RefreshCcw className="w-3.5 h-3.5" /> {rerunning ? 'Re-running...' : 'Re-run test suite'}
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 text-[11px]">
                <div className="rounded-xl bg-secondary p-3 text-muted-foreground">Test cases <span className="font-semibold text-foreground">{testCases.length}</span></div>
                <div className="rounded-xl bg-secondary p-3 text-muted-foreground">Latest runs <span className="font-semibold text-foreground">{latestRuns.length}</span></div>
                <div className="rounded-xl bg-secondary p-3 text-muted-foreground">Pass rate <span className="font-semibold text-green-400">{passRate}%</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}