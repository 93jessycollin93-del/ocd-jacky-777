import { supabase } from "@/integrations/supabase/client";

export interface Attachment {
  id: string;
  message_id: string | null;
  conversation_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function uploadAttachment(
  file: File,
  conversationId: string,
  messageId?: string
): Promise<Attachment> {
  const userId = await getUserId();
  const ext = file.name.split(".").pop() || "bin";
  const storagePath = `${userId}/${conversationId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("chat-attachments")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("chat_attachments")
    .insert({
      message_id: messageId || null,
      conversation_id: conversationId,
      user_id: userId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Attachment;
}

export async function getAttachments(conversationId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from("chat_attachments")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Attachment[];
}

export async function getMessageAttachments(messageId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from("chat_attachments")
    .select("*")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Attachment[];
}

export function getAttachmentUrl(storagePath: string): string {
  const { data } = supabase.storage.from("chat-attachments").getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function deleteAttachment(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from("chat-attachments").remove([storagePath]);
  const { error } = await supabase.from("chat_attachments").delete().eq("id", id);
  if (error) throw error;
}

export async function updateAttachmentMessageId(attachmentId: string, messageId: string): Promise<void> {
  // We need update policy - for now we'll handle this at insert time
  // This is a placeholder for linking attachments to messages after message creation
}

export function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

export function isVideoType(type: string): boolean {
  return type.startsWith("video/");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
