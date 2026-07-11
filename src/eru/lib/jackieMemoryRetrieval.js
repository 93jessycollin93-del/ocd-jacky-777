export function tokenizeMemoryQuery(text) {
  return Array.from(new Set(String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s/-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)));
}

export function scoreMemoryText(text, tokens, baseScore = 0) {
  const haystack = String(text || '').toLowerCase();
  let score = Number(baseScore || 0);
  for (const token of tokens) {
    if (haystack.includes(token)) score += 8;
  }
  return score;
}

export function selectRelevantMemoryFacts({ profile, chunks, memories, query, limit = 6 }) {
  const tokens = tokenizeMemoryQuery(query);
  const candidates = [];

  if (profile?.identity_summary) {
    candidates.push({
      type: 'profile',
      text: `Identity: ${profile.identity_summary}`,
      score: scoreMemoryText(profile.identity_summary, tokens, 18)
    });
  }

  if (profile?.present_state_summary) {
    candidates.push({
      type: 'profile',
      text: `Current state: ${profile.present_state_summary}`,
      score: scoreMemoryText(profile.present_state_summary, tokens, 16)
    });
  }

  if (profile?.memory_prompt_block) {
    candidates.push({
      type: 'profile',
      text: `Memory guidance: ${profile.memory_prompt_block}`,
      score: scoreMemoryText(profile.memory_prompt_block, tokens, 14)
    });
  }

  (profile?.historical_strategies || []).forEach((strategy) => {
    const strategyText = `${strategy.goal || ''} ${(strategy.keywords || []).join(' ')} ${strategy.strategy_summary || ''}`.trim();
    if (!strategyText) return;
    candidates.push({
      type: 'strategy',
      text: `Past strategy: ${strategy.goal || 'General'} — ${strategy.strategy_summary || strategyText}`,
      score: scoreMemoryText(strategyText, tokens, 12)
    });
  });

  (chunks || []).forEach((chunk) => {
    const chunkText = `${chunk.summary || ''} ${(chunk.keywords || []).join(' ')}`.trim();
    if (!chunkText) return;
    candidates.push({
      type: 'chunk',
      text: `Recent memory chunk: ${chunk.summary}`,
      score: scoreMemoryText(chunkText, tokens, Number(chunk.retrieval_score || 0) + Number(chunk.quality_score || 0) * 0.25)
    });
  });

  (memories || []).forEach((memory) => {
    const memoryText = `${memory.content || ''} ${(memory.retrieval_tags || []).join(' ')}`.trim();
    if (!memoryText) return;
    candidates.push({
      type: 'memory',
      text: `${memory.role === 'user' ? 'User fact' : memory.role === 'assistant' ? 'Assistant fact' : 'System fact'}: ${memory.content}`,
      score: scoreMemoryText(memoryText, tokens, Number(memory.importance_score || 0))
    });
  });

  return candidates
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.text);
}