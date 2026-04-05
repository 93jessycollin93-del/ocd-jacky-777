/**
 * Extracts a concise text summary of the current game state
 * for injection into Jackie's AI context.
 */

const SAVE_KEY = 'middle_earth_strategy_save';

interface GameSave {
  realmName?: string;
  resources?: Record<string, number>;
  buildings?: Record<string, number>;
  troops?: Array<{ id: string; count: number }>;
  marches?: Array<{ id: string; expeditionId: string; status: string; returnTime: number }>;
  heroes?: Array<{ id: string; level: number; active: boolean }>;
  research?: Record<string, number>;
  rareMaterials?: Record<string, number>;
  guildBank?: { gold: number };
  battlePass?: { level: number; xp: number };
  stars?: number;
}

export function getGameStateContext(): string | undefined {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return undefined;

    const save: GameSave = JSON.parse(raw);
    if (!save.realmName) return undefined;

    const lines: string[] = [
      `## Player Game State (Live)`,
      ``,
      `**Realm:** ${save.realmName}`,
    ];

    // Resources
    if (save.resources) {
      const res = Object.entries(save.resources)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}: ${Math.floor(v).toLocaleString()}`)
        .join(', ');
      if (res) lines.push(`**Resources:** ${res}`);
    }

    // Rare materials
    if (save.rareMaterials) {
      const rm = Object.entries(save.rareMaterials)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (rm) lines.push(`**Rare Materials:** ${rm}`);
    }

    // Top buildings
    if (save.buildings) {
      const top = Object.entries(save.buildings)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([k, v]) => `${k} Lv${v}`)
        .join(', ');
      if (top) lines.push(`**Key Buildings:** ${top}`);
    }

    // Army
    if (save.troops) {
      const total = save.troops.reduce((s, t) => s + t.count, 0);
      const breakdown = save.troops
        .filter(t => t.count > 0)
        .map(t => `${t.id}: ${t.count.toLocaleString()}`)
        .join(', ');
      lines.push(`**Army Size:** ${total.toLocaleString()} troops`);
      if (breakdown) lines.push(`**Troops:** ${breakdown}`);
    }

    // Active marches
    if (save.marches && save.marches.length > 0) {
      lines.push(`**Active Marches:** ${save.marches.length}`);
      save.marches.forEach(m => {
        const timeLeft = Math.max(0, Math.ceil((m.returnTime - Date.now()) / 60000));
        lines.push(`  - ${m.expeditionId} (${m.status}, ${timeLeft}min remaining)`);
      });
    }

    // Heroes
    if (save.heroes) {
      const active = save.heroes.filter(h => h.active);
      if (active.length > 0) {
        lines.push(`**Active Heroes:** ${active.map(h => `${h.id} Lv${h.level}`).join(', ')}`);
      }
    }

    // Stars / Battle Pass
    if (save.stars && save.stars > 0) {
      lines.push(`**Stars:** ${save.stars}`);
    }
    if (save.battlePass) {
      lines.push(`**Battle Pass:** Level ${save.battlePass.level} (${save.battlePass.xp} XP)`);
    }

    return lines.join('\n');
  } catch {
    return undefined;
  }
}
