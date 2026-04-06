import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "./jackie-attachments";

// ── File Browser ──
export interface FileEntry {
  id: string;
  name: string;
  type: string;
  size: number;
  conversationId: string;
  storagePath: string;
  createdAt: string;
  signedUrl?: string;
}

export async function listFiles(conversationId?: string): Promise<FileEntry[]> {
  let query = supabase
    .from("chat_attachments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (conversationId) {
    query = query.eq("conversation_id", conversationId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as Attachment[]).map(a => ({
    id: a.id,
    name: a.file_name,
    type: a.file_type,
    size: a.file_size,
    conversationId: a.conversation_id,
    storagePath: a.storage_path,
    createdAt: a.created_at,
  }));
}

export async function getFileUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}

export async function searchFiles(query: string): Promise<FileEntry[]> {
  const { data, error } = await supabase
    .from("chat_attachments")
    .select("*")
    .ilike("file_name", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return ((data ?? []) as Attachment[]).map(a => ({
    id: a.id,
    name: a.file_name,
    type: a.file_type,
    size: a.file_size,
    conversationId: a.conversation_id,
    storagePath: a.storage_path,
    createdAt: a.created_at,
  }));
}

// ── Context Builder ──
export async function buildFileContext(conversationId: string): Promise<string> {
  const files = await listFiles(conversationId);
  if (files.length === 0) return "";

  let context = "\n## Files in this conversation\n";
  for (const f of files.slice(0, 10)) {
    const sizeStr = f.size < 1024 ? `${f.size}B` : f.size < 1048576 ? `${(f.size / 1024).toFixed(1)}KB` : `${(f.size / 1048576).toFixed(1)}MB`;
    context += `- 📎 **${f.name}** (${f.type}, ${sizeStr})\n`;
  }
  if (files.length > 10) context += `_...and ${files.length - 10} more files_\n`;
  return context;
}

// ── Image Generation via Edge Function ──
const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jackie-image`;

export async function generateImage(prompt: string): Promise<{ image: string; text: string }> {
  const resp = await fetch(IMAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Image generation failed" }));
    throw new Error(err.error || "Image generation failed");
  }

  return resp.json();
}
