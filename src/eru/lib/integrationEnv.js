// Environment detection — produces the lists the registry needs to compute
// honest status. Keeps the hub working even when the platform doesn't expose
// a "list secrets" API by reading a documented snapshot from APP env.
//
// We intentionally do NOT try to read raw secret values from the browser.
// We only need to know which secret NAMES exist, so the hub can flip
// providers from Needs Credentials → Needs Verification.
//
// The truth-source for "what secrets exist" is the platform's secret list.
// Since that list isn't browser-readable, the admin can paste/maintain a
// canonical names list under localStorage `eru_known_secrets` (admin-only
// settings). Defaults seeded from <existing_secrets> at app build time.

const KNOWN_SECRETS_KEY = 'eru_known_secrets';

// Seeded from the platform's existing_secrets list. Updating this defaults
// list does NOT expose secret values — only names.
const DEFAULT_KNOWN_SECRETS = [
  'PINATA_JWT',
  'HUGGINGFACE_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'APP_BASE_URL',
  'TELEGRAM_BOT_TOKEN',
];

// Authorized OAuth connectors visible to backend (from <authorized_app_connectors>
// + <registered_app_user_connectors>). Names use the integration_type slug.
const DEFAULT_AUTHORIZED_CONNECTORS = [
  'gmail',
  'googledrive',
  'googlecalendar',
  'googlesheets',
  'googledocs',
  'googleslides',
  'googlebigquery',
  'googlemeet',
  'googletasks',
  'google_analytics',
  'google_search_console',
  'notion',
  'slack',
  'slackbot',
  'github',
  'gitlab',
  'linear',
  'wrike',
  'clickup',
  'airtable',
  'dropbox',
  'box',
  'one_drive',
  'share_point',
  'outlook',
  'microsoft_teams',
  'salesforce',
  'hubspot',
  'linkedin',
  'tiktok',
  'discord',
  'wix',
  'typeform',
  'splitwise',
  'contentful',
  'supabase',
  'hugging_face',
];

export function getKnownSecretNames() {
  try {
    const saved = JSON.parse(localStorage.getItem(KNOWN_SECRETS_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* ignore */ }
  return DEFAULT_KNOWN_SECRETS;
}

export function setKnownSecretNames(names, { actorRole } = {}) {
  if (actorRole !== 'admin') throw new Error('Only admin can edit known-secret names.');
  try {
    localStorage.setItem(KNOWN_SECRETS_KEY, JSON.stringify(names || []));
  } catch { /* quota */ }
}

export function getAuthorizedConnectors() {
  return DEFAULT_AUTHORIZED_CONNECTORS;
}