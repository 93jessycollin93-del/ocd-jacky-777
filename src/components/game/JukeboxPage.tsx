import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LANGUAGE_LABELS, TIER_ORDER, TIER_COLORS, TIER_UNLOCK_COST, ALL_SONGS, type MusicLanguage, type MusicTier, type SongEntry } from '@/game/musicData';
import { toast } from 'sonner';

export default function JukeboxPage() {
  const { state, unlockSongTier, getUnlockedTier } = useGame();
  const [lang, setLang] = useState<MusicLanguage>('en');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const currentTier = getUnlockedTier(lang);
  const currentTierIdx = TIER_ORDER.indexOf(currentTier);

  const songs = ALL_SONGS.filter(s => s.language === lang);
  const unlockedSongs = songs.filter(s => TIER_ORDER.indexOf(s.tier) <= currentTierIdx);
  const lockedSongs = songs.filter(s => TIER_ORDER.indexOf(s.tier) > currentTierIdx);

  const doUnlock = (tier: MusicTier) => {
    if (unlockSongTier(lang, tier)) {
      toast.success(`Unlocked ${tier} tier for ${LANGUAGE_LABELS[lang]}!`);
    } else {
      toast.error('Not enough gold/essence');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">🎶 Jukebox</h2>
      <p className="text-xs text-muted-foreground">Cultural music collection · {ALL_SONGS.length} songs across 10 languages</p>

      {/* Language tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {(Object.entries(LANGUAGE_LABELS) as [MusicLanguage, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setLang(key)}
            className={`shrink-0 px-2 py-1 rounded text-xs transition-all ${lang === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {label.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Tier progression */}
      <div className="flex gap-1">
        {TIER_ORDER.map((tier, i) => {
          const unlocked = i <= currentTierIdx;
          const isNext = i === currentTierIdx + 1;
          const cost = TIER_UNLOCK_COST[tier];
          return (
            <div key={tier} className="flex-1 text-center">
              <div className={`rounded-t py-1 text-xs font-semibold ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}
                style={{ backgroundColor: unlocked ? TIER_COLORS[tier] + '33' : undefined }}>
                {tier}
              </div>
              {isNext && cost.gold > 0 && (
                <Button size="sm" className="h-6 text-[10px] w-full rounded-t-none" onClick={() => doUnlock(tier)}>
                  {cost.gold}💰 {cost.essence ? `+ ${cost.essence}✨` : ''}
                </Button>
              )}
              {unlocked && <div className="text-[10px] text-green-400">✅</div>}
            </div>
          );
        })}
      </div>

      {/* Song list */}
      <div className="space-y-1">
        {unlockedSongs.map(song => (
          <div key={song.id} className="flex items-center gap-2 bg-muted/30 rounded px-2 py-1.5 text-xs">
            <button onClick={() => setPlayingId(playingId === song.id ? null : song.id)}
              className="text-lg shrink-0">{playingId === song.id ? '⏸️' : '▶️'}</button>
            <div className="flex-1 min-w-0">
              <div className="text-foreground truncate">{song.title}</div>
              <div className="text-muted-foreground truncate">{song.artist} · {song.genre}</div>
            </div>
            <span className="text-[10px] shrink-0" style={{ color: TIER_COLORS[song.tier] }}>{song.tier}</span>
            <span className="text-muted-foreground shrink-0">{song.duration}</span>
          </div>
        ))}
      </div>

      {lockedSongs.length > 0 && (
        <div className="text-xs text-muted-foreground text-center py-2">
          🔒 {lockedSongs.length} more songs locked in higher tiers
        </div>
      )}
    </div>
  );
}
