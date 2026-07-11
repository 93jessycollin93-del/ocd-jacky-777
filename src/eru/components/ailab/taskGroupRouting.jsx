const GROUP_KEYWORDS = {
  strategy: ['plan', 'strategy', 'roadmap', 'priority', 'objective', 'operations', 'workflow'],
  marketing: ['marketing', 'brand', 'campaign', 'content', 'social', 'engagement', 'audience'],
  finance: ['finance', 'revenue', 'pricing', 'forecast', 'sales', 'budget', 'trade'],
  security: ['security', 'risk', 'audit', 'compliance', 'breach', 'permissions', 'vulnerability'],
};

function getKeywordScore(text, keywords) {
  const lower = (text || '').toLowerCase();
  return keywords.reduce((total, keyword) => total + (lower.includes(keyword) ? 1 : 0), 0);
}

function getGroupProfile(group) {
  const text = [group.name, group.purpose, group.task_instruction].filter(Boolean).join(' ').toLowerCase();
  return {
    strategy: getKeywordScore(text, GROUP_KEYWORDS.strategy),
    marketing: getKeywordScore(text, GROUP_KEYWORDS.marketing),
    finance: getKeywordScore(text, GROUP_KEYWORDS.finance),
    security: getKeywordScore(text, GROUP_KEYWORDS.security),
  };
}

export function routeTaskToGroup(task, groups = [], loadByGroup = {}) {
  const taskText = (task || '').toLowerCase();
  const taskProfile = {
    strategy: getKeywordScore(taskText, GROUP_KEYWORDS.strategy),
    marketing: getKeywordScore(taskText, GROUP_KEYWORDS.marketing),
    finance: getKeywordScore(taskText, GROUP_KEYWORDS.finance),
    security: getKeywordScore(taskText, GROUP_KEYWORDS.security),
  };

  const rankedGroups = groups
    .filter((group) => (group.bot_ids || []).length > 0)
    .map((group, index) => {
      const profile = getGroupProfile(group);
      const keywordFit = Object.keys(taskProfile).reduce((sum, key) => sum + Math.min(taskProfile[key], profile[key]), 0);
      const fallbackFit = getKeywordScore(taskText, [group.name, group.purpose, group.task_instruction].filter(Boolean).join(' ').toLowerCase().split(/\s+/).filter((word) => word.length > 3));
      const currentLoad = loadByGroup[group.id] || 0;
      return {
        group,
        index,
        score: (keywordFit * 10) + fallbackFit - (currentLoad * 3),
        currentLoad,
      };
    })
    .sort((a, b) => b.score - a.score || a.currentLoad - b.currentLoad || a.index - b.index);

  return rankedGroups[0]?.group || null;
}