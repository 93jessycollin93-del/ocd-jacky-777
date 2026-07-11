// Archive: export ALL of the user's conversations + messages to a JSON file,
// and import a previously exported archive back into the account.
//
// Format is stable + human-readable so it doubles as a portable backup.

import { supabase } from "@/integrations/supabase/client";
import {
  listConversations,
  getMessages,
  createConversation,
  type Conversation,
  type StoredMessage,
} from "./jackie-db";

export const ARCHIVE_VERSION = 1;

export type ArchivedMessage = {
  role: "user" | "assistant";
  content: string;
  memory_tier: number | null;
  security_flag: string | null;
  created_at: string;
};

export type ArchivedConversation = {
  title: string;
  created_at: string;
  updated_at: string;
  model?: string | null;
  messages: ArchivedMessage[];
};

export type Archive = {
  version: number;
  exported_at: string;
  source: "jackie";
  user_email?: string | null;
  conversations: ArchivedConversation[];
};

export async function exportArchive(): Promise<Archive> {
  const convs = await listConversations();
  const { data: userData } = await supabase.auth.getUser();

  const enriched: ArchivedConversation[] = await Promise.all(
    convs.map(async (c: Conversation & { model?: string | null }) => {
      const msgs = await getMessages(c.id);
      return {
        title: c.title,
        created_at: c.created_at,
        updated_at: c.updated_at,
        model: (c as any).model ?? null,
        messages: msgs.map((m: StoredMessage) => ({
          role: m.role,
          content: m.content,
          memory_tier: m.memory_tier,
          security_flag: m.security_flag,
          created_at: m.created_at,
        })),
      };
    })
  );

  return {
    version: ARCHIVE_VERSION,
    exported_at: new Date().toISOString(),
    source: "jackie",
    user_email: userData?.user?.email ?? null,
    conversations: enriched,
  };
}

export async function downloadArchive(): Promise<number> {
  const archive = await exportArchive();
  const blob = new Blob([JSON.stringify(archive, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jackie-archive_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return archive.conversations.length;
}

export type ImportSummary = {
  conversations: number;
  messages: number;
  skipped: number;
};

/**
 * Import an archive JSON file. Each archived conversation becomes a NEW
 * conversation for the current user (new UUIDs) so importing into the same
 * account never overwrites existing data.
 */
export async function importArchive(file: File): Promise<ImportSummary> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Not valid JSON.");
  }
  const archive = parsed as Partial<Archive>;
  if (!archive || archive.source !== "jackie" || !Array.isArray(archive.conversations)) {
    throw new Error("Not a Jackie archive file.");
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Sign in to import.");

  let convCount = 0;
  let msgCount = 0;
  let skipped = 0;

  for (const c of archive.conversations) {
    if (!c || !Array.isArray(c.messages)) { skipped++; continue; }
    const title = (c.title || "Imported conversation").slice(0, 200);
    let created: Conversation;
    try {
      created = await createConversation(`↩ ${title}`);
    } catch {
      skipped++;
      continue;
    }
    convCount++;

    // Batch insert messages in chronological order.
    const rows = c.messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({
        conversation_id: created.id,
        user_id: userId,
        role: m.role,
        content: m.content,
        memory_tier: typeof m.memory_tier === "number" ? m.memory_tier : 1,
        security_flag: m.security_flag ?? null,
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from("chat_messages").insert(rows);
      if (!error) msgCount += rows.length;
    }
  }

  return { conversations: convCount, messages: msgCount, skipped };
}
