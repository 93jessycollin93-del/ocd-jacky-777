import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Flame, ShieldCheck, Settings2, ExternalLink } from 'lucide-react';
import LovableEmbed from '@/eru/components/storefront/LovableEmbed';
import ExternalEmbedConfigurator from '@/eru/components/storefront/ExternalEmbedConfigurator';
import { EXTERNAL_PORTALS, getPortalUrl, setPortalUrlOverride } from '@/eru/lib/externalPortals';
import { useAuth } from '@/eru/lib/AuthContext';
import { canManageExternalPortals } from '@/eru/lib/permissions';

/**
 * Phoenix Investor Portal
 * ----------------------------------------------------------------------------
 * Consumer-facing page that embeds an external Lovable app inside the existing
 * Storefront area. The URL is owner-configurable via:
 *   - lib/externalPortals.js (defaultUrl)
 *   - VITE_PHOENIX_INVESTOR_URL env var
 *   - localStorage override (admin-only inline "Configure" UI below)
 *
 * The embed is performed by <LovableEmbed /> which handles CSP/X-Frame-Options
 * failures with a polished fallback card and an "Open externally" button.
 * --------------------------------------------------------------------------*/

const PORTAL = EXTERNAL_PORTALS.phoenix_investor;

export default function PhoenixInvestor() {
  const { currentUser } = useAuth();
  const canManage = canManageExternalPortals(currentUser);

  const [url, setUrl] = useState(() => getPortalUrl(PORTAL.id));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    // Re-read in case another admin tab updated the override.
    setUrl(getPortalUrl(PORTAL.id));
  }, []);

  const handleConfigSave = (nextUrl) => {
    setPortalUrlOverride(PORTAL.id, nextUrl || '');
    setUrl(getPortalUrl(PORTAL.id));
    setEditing(false);
  };

  return (
    <div
      className="flex flex-col bg-background"
      // Full viewport minus Layout's sticky ticker+nav chrome. Using dvh keeps
      // this correct inside Telegram WebView where the address bar animates.
      style={{ minHeight: 'calc(100dvh - 8rem)' }}
    >
      {/* Header — matches existing Storefront visual language */}
      <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 flex-shrink-0">
        <Link
          to="/storefront"
          className="p-1.5 rounded-lg bg-secondary hover:bg-border transition-colors"
          aria-label="Back to storefront"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-primary/20 border border-primary/30 flex items-center justify-center">
          <Flame className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold text-foreground truncate">{PORTAL.name}</h1>
          <p className="text-[11px] text-muted-foreground truncate">{PORTAL.description}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] text-primary">
            <ShieldCheck className="w-3 h-3" /> External
          </span>
          {canManage && (
            <button
              onClick={() => setEditing((prev) => !prev)}
              className="p-1.5 rounded-lg bg-secondary hover:bg-border transition-colors"
              aria-label="Configure portal URL"
              title="Configure portal URL"
            >
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Admin config row — owner/admin only, fully audit-logged & validated */}
      {canManage && editing && (
        <div className="px-4 py-3 border-b border-border bg-secondary/10 flex-shrink-0">
          <ExternalEmbedConfigurator
            user={currentUser}
            portalId={PORTAL.id}
            currentUrl={url}
            onSave={handleConfigSave}
          />
        </div>
      )}

      {/* Embed surface — grows to fill remaining height */}
      <div
        className="flex-1 min-h-0 px-3 sm:px-4 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {url ? (
          <LovableEmbed url={url} title={`${PORTAL.name} portal`} />
        ) : (
          <NotConfiguredState isAdmin={canManage} onConfigure={() => setEditing(true)} />
        )}
      </div>
    </div>
  );
}

function NotConfiguredState({ isAdmin, onConfigure }) {
  return (
    <div className="h-full min-h-[60dvh] flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 text-center space-y-4 shadow-xl">
        <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-orange-500/20 to-primary/20 border border-primary/30 flex items-center justify-center">
          <Flame className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Phoenix Investor</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This module is powered by an external Lovable app. Once the URL is configured, the portal will open here — or in a new tab if embedding is blocked.
          </p>
        </div>
        {isAdmin ? (
          <button
            onClick={onConfigure}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Settings2 className="w-3.5 h-3.5" /> Configure URL
          </button>
        ) : (
          <p className="text-[11px] text-muted-foreground/70">
            Please check back shortly — an admin is finishing setup.
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/60 inline-flex items-center gap-1 justify-center">
          <ExternalLink className="w-3 h-3" /> Opens securely in a new tab if embedding is blocked.
        </p>
      </div>
    </div>
  );
}