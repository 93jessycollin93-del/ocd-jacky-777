// The 24 canonical eYe pods. Each maps a domain of app data to a slot.
import { supabase } from "@/integrations/supabase/client";

export interface PodSlot {
  id: string;
  slot: number;
  name: string;
  domain: string;
  description: string;
  /** Optional harvester — pulls current live data for this pod domain. */
  harvest?: () => Promise<unknown>;
}

async function harvestTable(table: string) {
  const { data, error } = await supabase.from(table as any).select("*").limit(5000);
  if (error) throw error;
  return data ?? [];
}

export const POD_SLOTS: PodSlot[] = [
  { id: "pod-01-conversations", slot: 1, name: "Conversations", domain: "chats",
    description: "All Jackie chat threads",
    harvest: () => harvestTable("conversations") },
  { id: "pod-02-messages", slot: 2, name: "Messages", domain: "chats",
    description: "Chat message history",
    harvest: () => harvestTable("chat_messages") },
  { id: "pod-03-memory", slot: 3, name: "Memory", domain: "memory",
    description: "Jackie memory records" },
  { id: "pod-04-tasks", slot: 4, name: "Tasks", domain: "workflow",
    description: "Task queue snapshots" },
  { id: "pod-05-audit", slot: 5, name: "Control Audit", domain: "control",
    description: "Jackie control audit log",
    harvest: () => harvestTable("jackie_control_audit") },
  { id: "pod-06-swarms", slot: 6, name: "Swarms", domain: "orchestration",
    description: "Bot swarm blueprints & runs",
    harvest: () => harvestTable("jackie_control_swarms") },
  { id: "pod-07-bots", slot: 7, name: "Bots", domain: "bots",
    description: "User bot definitions",
    harvest: () => harvestTable("user_bots") },
  { id: "pod-08-prefs", slot: 8, name: "Preferences", domain: "control",
    description: "Control panel preferences",
    harvest: () => harvestTable("jackie_control_prefs") },
  { id: "pod-09-vault", slot: 9, name: "Vault Media", domain: "vault",
    description: "Vault media library metadata" },
  { id: "pod-10-jobs", slot: 10, name: "Conversion Jobs", domain: "vault",
    description: "Vault conversion job history" },
  { id: "pod-11-outputs", slot: 11, name: "Outputs", domain: "vault",
    description: "Rendered output assets" },
  { id: "pod-12-game-saves", slot: 12, name: "Game Saves", domain: "game",
    description: "Dragon Chaos Wars save states" },
  { id: "pod-13-transactions", slot: 13, name: "Transactions", domain: "economy",
    description: "Diamond economy ledger" },
  { id: "pod-14-cards", slot: 14, name: "Card Collection", domain: "game",
    description: "TCG deck & card inventory" },
  { id: "pod-15-creatures", slot: 15, name: "Creatures", domain: "game",
    description: "Creature legacy roster" },
  { id: "pod-16-sphere", slot: 16, name: "Sphere Command", domain: "game",
    description: "Sphere Command campaign state" },
  { id: "pod-17-marvels", slot: 17, name: "Marvels", domain: "game",
    description: "Microscopic Marvels race data" },
  { id: "pod-18-sentinel", slot: 18, name: "Sentinel", domain: "intel",
    description: "Crypto Sentinel intel snapshots" },
  { id: "pod-19-veilops", slot: 19, name: "VeilOps", domain: "intel",
    description: "VeilOps threat intelligence" },
  { id: "pod-20-apex", slot: 20, name: "Apex Hub", domain: "intel",
    description: "Apex intelligence hub data" },
  { id: "pod-21-eru", slot: 21, name: "Eru Modules", domain: "eru",
    description: "Eru entity snapshots" },
  { id: "pod-22-api-keys", slot: 22, name: "API Keys", domain: "security",
    description: "Encrypted API key registry",
    harvest: () => harvestTable("api_keys") },
  { id: "pod-23-archive", slot: 23, name: "Chat Archive", domain: "archive",
    description: "Exported chat archives" },
  { id: "pod-24-scratch", slot: 24, name: "Scratch Pad", domain: "misc",
    description: "Free-form pod for ad-hoc payloads" },
];
