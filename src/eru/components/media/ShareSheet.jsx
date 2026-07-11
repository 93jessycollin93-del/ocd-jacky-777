import { useState } from 'react';
import { X, Lock, Link2, Globe, Check, Loader2, Copy, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

import { setPlaylistVisibility, shareUrlForPlaylist, VISIBILITY } from '@/eru/lib/mediaLibrary';
import { ACK_TERMS } from '@/eru/lib/mediaConverter';

const OPTIONS = [
  {
    value: VISIBILITY.PRIVATE,
    icon: Lock,
    label: 'Private',
    desc: 'Only you can see and play this playlist.',
  },
  {
    value: VISIBILITY.UNLISTED,
    icon: Link2,
    label: 'Unlisted',
    desc: 'Anyone with the link can play it. Not shown in community browse.',
  },
  {
    value: VISIBILITY.PUBLIC,
    icon: Globe,
    label: 'Public',
    desc: 'Anyone can find and play it in community browse.',
  },
];

/**
 * ShareSheet — change a playlist's visibility and copy its share link.
 *
 * Switching from private to unlisted/public publishes the uploader's audio
 * files, so the converter terms must be acknowledged once before sharing (the
 * same acknowledgment enforced by mediaLibrary.setPlaylistVisibility). Already-
 * acknowledged playlists skip the terms step.
 */
export default function ShareSheet({ playlist, onClose, onChanged }) {
  const [visibility, setVisibility] = useState(playlist.visibility || VISIBILITY.PRIVATE);
  const [ack, setAck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedShared, setSavedShared] = useState(
    playlist.visibility === VISIBILITY.UNLISTED || playlist.visibility === VISIBILITY.PUBLIC,
  );

  const willShare = visibility !== VISIBILITY.PRIVATE;
  const alreadyAck = Boolean(playlist.terms_acknowledged);
  const needsAck = willShare && !alreadyAck;
  const canSave = !needsAck || ack;

  const shareUrl = shareUrlForPlaylist(playlist.id);

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await setPlaylistVisibility(playlist.id, visibility, {
        acknowledged: alreadyAck || ack,
      });
      setSavedShared(willShare);
      toast.success(willShare ? 'Playlist is now shareable.' : 'Playlist is private.');
      onChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Could not update sharing.');
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy the link.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share playlist"
    >
      <div
        className="mx-auto w-full max-w-screen-sm rounded-t-2xl border border-border bg-card p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Share “{playlist.name}”</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Visibility options */}
        <div className="space-y-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = visibility === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  selected ? 'border-primary bg-primary/10' : 'border-border bg-background/40 hover:bg-accent'
                }`}
              >
                <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                </div>
                <span
                  className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                    selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  }`}
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Terms acknowledgment (only when newly sharing) */}
        {needsAck && (
          <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Before you share
            </p>
            <p className="max-h-24 overflow-y-auto text-[12px] leading-relaxed text-muted-foreground">
              {ACK_TERMS}
            </p>
            <label className="mt-2 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span className="text-[12px] text-foreground">
                I have read and agree to these terms.
              </span>
            </label>
          </div>
        )}

        {/* Save */}
        <button
          onClick={save}
          disabled={!canSave || saving}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save
        </button>

        {/* Share link */}
        {savedShared && (
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              Share link
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/40 p-2">
              <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{shareUrl}</span>
              <button
                onClick={copy}
                className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
