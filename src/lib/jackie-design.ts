import { supabase } from "@/integrations/supabase/client";

export type DesignCategory =
  | "lore" | "mechanic" | "unit" | "building" | "resource" | "tech_tree"
  | "faction" | "event" | "economy_rule" | "battle_system" | "alliance"
  | "monetization" | "quest" | "map" | "general";

export type DesignEntryStatus = "draft" | "approved" | "implemented";

export const DESIGN_CATEGORIES: { id: DesignCategory; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "📋" },
  { id: "lore", label: "Lore", icon: "📖" },
  { id: "faction", label: "Factions", icon: "🏴" },
  { id: "unit", label: "Units", icon: "⚔️" },
  { id: "building", label: "Buildings", icon: "🏗️" },
  { id: "resource", label: "Resources", icon: "💎" },
  { id: "tech_tree", label: "Tech Trees", icon: "🌳" },
  { id: "mechanic", label: "Mechanics", icon: "⚙️" },
  { id: "economy_rule", label: "Economy", icon: "📊" },
  { id: "battle_system", label: "Battle", icon: "🗡️" },
  { id: "alliance", label: "Alliance", icon: "🤝" },
  { id: "event", label: "Events", icon: "🎯" },
  { id: "quest", label: "Quests", icon: "📜" },
  { id: "map", label: "Maps", icon: "🗺️" },
  { id: "monetization", label: "Monetization", icon: "💰" },
];

export interface GameProject {
  id: string;
  user_id: string;
  name: string;
  genre: string | null;
  description: string | null;
  vision_statement: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DesignEntry {
  id: string;
  project_id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  content: string;
  category: DesignCategory;
  status: DesignEntryStatus;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// ─── Projects ──────────────────────────────────────────────

export async function listProjects(): Promise<GameProject[]> {
  const { data, error } = await supabase
    .from("game_projects" as any)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as GameProject[];
}

export async function createProject(name: string, genre?: string, description?: string, vision?: string): Promise<GameProject> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("game_projects" as any)
    .insert({ name, genre: genre || null, description: description || null, vision_statement: vision || null, user_id: userId } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as GameProject;
}

export async function updateProject(id: string, updates: Partial<Pick<GameProject, "name" | "genre" | "description" | "vision_statement">>): Promise<void> {
  const { error } = await supabase
    .from("game_projects" as any)
    .update(updates as any)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from("game_projects" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Entries ───────────────────────────────────────────────

export async function listEntries(projectId: string, category?: DesignCategory): Promise<DesignEntry[]> {
  let query = supabase
    .from("game_design_entries" as any)
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DesignEntry[];
}

export async function createEntry(entry: {
  project_id: string;
  title: string;
  content?: string;
  category?: DesignCategory;
  parent_id?: string | null;
}): Promise<DesignEntry> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("game_design_entries" as any)
    .insert({
      project_id: entry.project_id,
      title: entry.title,
      content: entry.content || "",
      category: entry.category || "general",
      parent_id: entry.parent_id || null,
      user_id: userId,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DesignEntry;
}

export async function updateEntry(id: string, updates: Partial<Pick<DesignEntry, "title" | "content" | "category" | "status" | "tags" | "sort_order">>): Promise<void> {
  const { error } = await supabase
    .from("game_design_entries" as any)
    .update(updates as any)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("game_design_entries" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Context for AI ────────────────────────────────────────

export async function getProjectContext(projectId: string): Promise<string> {
  const [projectRes, entriesRes] = await Promise.all([
    supabase.from("game_projects" as any).select("*").eq("id", projectId).single(),
    supabase.from("game_design_entries" as any).select("*").eq("project_id", projectId).order("category").order("sort_order"),
  ]);

  const project = projectRes.data as unknown as GameProject | null;
  const entries = (entriesRes.data ?? []) as unknown as DesignEntry[];

  if (!project) return "";

  let ctx = `## Game Project: ${project.name}\n`;
  if (project.genre) ctx += `Genre: ${project.genre}\n`;
  if (project.description) ctx += `Description: ${project.description}\n`;
  if (project.vision_statement) ctx += `Vision: ${project.vision_statement}\n`;
  ctx += "\n";

  const grouped = new Map<string, DesignEntry[]>();
  for (const e of entries) {
    if (!grouped.has(e.category)) grouped.set(e.category, []);
    grouped.get(e.category)!.push(e);
  }

  for (const [cat, items] of grouped) {
    const catInfo = DESIGN_CATEGORIES.find((c) => c.id === cat);
    ctx += `### ${catInfo?.icon || "📋"} ${catInfo?.label || cat} (${items.length} entries)\n`;
    for (const item of items) {
      ctx += `- **${item.title}** [${item.status}]: ${item.content.slice(0, 200)}${item.content.length > 200 ? "..." : ""}\n`;
    }
    ctx += "\n";
  }

  return ctx;
}
