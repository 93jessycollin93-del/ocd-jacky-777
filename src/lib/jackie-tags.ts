import { supabase } from "@/integrations/supabase/client";

export interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

const TAG_COLORS = [
  "blue", "green", "orange", "pink", "purple", "red", "yellow", "cyan",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const TAG_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  pink: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export { TAG_COLORS };

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("conversation_tags")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Tag[];
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("conversation_tags")
    .insert({ name, color, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Tag;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from("conversation_tags").delete().eq("id", id);
  if (error) throw error;
}

export async function getConversationTags(conversationId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("conversation_tag_links")
    .select("tag_id")
    .eq("conversation_id", conversationId);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const tagIds = data.map((d: any) => d.tag_id);
  const { data: tags, error: tagErr } = await supabase
    .from("conversation_tags")
    .select("*")
    .in("id", tagIds);
  if (tagErr) throw tagErr;
  return (tags ?? []) as Tag[];
}

export async function addTagToConversation(conversationId: string, tagId: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("conversation_tag_links")
    .insert({ conversation_id: conversationId, tag_id: tagId, user_id: userId });
  if (error && !error.message.includes("duplicate")) throw error;
}

export async function removeTagFromConversation(conversationId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from("conversation_tag_links")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("tag_id", tagId);
  if (error) throw error;
}

export async function getTagConversationMap(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from("conversation_tag_links")
    .select("conversation_id, tag_id");
  if (error) throw error;
  const map: Record<string, string[]> = {};
  for (const row of (data ?? [])) {
    const cid = (row as any).conversation_id;
    const tid = (row as any).tag_id;
    if (!map[cid]) map[cid] = [];
    map[cid].push(tid);
  }
  return map;
}
