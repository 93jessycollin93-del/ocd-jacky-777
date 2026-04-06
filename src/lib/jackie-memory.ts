import { supabase } from "@/integrations/supabase/client";

// ── Types ──
export interface JackieMemory {
  id: string;
  user_id: string;
  key: string;
  value: string;
  category: MemoryCategory;
  source_conversation_id: string | null;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export type MemoryCategory = 'preference' | 'decision' | 'context' | 'pattern' | 'architecture' | 'style';

// ── Helpers ──
async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// ── CRUD ──
export async function getMemories(category?: MemoryCategory): Promise<JackieMemory[]> {
  let query = supabase.from("jackie_memory").select("*").order("updated_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as JackieMemory[];
}

export async function upsertMemory(
  key: string,
  value: string,
  category: MemoryCategory = 'context',
  conversationId?: string,
  confidence: number = 0.8
): Promise<JackieMemory> {
  const userId = await getUserId();

  // Check if key exists
  const { data: existing } = await supabase
    .from("jackie_memory")
    .select("id")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("jackie_memory")
      .update({
        value,
        category,
        confidence,
        ...(conversationId ? { source_conversation_id: conversationId } : {}),
      } as any)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as JackieMemory;
  }

  const { data, error } = await supabase
    .from("jackie_memory")
    .insert({
      user_id: userId,
      key,
      value,
      category,
      confidence,
      ...(conversationId ? { source_conversation_id: conversationId } : {}),
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as JackieMemory;
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.from("jackie_memory").delete().eq("id", id);
  if (error) throw error;
}

export async function searchMemories(searchTerm: string): Promise<JackieMemory[]> {
  const { data, error } = await supabase
    .from("jackie_memory")
    .select("*")
    .or(`key.ilike.%${searchTerm}%,value.ilike.%${searchTerm}%`)
    .order("confidence", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as JackieMemory[];
}

// ── Context Builder ──
export async function buildMemoryContext(): Promise<string> {
  const memories = await getMemories();
  if (memories.length === 0) return "";

  const grouped: Record<string, JackieMemory[]> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  let context = "\n## Jackie's Memory\n";
  for (const [cat, items] of Object.entries(grouped)) {
    context += `\n### ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`;
    for (const m of items.slice(0, 10)) {
      context += `- **${m.key}**: ${m.value}\n`;
    }
  }
  return context;
}

// ── Auto-extract memories from AI response ──
const MEMORY_PATTERNS = [
  { regex: /(?:prefer|always use|I like|my style is)\s+(.+)/i, category: 'preference' as const },
  { regex: /(?:decided|going with|choosing|we'll use)\s+(.+)/i, category: 'decision' as const },
  { regex: /(?:architecture|pattern|structure|approach):\s*(.+)/i, category: 'architecture' as const },
  { regex: /(?:convention|naming|style rule):\s*(.+)/i, category: 'style' as const },
];

export function extractMemoryCandidates(
  userMessage: string,
  _assistantResponse: string
): { key: string; value: string; category: MemoryCategory }[] {
  const candidates: { key: string; value: string; category: MemoryCategory }[] = [];

  for (const { regex, category } of MEMORY_PATTERNS) {
    const match = userMessage.match(regex);
    if (match) {
      const value = match[1].trim().slice(0, 200);
      const key = value.slice(0, 60).replace(/[^a-zA-Z0-9 _-]/g, '').trim();
      if (key.length > 3) {
        candidates.push({ key, value, category });
      }
    }
  }
  return candidates;
}
