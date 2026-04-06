import { supabase } from "@/integrations/supabase/client";

// ── Types ──
export interface JackieTask {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// ── Helpers ──
async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// ── CRUD ──
export async function getTasks(status?: TaskStatus): Promise<JackieTask[]> {
  let query = supabase
    .from("jackie_tasks")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as JackieTask[];
}

export async function createTask(
  title: string,
  description: string = '',
  priority: TaskPriority = 'medium',
  category: string = 'general',
  dueDate?: string
): Promise<JackieTask> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("jackie_tasks")
    .insert({
      user_id: userId,
      title,
      description,
      priority,
      category,
      ...(dueDate ? { due_date: dueDate } : {}),
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as JackieTask;
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<JackieTask, 'title' | 'description' | 'status' | 'priority' | 'category' | 'due_date'>>
): Promise<JackieTask> {
  const { data, error } = await supabase
    .from("jackie_tasks")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as JackieTask;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("jackie_tasks").delete().eq("id", id);
  if (error) throw error;
}

// ── Status transitions ──
export async function startTask(id: string): Promise<JackieTask> {
  return updateTask(id, { status: 'in_progress' });
}

export async function completeTask(id: string): Promise<JackieTask> {
  return updateTask(id, { status: 'done' });
}

export async function blockTask(id: string): Promise<JackieTask> {
  return updateTask(id, { status: 'blocked' });
}

// ── Context Builder ──
const PRIORITY_EMOJI: Record<TaskPriority, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

const STATUS_EMOJI: Record<TaskStatus, string> = {
  todo: '📋',
  in_progress: '🔧',
  done: '✅',
  blocked: '🚫',
};

export async function buildTaskContext(): Promise<string> {
  const tasks = await getTasks();
  const active = tasks.filter(t => t.status !== 'done');
  if (active.length === 0) return "";

  let context = "\n## Active Tasks\n";
  for (const t of active.slice(0, 15)) {
    context += `- ${STATUS_EMOJI[t.status]} ${PRIORITY_EMOJI[t.priority]} **${t.title}**`;
    if (t.description) context += ` — ${t.description.slice(0, 80)}`;
    context += `\n`;
  }

  const doneCount = tasks.filter(t => t.status === 'done').length;
  if (doneCount > 0) {
    context += `\n_${doneCount} completed tasks._\n`;
  }
  return context;
}

// ── Stats ──
export async function getTaskStats(): Promise<{
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  blocked: number;
  critical: number;
}> {
  const tasks = await getTasks();
  return {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    critical: tasks.filter(t => t.priority === 'critical' && t.status !== 'done').length,
  };
}
