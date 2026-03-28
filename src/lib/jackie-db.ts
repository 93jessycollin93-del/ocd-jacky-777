import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  memory_tier: number | null;
  security_flag: string | null;
  created_at: string;
  user_id: string;
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createConversation(title?: string): Promise<Conversation> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ title: title || "New conversation", user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  // Delete messages first, then conversation
  await supabase.from("chat_messages").delete().eq("conversation_id", id);
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", id);
  if (error) throw error;
}

export async function updateConversationModel(id: string, model: string): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ model } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function getConversationModel(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("model" as any)
    .eq("id", id)
    .single();
  if (error) throw error;
  return (data as any)?.model ?? null;
}

export async function getMessages(conversationId: string): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StoredMessage[];
}

export async function saveMessage(msg: {
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  memory_tier?: number;
  security_flag?: string | null;
}): Promise<StoredMessage> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: msg.conversation_id,
      role: msg.role,
      content: msg.content,
      memory_tier: msg.memory_tier ?? 1,
      security_flag: msg.security_flag ?? null,
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", msg.conversation_id);

  return data as StoredMessage;
}

export function generateTitle(content: string): string {
  const cleaned = content.replace(/\n/g, " ").trim();
  return cleaned.length > 50 ? cleaned.slice(0, 47) + "..." : cleaned;
}
