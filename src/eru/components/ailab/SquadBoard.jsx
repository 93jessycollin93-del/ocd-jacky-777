import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Network, Save, Trash2, Plus, Play, Users, Crown, Sparkles, Wand2, Bot, Zap, Route, BarChart3, ExternalLink, CopyPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import SquadAnalyticsPanel from './SquadAnalyticsPanel.jsx';
import SquadKnowledgePanel from './SquadKnowledgePanel.jsx';
import SquadCreationModes from './SquadCreationModes.jsx';
import SquadWizardProgress from './SquadWizardProgress.jsx';
import SquadOptimizationPanel from './SquadOptimizationPanel.jsx';
import SquadDeliveryPanel from './SquadDeliveryPanel.jsx';
import SquadOutputChart from './SquadOutputChart.jsx';
import SquadTemplateLibrary from './SquadTemplateLibrary.jsx';
import StarterTemplateBrowser from './StarterTemplateBrowser.jsx';
import SquadFormationBuilder from './SquadFormationBuilder.jsx';
import MemoryBankPanel from './MemoryBankPanel.jsx';
import SquadCostPanel from './SquadCostPanel.jsx';
import { estimateSquadRunCost } from './squadCostEstimation';
import { routeTaskToGroup } from './taskGroupRouting';
import { STARTER_SQUAD_TEMPLATES } from './starterSquadTemplates';

const ROLE_EMOJI = { assistant: '🤖', trader: '📈', game_helper: '🎮', social: '💬', security: '🛡️', custom: '⚙️' };
const ROLE_KEYWORDS = {
  trader: ['market', 'finance', 'pricing', 'revenue', 'forecast', 'trade', 'sales'],
  social: ['community', 'social', 'brand', 'content', 'campaign', 'engagement', 'customer'],
  security: ['security', 'risk', 'audit', 'compliance', 'breach', 'permissions', 'vulnerability'],
  game_helper: ['game', 'player', 'quest', 'balance', 'arena', 'cards'],
  assistant: ['plan', 'strategy', 'operations', 'project', 'workflow'],
  custom: [],
};
const BLANK_STEP = { id: '', title: '', instruction: '', assigned_bot_id: '' };
const BLANK_SQUAD = {
  name: '',
  description: '',
  master_bot_id: '',
  member_bot_ids: [],
  leader_bot_id: '',
  commander_bot_ids: [],
  security_bot_ids: [],
  task_groups: [
    { id: 'group_1', name: 'Group 1', purpose: '', task_instruction: '', bot_ids: [] },
    { id: 'group_2', name: 'Group 2', purpose: '', task_instruction: '', bot_ids: [] },
    { id: 'group_3', name: 'Group 3', purpose: '', task_instruction: '', bot_ids: [] },
    { id: 'group_4', name: 'Group 4', purpose: '', task_instruction: '', bot_ids: [] },
  ],
  shared_context: '',
  pipeline_steps: [],
  execution_history: [],
  memory_pool: [],
  status: 'draft',
};

function BotBadge({ bot, active }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${active ? 'border-primary bg-primary/10' : 'border-border bg-secondary'}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">{ROLE_EMOJI[bot.role] || '🤖'}</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">{bot.name}</p>
          <p className="text-[10px] capitalize text-muted-foreground">{bot.role}</p>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ item, onAdd }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">{ROLE_EMOJI[item.bot.role] || '🤖'}</span>
            <p className="text-xs font-semibold text-foreground">{item.bot.name}</p>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground capitalize">{item.bot.role} · Level {item.level} · {item.bot.xp || 0} XP</p>
          <p className="mt-2 text-[11px] text-muted-foreground">{item.reason}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-primary">{item.score}</p>
          <button
            onClick={() => onAdd(item.bot.id)}
            className="mt-2 rounded-lg border border-primary/20 bg-background px-2 py-1 text-[10px] font-medium text-primary"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function extractMatchedKeywords(goal) {
  const lowerGoal = (goal || '').toLowerCase();
  return Array.from(new Set(Object.values(ROLE_KEYWORDS).flat().filter((word) => lowerGoal.includes(word))));
}

function scoreKnowledgeMatch(goal, entry) {
  const goalWords = (goal || '').toLowerCase().split(/\s+/).filter((word) => word.length > 3);
  const haystack = [entry.goal, entry.result_summary, ...(entry.keywords || [])].join(' ').toLowerCase();
  return goalWords.reduce((total, word) => total + (haystack.includes(word) ? 8 : 0), 0) + ((entry.keywords || []).filter((keyword) => (goal || '').toLowerCase().includes(keyword.toLowerCase())).length * 12);
}

export default function SquadBoard({ bots }) {
  const [squads, setSquads] = useState([]);
  const [form, setForm] = useState(BLANK_SQUAD);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runInput, setRunInput] = useState({});
  const [runningId, setRunningId] = useState(null);
  const [runOutput, setRunOutput] = useState({});
  const [recommendGoal, setRecommendGoal] = useState('');
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [pinnedMemoryIds, setPinnedMemoryIds] = useState([]);
  const [creationMode, setCreationMode] = useState('manual');
  const [wizardStep, setWizardStep] = useState(1);
  const [creatingInstant, setCreatingInstant] = useState(false);
  const [wizardAnalysis, setWizardAnalysis] = useState(null);

  const activeBots = useMemo(() => bots.filter((bot) => (bot.status || 'active') === 'active'), [bots]);
  const selectableBots = useMemo(() => activeBots.filter((bot) => bot.id !== form.master_bot_id), [activeBots, form.master_bot_id]);

  const loadSquads = async () => {
    setLoading(true);
    const [rows, knowledge, templateRows] = await Promise.all([
      base44.entities.BotSquad.list('-updated_date', 100),
      base44.entities.SquadKnowledge.list('-updated_date', 100),
      base44.entities.SquadTemplate.list('-updated_date', 100),
    ]);
    setSquads(rows);
    setKnowledgeItems(knowledge);
    setTemplates(templateRows);
    setLoading(false);
  };

  useEffect(() => {
    loadSquads();
  }, []);

  const resetForm = () => {
    setForm(BLANK_SQUAD);
    setEditingId(null);
    setRecommendGoal('');
    setCreationMode('manual');
    setWizardStep(1);
  };

  const toggleMember = (botId) => {
    setForm((prev) => ({
      ...prev,
      member_bot_ids: prev.member_bot_ids.includes(botId)
        ? prev.member_bot_ids.filter((id) => id !== botId)
        : [...prev.member_bot_ids, botId],
    }));
  };

  const addRecommendedBot = (botId) => {
    if (botId === form.master_bot_id) return;
    setForm((prev) => ({
      ...prev,
      member_bot_ids: prev.member_bot_ids.includes(botId) ? prev.member_bot_ids : [...prev.member_bot_ids, botId],
    }));
  };

  const addStep = () => {
    setForm((prev) => ({
      ...prev,
      pipeline_steps: [...prev.pipeline_steps, { ...BLANK_STEP, id: `step_${Date.now()}` }],
    }));
  };

  const updateStep = (stepId, next) => {
    setForm((prev) => ({
      ...prev,
      pipeline_steps: prev.pipeline_steps.map((step) => step.id === stepId ? { ...step, ...next } : step),
    }));
  };

  const removeStep = (stepId) => {
    setForm((prev) => ({
      ...prev,
      pipeline_steps: prev.pipeline_steps.filter((step) => step.id !== stepId),
    }));
  };

  const getKeywordMatches = (goal, role) => {
    const lowerGoal = goal.toLowerCase();
    return (ROLE_KEYWORDS[role] || []).filter((word) => lowerGoal.includes(word)).length;
  };

  const getHistoryScore = (goal, botId) => {
    return (form.execution_history || []).reduce((total, item) => {
      const goalText = (item.goal || '').toLowerCase();
      const goalMatch = goalText && goal.toLowerCase().split(' ').some((word) => word.length > 3 && goalText.includes(word));
      const successMatch = (item.successful_bot_ids || []).includes(botId);
      return total + (goalMatch && successMatch ? 18 : successMatch ? 8 : 0);
    }, 0);
  };

  const getMemoryScore = (goal, botId) => {
    const goalKeywords = extractMatchedKeywords(goal);
    const localScore = (form.memory_pool || []).reduce((total, memory) => {
      const botMatch = (memory.bot_ids || []).includes(botId);
      if (!botMatch) return total;
      const sharedKeywords = (memory.keywords || []).filter((keyword) => goalKeywords.includes(keyword)).length;
      return total + (sharedKeywords > 0 ? sharedKeywords * 10 : 4);
    }, 0);

    const globalScore = knowledgeItems.reduce((total, memory) => {
      const botMatch = (memory.bot_ids || []).includes(botId);
      if (!botMatch) return total;
      const sharedKeywords = (memory.keywords || []).filter((keyword) => goalKeywords.includes(keyword)).length;
      return total + (sharedKeywords > 0 ? sharedKeywords * 12 : 5);
    }, 0);

    return localScore + globalScore;
  };

  const rankedBots = useMemo(() => {
    const goal = recommendGoal.trim() || form.description.trim();
    if (!goal) return [];

    return activeBots
      .map((bot) => {
        const level = bot.level || Math.max(1, Math.floor((bot.xp || 0) / 100) + 1);
        const keywordMatches = getKeywordMatches(goal, bot.role);
        const historyScore = getHistoryScore(goal, bot.id);
        const memoryScore = getMemoryScore(goal, bot.id);
        const xpScore = Math.min(30, Math.floor((bot.xp || 0) / 20));
        const roleScore = keywordMatches * 12;
        const score = roleScore + xpScore + historyScore + memoryScore + level * 2;
        const reasonBits = [];
        if (keywordMatches > 0) reasonBits.push(`role fits ${keywordMatches} goal keywords`);
        if (historyScore > 0) reasonBits.push('performed well on earlier squad runs');
        if (memoryScore > 0) reasonBits.push('boosted by shared squad memory');
        if (xpScore > 0) reasonBits.push(`strong experience score from ${bot.xp || 0} XP`);
        if (reasonBits.length === 0) reasonBits.push('good general-purpose backup specialist');

        return {
          bot,
          level,
          score,
          reason: reasonBits.join(' · '),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [activeBots, form.description, form.execution_history, form.memory_pool, knowledgeItems, recommendGoal]);

  const recommendations = useMemo(() => {
    return rankedBots
      .filter((item) => item.bot.id !== form.master_bot_id && !form.member_bot_ids.includes(item.bot.id))
      .slice(0, 4);
  }, [form.master_bot_id, form.member_bot_ids, rankedBots]);

  const wizardRecommendation = useMemo(() => {
    if ((recommendGoal.trim() || form.description.trim()) === '' || rankedBots.length === 0) return null;
    const master = rankedBots[0];
    const members = rankedBots.slice(1, 4);
    return {
      masterBotId: master?.bot.id || '',
      masterBotName: master?.bot.name || '',
      memberBotIds: members.map((item) => item.bot.id),
      memberBotNames: members.map((item) => item.bot.name),
      reason: [master?.reason, members[0]?.reason, members[1]?.reason].filter(Boolean).join(' · '),
    };
  }, [form.description, rankedBots, recommendGoal]);

  const proactiveKnowledgeMatches = useMemo(() => {
    const goal = recommendGoal.trim() || form.description.trim();
    if (!goal) return [];
    return knowledgeItems
      .map((item) => ({ ...item, score: scoreKnowledgeMatch(goal, item) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [form.description, knowledgeItems, recommendGoal]);

  const memoryBankEntries = useMemo(() => {
    if (!knowledgeSearch.trim()) return knowledgeItems;
    const parts = knowledgeSearch.toLowerCase().split(' ').filter((word) => word.length > 1);
    return knowledgeItems.filter((entry) => {
      const text = [entry.goal, entry.result_summary, entry.source_squad_name, ...(entry.keywords || [])].join(' ').toLowerCase();
      return parts.every((part) => text.includes(part));
    });
  }, [knowledgeItems, knowledgeSearch]);

  const wizardGoalAnalysis = useMemo(() => {
    const goal = recommendGoal.trim() || form.description.trim();
    if (!goal) return null;
    const keywords = extractMatchedKeywords(goal);
    return {
      summary: keywords.length > 0 ? `This goal is most aligned with ${keywords.join(', ')} workstreams and should use the highest-performing specialists in those areas.` : 'This goal is broad, so the wizard will prioritize the bots with the strongest overall past squad performance.',
      keywords,
    };
  }, [form.description, recommendGoal]);

  const squadAnalytics = useMemo(() => {
    const histories = squads.flatMap((squad) => (squad.execution_history || []).map((entry) => ({ ...entry, squad })));
    const totalRuns = histories.length;
    if (totalRuns === 0) {
      return { botRows: [], keywordRows: [] };
    }

    const botRows = bots
      .map((bot) => {
        const successes = histories.filter((entry) => (entry.successful_bot_ids || []).includes(bot.id));
        if (successes.length === 0) return null;
        const keywordCounts = {};
        successes.forEach((entry) => {
          extractMatchedKeywords(entry.goal).forEach((keyword) => {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
          });
        });

        return {
          bot,
          successes: successes.length,
          successRate: Math.round((successes.length / totalRuns) * 100),
          topKeywords: Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([keyword]) => keyword),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.successRate - a.successRate || b.successes - a.successes)
      .slice(0, 8);

    const keywordMap = {};
    histories.forEach((entry) => {
      const keywords = extractMatchedKeywords(entry.goal);
      keywords.forEach((keyword) => {
        if (!keywordMap[keyword]) keywordMap[keyword] = { count: 0, bots: {} };
        keywordMap[keyword].count += 1;
        (entry.successful_bot_ids || []).forEach((botId) => {
          keywordMap[keyword].bots[botId] = (keywordMap[keyword].bots[botId] || 0) + 1;
        });
      });
    });

    const keywordRows = Object.entries(keywordMap)
      .map(([keyword, value]) => {
        const [topBotId] = Object.entries(value.bots).sort((a, b) => b[1] - a[1])[0] || [];
        const topBot = bots.find((bot) => bot.id === topBotId);
        return {
          keyword,
          count: value.count,
          topBotName: topBot?.name || 'Unknown',
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return { botRows, keywordRows };
  }, [bots, squads]);

  const draftCostEstimate = useMemo(() => estimateSquadRunCost({ squad: form, bots, runGoal: recommendGoal || form.description || '' }), [bots, form, recommendGoal]);

  const buildAutomaticSquad = () => {
    const goal = recommendGoal.trim() || form.description.trim();
    const suggestedMaster = wizardRecommendation ? rankedBots.find((item) => item.bot.id === wizardRecommendation.masterBotId)?.bot : recommendations[0]?.bot || activeBots[0];
    const suggestedMembers = wizardRecommendation?.memberBotIds || recommendations.slice(1, 4).map((item) => item.bot.id);
    const keywords = extractMatchedKeywords(goal);
    const matchedKnowledge = proactiveKnowledgeMatches[0];

    return {
      ...form,
      name: form.name.trim() || (goal ? `${goal.slice(0, 32)} squad` : 'Auto squad'),
      description: form.description.trim() || goal,
      shared_context: form.shared_context.trim() || `Primary goal: ${goal || 'Coordinate specialists effectively.'}${matchedKnowledge ? ` Reuse lessons from ${matchedKnowledge.source_squad_name}.` : ''}`,
      master_bot_id: form.master_bot_id || suggestedMaster?.id || '',
      member_bot_ids: form.member_bot_ids.length > 0 ? form.member_bot_ids : suggestedMembers,
      leader_bot_id: form.leader_bot_id || suggestedMaster?.id || '',
      commander_bot_ids: form.commander_bot_ids?.length ? form.commander_bot_ids : rankedBots.slice(1, 3).map((item) => item.bot.id),
      security_bot_ids: form.security_bot_ids?.length ? form.security_bot_ids : rankedBots.filter((item) => item.bot.role === 'security').slice(0, 2).map((item) => item.bot.id),
      task_groups: form.task_groups?.some((group) => (group.bot_ids || []).length > 0 || group.task_instruction) ? form.task_groups : [
        { id: 'group_1', name: 'Group 1', purpose: 'Primary execution', task_instruction: goal || 'Main task execution', bot_ids: rankedBots.slice(0, 5).map((item) => item.bot.id) },
        { id: 'group_2', name: 'Group 2', purpose: 'Support execution', task_instruction: goal || 'Main task execution', bot_ids: rankedBots.slice(5, 10).map((item) => item.bot.id) },
        { id: 'group_3', name: 'Group 3', purpose: 'Special analysis', task_instruction: `Analyze and extend: ${goal || 'current objective'}`, bot_ids: rankedBots.slice(10, 15).map((item) => item.bot.id) },
        { id: 'group_4', name: 'Group 4', purpose: 'Delivery and QA', task_instruction: `Validate and finalize: ${goal || 'current objective'}`, bot_ids: rankedBots.slice(15, 20).map((item) => item.bot.id) },
      ],
      pipeline_steps: form.pipeline_steps.length > 0 ? form.pipeline_steps : matchedKnowledge ? [
        { id: `step_${Date.now()}_1`, title: 'Reuse proven plan', instruction: `Review the successful pattern from ${matchedKnowledge.source_squad_name} for this goal: ${matchedKnowledge.goal}.`, assigned_bot_id: suggestedMaster?.id || '' },
        { id: `step_${Date.now()}_2`, title: 'Adapt winning strategy', instruction: `Adapt this successful strategy to the current task: ${matchedKnowledge.result_summary}.`, assigned_bot_id: suggestedMembers[0] || '' },
        { id: `step_${Date.now()}_3`, title: 'Deliver optimized output', instruction: 'Combine the proven structure with the current request and produce the best final answer.', assigned_bot_id: suggestedMaster?.id || '' },
      ] : [
        { id: `step_${Date.now()}_1`, title: 'Analyze goal', instruction: `Break down the request and identify the key priorities: ${goal || 'general coordination'}.`, assigned_bot_id: suggestedMaster?.id || '' },
        { id: `step_${Date.now()}_2`, title: 'Specialist support', instruction: `Contribute specialist recommendations for: ${keywords.join(', ') || goal || 'the request'}.`, assigned_bot_id: suggestedMembers[0] || '' },
        { id: `step_${Date.now()}_3`, title: 'Final synthesis', instruction: 'Merge findings into one clear coordinated output.', assigned_bot_id: suggestedMaster?.id || '' },
      ],
      execution_history: form.execution_history || [],
      memory_pool: form.memory_pool || [],
      status: form.status || 'draft',
    };
  };

  const [saveError, setSaveError] = useState('');

  const saveSquad = async (payloadOverride) => {
    const source = payloadOverride || form;
    const safeName = (source?.name || '').trim();
    const safeDescription = (source?.description || '').trim();
    const safeSharedContext = (source?.shared_context || '').trim();
    const safePipelineSteps = (source?.pipeline_steps || []).filter((step) => ((step?.title || '').trim()) || ((step?.instruction || '').trim()));

    if (!safeName || !source?.master_bot_id) return;
    const payload = {
      ...source,
      name: safeName,
      description: safeDescription,
      shared_context: safeSharedContext,
      pipeline_steps: safePipelineSteps,
      execution_history: source?.execution_history || [],
      memory_pool: source?.memory_pool || [],
    };

    setSaveError('');
    try {
      if (editingId) {
        await base44.entities.BotSquad.update(editingId, payload);
      } else {
        await base44.entities.BotSquad.create(payload);
      }
      await loadSquads();
      resetForm();
    } catch (err) {
      setSaveError(err?.message || 'Could not save this squad. Please try again.');
    }
  };

  const applyAutomaticSetup = () => {
    const autoSquad = buildAutomaticSquad();
    setForm(autoSquad);
    setWizardAnalysis(wizardGoalAnalysis);
    setCreationMode('manual');
  };

  const applyWizardRecommendation = () => {
    const autoSquad = buildAutomaticSquad();
    setForm(autoSquad);
    setWizardAnalysis(wizardGoalAnalysis);
  };

  const createInstantSquad = async () => {
    setCreatingInstant(true);
    const autoSquad = buildAutomaticSquad();
    await saveSquad(autoSquad);
    setCreatingInstant(false);
  };

  const editSquad = (squad) => {
    setEditingId(squad.id);
    setCreationMode('manual');
    setWizardStep(1);
    setForm({
      name: squad.name || '',
      description: squad.description || '',
      master_bot_id: squad.master_bot_id || '',
      member_bot_ids: squad.member_bot_ids || [],
      leader_bot_id: squad.leader_bot_id || squad.master_bot_id || '',
      commander_bot_ids: squad.commander_bot_ids || [],
      security_bot_ids: squad.security_bot_ids || [],
      task_groups: squad.task_groups || BLANK_SQUAD.task_groups,
      shared_context: squad.shared_context || '',
      pipeline_steps: (squad.pipeline_steps || []).map((step) => ({
        id: step.id || `step_${Date.now()}_${Math.random()}`,
        title: step.title || '',
        instruction: step.instruction || '',
        assigned_bot_id: step.assigned_bot_id || '',
      })),
      execution_history: squad.execution_history || [],
      memory_pool: squad.memory_pool || [],
      status: squad.status || 'draft',
    });
    setRecommendGoal(squad.description || '');
  };

  const deleteSquad = async (id) => {
    await base44.entities.BotSquad.delete(id);
    if (editingId === id) resetForm();
    await loadSquads();
  };

  const togglePinnedMemory = (entryId) => {
    setPinnedMemoryIds((prev) => prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]);
  };

  const saveAsTemplate = async (squad) => {
    await base44.entities.SquadTemplate.create({
      name: `${squad.name} template`,
      description: squad.description || '',
      source_squad_id: squad.id,
      source_squad_name: squad.name,
      master_bot_id: squad.master_bot_id,
      member_bot_ids: squad.member_bot_ids || [],
      leader_bot_id: squad.leader_bot_id || squad.master_bot_id || '',
      commander_bot_ids: squad.commander_bot_ids || [],
      security_bot_ids: squad.security_bot_ids || [],
      task_groups: (squad.task_groups || []).map((group) => ({
        id: group.id || `group_${Date.now()}_${Math.random()}`,
        name: group.name || '',
        purpose: group.purpose || '',
        task_instruction: group.task_instruction || '',
        bot_ids: group.bot_ids || [],
      })),
      shared_context: squad.shared_context || '',
      pipeline_steps: (squad.pipeline_steps || []).map((step) => ({
        id: step.id || `step_${Date.now()}_${Math.random()}`,
        title: step.title || '',
        instruction: step.instruction || '',
        assigned_bot_id: step.assigned_bot_id || '',
      })),
    });
    await loadSquads();
  };

  const cloneTemplate = (template) => {
    setEditingId(null);
    setCreationMode('manual');
    setWizardStep(1);
    setForm({
      name: `${template.name} copy`,
      description: template.description || '',
      master_bot_id: template.master_bot_id || '',
      member_bot_ids: template.member_bot_ids || [],
      leader_bot_id: template.leader_bot_id || template.master_bot_id || '',
      commander_bot_ids: template.commander_bot_ids || [],
      security_bot_ids: template.security_bot_ids || [],
      task_groups: template.task_groups || BLANK_SQUAD.task_groups,
      shared_context: template.shared_context || '',
      pipeline_steps: (template.pipeline_steps || []).map((step) => ({
        id: `step_${Date.now()}_${Math.random()}`,
        title: step.title || '',
        instruction: step.instruction || '',
        assigned_bot_id: step.assigned_bot_id || '',
      })),
      execution_history: [],
      memory_pool: [],
      status: 'draft',
    });
    setRecommendGoal(template.description || '');
  };

  const applyStarterTemplate = (template) => {
    const findBotByRole = (role, excludeIds = []) => activeBots.find((bot) => bot.role === role && !excludeIds.includes(bot.id));
    const masterBot = findBotByRole(template.recommended_roles?.master) || activeBots[0];
    const usedIds = masterBot ? [masterBot.id] : [];
    const memberBotIds = (template.recommended_roles?.members || [])
      .map((role) => {
        const match = findBotByRole(role, usedIds);
        if (match) usedIds.push(match.id);
        return match?.id;
      })
      .filter(Boolean);
    const commanderBotIds = (template.recommended_roles?.commanders || [])
      .map((role) => findBotByRole(role, [] )?.id)
      .filter(Boolean)
      .slice(0, 2);
    const securityBotIds = (template.recommended_roles?.security || [])
      .map((role) => findBotByRole(role, [])?.id)
      .filter(Boolean)
      .slice(0, 2);

    const groupBotPool = Array.from(new Set([masterBot?.id, ...memberBotIds, ...commanderBotIds, ...securityBotIds].filter(Boolean)));
    const nextTaskGroups = (template.task_groups || []).map((group) => ({
      id: group.id,
      name: group.name,
      purpose: group.purpose,
      task_instruction: group.task_instruction,
      bot_ids: groupBotPool.filter((botId) => {
        const bot = activeBots.find((item) => item.id === botId);
        return group.role_targets?.includes(bot?.role);
      }).slice(0, 5),
    }));

    setEditingId(null);
    setCreationMode('manual');
    setWizardStep(1);
    setForm({
      ...BLANK_SQUAD,
      name: template.name,
      description: template.description,
      master_bot_id: masterBot?.id || '',
      leader_bot_id: masterBot?.id || '',
      member_bot_ids: memberBotIds,
      commander_bot_ids: commanderBotIds,
      security_bot_ids: securityBotIds,
      task_groups: nextTaskGroups,
      shared_context: template.shared_context || '',
      pipeline_steps: (template.pipeline_steps || []).map((step) => ({
        id: `step_${Date.now()}_${Math.random()}`,
        title: step.title,
        instruction: step.instruction,
        assigned_bot_id: masterBot?.id || '',
      })),
    });
    setRecommendGoal(template.description || '');
  };

  const runSquad = async (squad) => {
    const task = runInput[squad.id]?.trim();
    if (!task) return;

    const masterBot = bots.find((bot) => bot.id === squad.master_bot_id);
    setRunningId(squad.id);

    const pinnedKnowledge = knowledgeItems.filter((item) => pinnedMemoryIds.includes(item.id));
    const matchingKnowledge = knowledgeItems
      .map((item) => ({ ...item, score: scoreKnowledgeMatch(task, item) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    const injectedKnowledge = [...pinnedKnowledge, ...matchingKnowledge.filter((item) => !pinnedMemoryIds.includes(item.id))].slice(0, 4);

    const optimizationNote = injectedKnowledge.length > 0
      ? `Knowledge injected: ${injectedKnowledge.map((item) => `${item.source_squad_name} (${item.goal})`).join(' | ')}`
      : 'No direct knowledge base match found.';

    const stepOutputs = [];
    const successfulBotIds = [];
    const groupLoad = Object.fromEntries((squad.task_groups || []).map((group) => [group.id, 0]));
    for (const step of (squad.pipeline_steps || [])) {
      const routedGroup = routeTaskToGroup(`${task} ${step.title} ${step.instruction}`, squad.task_groups || [], groupLoad);
      const routedBot = routedGroup
        ? bots.find((bot) => (routedGroup.bot_ids || []).includes(bot.id))
        : null;
      const assignedBot = routedBot || bots.find((bot) => bot.id === step.assigned_bot_id) || masterBot;
      if (!assignedBot) continue;
      if (routedGroup) {
        groupLoad[routedGroup.id] = (groupLoad[routedGroup.id] || 0) + 1;
      }

      const stepResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are ${assignedBot.name}. ${assignedBot.instructions || ''}
Personality: ${assignedBot.personality || 'helpful'}
Shared squad context: ${squad.shared_context || 'None'}
Squad request: ${task}
Pipeline step: ${step.title}
Step instruction: ${step.instruction}
Routed task group: ${routedGroup?.name || 'Default squad routing'}
Group purpose: ${routedGroup?.purpose || 'General execution'}
Group instruction: ${routedGroup?.task_instruction || 'No extra group instruction'}
${optimizationNote}
${injectedKnowledge.map((item, index) => `Memory bank entry ${index + 1}: ${item.result_summary}`).join('\n')}

Provide a concise specialist response for this step.`
      });

      stepOutputs.push({
        step_title: step.title,
        bot_name: assignedBot.name,
        bot_id: assignedBot.id,
        routed_group_id: routedGroup?.id || '',
        routed_group_name: routedGroup?.name || '',
        output: stepResult,
      });
      successfulBotIds.push(assignedBot.id);
    }

    const finalResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are ${masterBot?.name || 'the master bot'}. ${masterBot?.instructions || ''}
Shared squad context: ${squad.shared_context || 'None'}
Cross-department request: ${task}
Squad description: ${squad.description || squad.name}
${optimizationNote}
${injectedKnowledge.map((item, index) => `Relevant memory bank success ${index + 1}: ${item.result_summary}`).join('\n')}
Specialist pipeline outputs:
${stepOutputs.map((item) => `${item.step_title} — ${item.bot_name}: ${item.output}`).join('\n\n')}

Create a final coordinated answer with these sections: Executive Summary, Department Findings, Recommended Pipeline Next Steps.`
    });

    const now = new Date().toISOString();
    const stepsTotal = (squad.pipeline_steps || []).length;
    const stepsCompleted = stepOutputs.length;
    const successRate = stepsTotal > 0 ? Math.round((stepsCompleted / stepsTotal) * 100) : 100;
    const estimatedRoi = Math.max(10, Math.min(250, successRate + (successfulBotIds.length * 8) + (matchingKnowledge.length * 12)));
    const updatedHistory = [
      {
        goal: task,
        created_at: now,
        successful_bot_ids: Array.from(new Set(successfulBotIds)),
        run_label: `${squad.name} run`,
        success_rate: successRate,
        estimated_roi: estimatedRoi,
        pipeline_steps_completed: stepsCompleted,
        pipeline_steps_total: stepsTotal,
        final_output: finalResponse,
      },
      ...((squad.execution_history || []).slice(0, 9)),
    ];

    const generatedTags = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this squad run result and extract search-friendly metadata.

Goal: ${task}
Squad name: ${squad.name}
Final output:\n${finalResponse}

Return:
- 6 to 10 concise keywords
- 1 category from: strategy, operations, research, marketing, sales, product, support, finance, security, general

Prefer practical business/search terms and avoid vague words.`,
      response_json_schema: {
        type: 'object',
        properties: {
          ai_keywords: {
            type: 'array',
            items: { type: 'string' }
          },
          category: {
            type: 'string'
          }
        },
        required: ['ai_keywords', 'category']
      }
    });

    const mergedKeywords = Array.from(new Set([
      ...extractMatchedKeywords(task),
      ...((generatedTags?.ai_keywords || []).map((item) => item.trim()).filter(Boolean)),
    ])).slice(0, 12);

    const updatedMemoryPool = [
      {
        goal: task,
        keywords: mergedKeywords,
        bot_ids: Array.from(new Set(successfulBotIds)),
        result_summary: finalResponse.slice(0, 500),
        created_at: now,
      },
      ...((squad.memory_pool || []).slice(0, 14)),
    ];

    await Promise.all([
      base44.entities.BotSquad.update(squad.id, { execution_history: updatedHistory, memory_pool: updatedMemoryPool }),
      base44.entities.SquadKnowledge.create({
        source_squad_id: squad.id,
        source_squad_name: squad.name,
        goal: task,
        keywords: mergedKeywords,
        ai_keywords: generatedTags?.ai_keywords || [],
        category: generatedTags?.category || 'general',
        bot_ids: Array.from(new Set(successfulBotIds)),
        result_summary: finalResponse.slice(0, 500),
        final_output: finalResponse,
      }),
    ]);

    if (squad.delivery_enabled && (squad.delivery_targets || []).length > 0) {
      await base44.functions.invoke('deliverSquadOutput', {
        squadId: squad.id,
        squadName: squad.name,
        goal: task,
        finalOutput: finalResponse,
        deliveryTargets: squad.delivery_targets || [],
      });
    }

    await loadSquads();

    setRunOutput((prev) => ({
      ...prev,
      [squad.id]: {
        steps: stepOutputs,
        final: finalResponse,
      },
    }));
    setRunningId(null);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-primary mb-1">Squads</p>
            <p className="text-[10px] text-muted-foreground">Group specialist bots, define shared context, create reusable pipelines, and get smart member recommendations.</p>
          </div>
          <Link to="/squad-performance" className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-background px-3 py-2 text-[11px] font-medium text-primary">
            <BarChart3 className="w-3.5 h-3.5" /> Performance <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-foreground">{editingId ? 'Edit squad' : 'New squad'}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Choose how to create a squad: manual, automatic setup, instant auto create, or guided wizard.</p>
        </div>

        <SquadCreationModes mode={creationMode} onChange={setCreationMode} />

        {creationMode === 'automatic' && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">Automatic squad setup</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Describe the goal, then apply a suggested squad with recommended bots and starter pipeline steps.</p>
            {recommendGoal.trim() === '' && form.description.trim() === '' && (
              <p className="text-[10px] text-muted-foreground">Tip: add a squad description or recommendation goal first for better results.</p>
            )}
            <button
              onClick={applyAutomaticSetup}
              disabled={recommendations.length === 0 && !activeBots.length}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Bot className="w-3.5 h-3.5" /> Apply automatic setup
            </button>
            {templates.length > 0 && (
              <div className="rounded-xl border border-primary/20 bg-background p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saved library templates</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {templates.slice(0, 4).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => cloneTemplate(template)}
                      className="rounded-xl border border-border bg-secondary/40 p-3 text-left hover:border-primary/30"
                    >
                      <p className="text-xs font-semibold text-foreground">{template.name}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{template.description || 'Reusable squad template'}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {creationMode === 'instant' && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">Instant auto create</p>
            </div>
            <p className="text-[10px] text-muted-foreground">This creates a ready-to-run squad immediately from your goal and the best available bots.</p>
            <button
              onClick={createInstantSquad}
              disabled={creatingInstant || (!recommendGoal.trim() && !form.description.trim()) || !activeBots.length}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5" /> {creatingInstant ? 'Creating…' : 'Create instantly'}
            </button>
          </div>
        )}

        {creationMode === 'wizard' && (
          <div className="rounded-xl border border-border bg-background p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">Guided wizard</p>
            </div>
            <SquadWizardProgress step={wizardStep} onStepChange={setWizardStep} />
            <SquadOptimizationPanel
              analysis={wizardGoalAnalysis || wizardAnalysis}
              recommendation={wizardRecommendation}
              knowledgeMatches={proactiveKnowledgeMatches}
              onApplyRecommendation={applyWizardRecommendation}
            />
          </div>
        )}

        {(creationMode !== 'wizard' || wizardStep >= 1) && (
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Squad name"
            className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none"
          />
        )}

        {(creationMode !== 'wizard' || wizardStep >= 1) && (
          <textarea
            value={form.description}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, description: e.target.value }));
              setRecommendGoal(e.target.value);
            }}
            placeholder="What kind of requests this squad handles"
            className="min-h-[72px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none resize-none"
          />
        )}

        {(creationMode !== 'wizard' || wizardStep >= 1) && (
          <textarea
            value={form.shared_context}
            onChange={(e) => setForm((prev) => ({ ...prev, shared_context: e.target.value }))}
            placeholder="Shared context for all bots in this squad"
            className="min-h-[90px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none resize-none"
          />
        )}

        {(creationMode !== 'wizard' || wizardStep === 1 || wizardStep > 1) && (
          <div className="space-y-2 rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">Recommend specialists</p>
            </div>
            <input
              value={recommendGoal}
              onChange={(e) => setRecommendGoal(e.target.value)}
              placeholder="Describe the squad goal to get recommended bots"
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none"
            />
            {recommendations.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2">
                {recommendations.map((item) => (
                  <RecommendationCard key={item.bot.id} item={item} onAdd={addRecommendedBot} />
                ))}
              </div>
            )}
          </div>
        )}

        {(creationMode !== 'wizard' || wizardStep >= 2) && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Master bot</p>
            <div className="grid gap-2 md:grid-cols-2">
              {activeBots.map((bot) => (
                <button
                  key={bot.id}
                  onClick={() => setForm((prev) => ({
                    ...prev,
                    master_bot_id: bot.id,
                    member_bot_ids: prev.member_bot_ids.filter((id) => id !== bot.id),
                  }))}
                  className={`rounded-xl border p-0 text-left ${form.master_bot_id === bot.id ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                >
                  <BotBadge bot={bot} active={form.master_bot_id === bot.id} />
                </button>
              ))}
            </div>
          </div>
        )}

        {(creationMode !== 'wizard' || wizardStep >= 3) && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Squad members</p>
                <span className="text-[10px] text-muted-foreground">{form.member_bot_ids.length} selected</span>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {selectableBots.map((bot) => {
                  const active = form.member_bot_ids.includes(bot.id);
                  return (
                    <button
                      key={bot.id}
                      onClick={() => toggleMember(bot.id)}
                      className={`rounded-xl border p-0 text-left ${active ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                    >
                      <BotBadge bot={bot} active={active} />
                    </button>
                  );
                })}
              </div>
            </div>
            <SquadFormationBuilder bots={activeBots} form={form} setForm={setForm} />
          </div>
        )}

        {(creationMode !== 'wizard' || wizardStep >= 4) && (
          <div className="space-y-3 rounded-xl border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-foreground">Pipeline</p>
                <p className="text-[10px] text-muted-foreground">Define reusable specialist steps for complex requests.</p>
              </div>
              <button
                onClick={addStep}
                className="inline-flex items-center gap-1 rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary"
              >
                <Plus className="w-3 h-3" /> Add step
              </button>
            </div>

            {(form.pipeline_steps || []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No pipeline steps yet.</div>
            ) : form.pipeline_steps.map((step, index) => (
              <div key={step.id} className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-foreground">Step {index + 1}</p>
                  <button onClick={() => removeStep(step.id)} className="text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  value={step.title}
                  onChange={(e) => updateStep(step.id, { title: e.target.value })}
                  placeholder="Step title"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
                />
                <textarea
                  value={step.instruction}
                  onChange={(e) => updateStep(step.id, { instruction: e.target.value })}
                  placeholder="What should happen in this step"
                  className="min-h-[72px] w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none resize-none"
                />
                <select
                  value={step.assigned_bot_id}
                  onChange={(e) => updateStep(step.id, { assigned_bot_id: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
                >
                  <option value="">Assign to master by default</option>
                  {activeBots.filter((bot) => bot.id === form.master_bot_id || form.member_bot_ids.includes(bot.id)).map((bot) => (
                    <option key={bot.id} value={bot.id}>{bot.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        <SquadCostPanel estimate={draftCostEstimate} />

        {saveError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {saveError}
          </div>
        )}

        {creationMode === 'wizard' ? (
          <div className="flex gap-2">
            <button
              onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}
              disabled={wizardStep === 1}
              className="rounded-xl border border-border px-3 py-2.5 text-xs text-muted-foreground disabled:opacity-40"
            >
              Back
            </button>
            {wizardStep < 4 ? (
              <button
                onClick={() => setWizardStep((prev) => Math.min(4, prev + 1))}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={saveSquad}
                disabled={!form.name.trim() || !form.master_bot_id}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" /> {editingId ? 'Update squad' : 'Finish wizard'}
              </button>
            )}
            {editingId && (
              <button onClick={resetForm} className="rounded-xl border border-border px-3 py-2.5 text-xs text-muted-foreground">Cancel</button>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={saveSquad}
              disabled={!form.name.trim() || !form.master_bot_id}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" /> {editingId ? 'Update squad' : 'Save squad'}
            </button>
            {editingId && (
              <button onClick={resetForm} className="rounded-xl border border-border px-3 py-2.5 text-xs text-muted-foreground">Cancel</button>
            )}
          </div>
        )}
      </div>

      <SquadAnalyticsPanel analytics={squadAnalytics} />
      <StarterTemplateBrowser templates={STARTER_SQUAD_TEMPLATES} onApply={applyStarterTemplate} />
      <MemoryBankPanel entries={memoryBankEntries} search={knowledgeSearch} setSearch={setKnowledgeSearch} pinnedIds={pinnedMemoryIds} onTogglePin={togglePinnedMemory} />
      <SquadTemplateLibrary templates={templates} starterTemplates={STARTER_SQUAD_TEMPLATES} onClone={cloneTemplate} onApplyStarter={applyStarterTemplate} onRefresh={loadSquads} />
      <SquadKnowledgePanel knowledgeItems={knowledgeItems} search={knowledgeSearch} setSearch={setKnowledgeSearch} bots={bots} onRefresh={loadSquads} />

      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saved squads</p>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : squads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No squads yet.</div>
        ) : squads.map((squad) => {
          const masterBot = bots.find((bot) => bot.id === squad.master_bot_id);
          const memberBots = bots.filter((bot) => (squad.member_bot_ids || []).includes(bot.id));
          const output = runOutput[squad.id];
          const isRunning = runningId === squad.id;

          const runCostEstimate = estimateSquadRunCost({
            squad,
            bots,
            runGoal: runInput[squad.id] || squad.description || squad.name,
          });

          return (
            <div key={squad.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{squad.name}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{squad.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => saveAsTemplate(squad)} className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary inline-flex items-center gap-1"><CopyPlus className="w-3 h-3" /> Template</button>
                  <button onClick={() => editSquad(squad)} className="rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground">Edit</button>
                  <button onClick={() => deleteSquad(squad.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Leader bot</p>
                  </div>
                  {masterBot ? <BotBadge bot={masterBot} active /> : <p className="text-xs text-muted-foreground">Leader bot unavailable</p>}
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Members</p>
                  </div>
                  <div className="grid gap-2">
                    {memberBots.map((bot) => <BotBadge key={bot.id} bot={bot} />)}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Commander bots</p>
                  <div className="grid gap-2">
                    {(squad.commander_bot_ids || []).map((id) => bots.find((bot) => bot.id === id)).filter(Boolean).map((bot) => <BotBadge key={bot.id} bot={bot} />)}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Security bots</p>
                  <div className="grid gap-2">
                    {(squad.security_bot_ids || []).map((id) => bots.find((bot) => bot.id === id)).filter(Boolean).map((bot) => <BotBadge key={bot.id} bot={bot} />)}
                  </div>
                </div>
              </div>

              {(squad.task_groups || []).length > 0 && (
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">Task groups</p>
                  <div className="space-y-3">
                    {(squad.task_groups || []).map((group) => (
                      <div key={group.id} className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">{group.name || 'Task group'}</p>
                          <span className="text-[10px] text-muted-foreground">{(group.bot_ids || []).length}/5 bots</span>
                        </div>
                        {group.purpose && <p className="text-[10px] text-primary">Purpose: {group.purpose}</p>}
                        {group.task_instruction && <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{group.task_instruction}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {squad.shared_context && (
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Shared context</p>
                  <p className="text-[11px] whitespace-pre-wrap text-muted-foreground">{squad.shared_context}</p>
                </div>
              )}

              <SquadDeliveryPanel squad={squad} onRefresh={loadSquads} />

              {(squad.pipeline_steps || []).length > 0 && (
                <div className="rounded-xl border border-border bg-background p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Network className="w-4 h-4 text-primary" />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline steps</p>
                  </div>
                  <div className="space-y-2">
                    {(squad.pipeline_steps || []).map((step, index) => {
                      const assignedBot = bots.find((bot) => bot.id === step.assigned_bot_id);
                      return (
                        <div key={step.id || index} className="rounded-xl border border-border bg-secondary/20 p-3">
                          <p className="text-xs font-semibold text-foreground">{index + 1}. {step.title || 'Untitled step'}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap">{step.instruction}</p>
                          <p className="mt-2 text-[10px] text-primary">Assigned to: {assignedBot?.name || masterBot?.name || 'Master bot'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2 border-t border-border/60 pt-3">
                {pinnedMemoryIds.length > 0 && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pinned memory injection</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{pinnedMemoryIds.length} memory bank entr${pinnedMemoryIds.length === 1 ? 'y is' : 'ies are'} currently pinned into future squad execution.</p>
                  </div>
                )}
                <textarea
                  value={runInput[squad.id] || ''}
                  onChange={(e) => setRunInput((prev) => ({ ...prev, [squad.id]: e.target.value }))}
                  placeholder="Give this squad a cross-department request..."
                  className="min-h-[72px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none resize-none"
                />
                <SquadCostPanel estimate={runCostEstimate} compact />
                <button
                  onClick={() => runSquad(squad)}
                  disabled={isRunning || !(runInput[squad.id] || '').trim()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-xs font-semibold text-primary disabled:opacity-40"
                >
                  <Play className="w-3.5 h-3.5" /> {isRunning ? 'Running squad…' : 'Run squad pipeline'}
                </button>
              </div>

              {output && (
                <div className="space-y-3 rounded-xl border border-border bg-background p-3">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs font-semibold text-foreground mb-1">Final squad response</p>
                    <p className="text-[11px] whitespace-pre-wrap text-muted-foreground leading-relaxed">{output.final}</p>
                  </div>
                  <SquadOutputChart content={output.final} title="Final response chart" />
                  {output.steps?.length > 0 && (
                    <div className="space-y-2">
                      {output.steps.map((step, index) => (
                        <div key={`${step.step_title}_${index}`} className="rounded-xl border border-border bg-secondary p-3 space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-foreground">{step.step_title}</p>
                            <p className="mt-1 text-[10px] text-primary">{step.bot_name}</p>
                            {step.routed_group_name && <p className="mt-1 text-[10px] text-muted-foreground">Routed to: {step.routed_group_name}</p>}
                            <p className="mt-1 text-[11px] whitespace-pre-wrap text-muted-foreground leading-relaxed">{step.output}</p>
                          </div>
                          <SquadOutputChart content={step.output} title={`${step.step_title} chart`} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}