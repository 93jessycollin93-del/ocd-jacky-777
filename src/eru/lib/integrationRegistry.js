// Integration registry — single source of truth for every external provider
// ERU knows about. Default status is the honest one: never "connected" unless
// secrets/OAuth/webhooks are actually verified.
//
// Each entry is metadata only. Real connection state is computed at runtime
// against:
//   • the existing secrets list (passed in as `availableSecrets`)
//   • already-authorized OAuth connectors (passed in as `authorizedConnectors`)
//   • IntegrationProvider rows the admin has saved (override status)
//
// Adding a new provider = add one entry below + (optionally) a backend
// function and a focused panel component. The hub picks it up automatically.
//
// IMPORTANT: Telegram and TON are listed here for visibility, but their
// actual setup still lives in the existing Telegram management pages — this
// hub only reports honest status and links into those flows. We never
// duplicate or override the working Telegram pipeline.

export const INTEGRATION_CATEGORIES = [
  { key: 'messaging',     label: 'Messaging' },
  { key: 'payments',      label: 'Payments' },
  { key: 'ai',            label: 'AI' },
  { key: 'dev',           label: 'Dev' },
  { key: 'storage',       label: 'Storage' },
  { key: 'commerce',      label: 'Commerce' },
  { key: 'data',          label: 'Data' },
  { key: 'security',      label: 'Security' },
  { key: 'cards_pricing', label: 'Cards / Pricing' },
  { key: 'social',        label: 'Social' },
  { key: 'productivity',  label: 'Productivity' },
];

// Honest status taxonomy — matches IntegrationProvider entity enum.
export const STATUS = {
  CONNECTED:           'connected',
  NOT_CONNECTED:       'not_connected',
  SETUP_REQUIRED:      'setup_required',
  NEEDS_CREDENTIALS:   'needs_credentials',
  NEEDS_WEBHOOK:       'needs_webhook',
  NEEDS_VERIFICATION:  'needs_verification',
  SOURCE_OFFLINE:      'source_offline',
  PERMISSION_MISSING:  'permission_missing',
  UNSUPPORTED:         'unsupported',
  DISABLED:            'disabled',
};

export const STATUS_LABELS = {
  connected:          'Connected',
  not_connected:      'Not Connected',
  setup_required:     'Setup Required',
  needs_credentials:  'Needs Credentials',
  needs_webhook:      'Needs Webhook',
  needs_verification: 'Needs Verification',
  source_offline:     'Source Offline',
  permission_missing: 'Permission Missing',
  unsupported:        'Unsupported',
  disabled:           'Disabled',
};

export const STATUS_TONES = {
  connected:          'ok',
  not_connected:      'muted',
  setup_required:     'warn',
  needs_credentials:  'warn',
  needs_webhook:      'warn',
  needs_verification: 'warn',
  source_offline:     'danger',
  permission_missing: 'danger',
  unsupported:        'muted',
  disabled:           'muted',
};

// Each provider declares the secrets/connectors that prove a real connection.
// Status is then computed from the env — never assumed.
export const INTEGRATION_REGISTRY = [
  // ---------- Messaging --------------------------------------------------
  {
    providerKey: 'whatsapp_meta',
    name: 'WhatsApp Business · Meta Cloud API',
    category: 'messaging',
    providerType: 'meta_cloud',
    authType: 'bearer_token',
    requiresWebhook: true,
    requiresSecrets: ['WHATSAPP_META_TOKEN', 'WHATSAPP_META_PHONE_NUMBER_ID', 'WHATSAPP_META_VERIFY_TOKEN'],
    enables: 'Send and receive WhatsApp messages, run templates, manage opt-ins.',
    setupUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp',
    flagship: true,
    productionReady: false,
  },
  {
    providerKey: 'whatsapp_twilio',
    name: 'WhatsApp Business · Twilio',
    category: 'messaging',
    providerType: 'twilio',
    authType: 'api_key',
    requiresWebhook: true,
    requiresSecrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM'],
    enables: 'Send and receive WhatsApp messages via Twilio Messaging.',
    setupUrl: 'https://www.twilio.com/docs/whatsapp',
    docsUrl: 'https://www.twilio.com/docs/whatsapp/api',
    flagship: true,
    productionReady: false,
  },
  {
    providerKey: 'telegram_bot',
    name: 'Telegram Bot',
    category: 'messaging',
    providerType: 'telegram',
    authType: 'bearer_token',
    requiresWebhook: true,
    requiresSecrets: ['TELEGRAM_BOT_TOKEN'],
    enables: 'Telegram bot messaging, webhooks, mini-app entry point.',
    setupUrl: '/telegram-bots',
    docsUrl: 'https://core.telegram.org/bots/api',
  },
  {
    providerKey: 'telegram_mini_app',
    name: 'Telegram Mini App',
    category: 'messaging',
    providerType: 'telegram',
    authType: 'none',
    requiresWebhook: false,
    requiresSecrets: ['TELEGRAM_BOT_TOKEN'],
    enables: 'Mini App surface inside Telegram chats.',
    setupUrl: '/tgapps',
    docsUrl: 'https://core.telegram.org/bots/webapps',
  },
  {
    providerKey: 'twilio_sms',
    name: 'Twilio SMS / Voice',
    category: 'messaging',
    providerType: 'twilio',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
    enables: 'Outbound SMS and voice notifications.',
    setupUrl: 'https://www.twilio.com/console',
    docsUrl: 'https://www.twilio.com/docs',
  },

  // ---------- Payments ---------------------------------------------------
  {
    providerKey: 'stripe',
    name: 'Stripe Payments',
    category: 'payments',
    providerType: 'stripe',
    authType: 'api_key',
    requiresWebhook: true,
    requiresSecrets: ['STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET'],
    enables: 'Card payments, subscriptions, payouts.',
    setupUrl: 'https://dashboard.stripe.com/apikeys',
    docsUrl: 'https://stripe.com/docs',
  },
  {
    providerKey: 'ton_connect',
    name: 'TON Connect Wallet',
    category: 'payments',
    providerType: 'ton',
    authType: 'wallet',
    requiresWebhook: false,
    requiresSecrets: [],
    enables: 'TON wallet connection for Telegram-native payments.',
    setupUrl: 'https://docs.ton.org/develop/dapps/ton-connect/overview',
    docsUrl: 'https://docs.ton.org',
  },
  {
    providerKey: 'telegram_stars',
    name: 'Telegram Stars',
    category: 'payments',
    providerType: 'telegram',
    authType: 'bearer_token',
    requiresWebhook: true,
    requiresSecrets: ['TELEGRAM_BOT_TOKEN'],
    enables: 'In-Telegram Stars purchases and gift flows.',
    setupUrl: 'https://core.telegram.org/bots/payments-stars',
    docsUrl: 'https://core.telegram.org/bots/payments',
  },
  {
    providerKey: 'shopify',
    name: 'Shopify Commerce',
    category: 'commerce',
    providerType: 'shopify',
    authType: 'api_key',
    requiresWebhook: true,
    requiresSecrets: ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_TOKEN'],
    enables: 'Sync products, orders, fulfillment.',
    setupUrl: 'https://admin.shopify.com',
    docsUrl: 'https://shopify.dev/docs/api',
  },

  // ---------- AI ---------------------------------------------------------
  {
    providerKey: 'openai',
    name: 'OpenAI',
    category: 'ai',
    providerType: 'openai',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['OPENAI_API_KEY'],
    enables: 'GPT model access for Jackie and AI Lab.',
    setupUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs',
  },
  {
    providerKey: 'anthropic',
    name: 'Anthropic Claude',
    category: 'ai',
    providerType: 'anthropic',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['ANTHROPIC_API_KEY'],
    enables: 'Claude model access for Jackie and AI Lab.',
    setupUrl: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com',
  },
  {
    providerKey: 'gemini',
    name: 'Google Gemini',
    category: 'ai',
    providerType: 'google',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['GEMINI_API_KEY'],
    enables: 'Gemini models for multi-provider routing.',
    setupUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/docs',
  },
  {
    providerKey: 'perplexity',
    name: 'Perplexity Search',
    category: 'ai',
    providerType: 'perplexity',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['PERPLEXITY_API_KEY'],
    enables: 'Web-grounded search responses.',
    setupUrl: 'https://www.perplexity.ai/settings/api',
    docsUrl: 'https://docs.perplexity.ai',
  },
  {
    providerKey: 'huggingface',
    name: 'Hugging Face',
    category: 'ai',
    providerType: 'huggingface',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['HUGGINGFACE_API_KEY'],
    enables: 'Open-source model access via HF Inference.',
    setupUrl: 'https://huggingface.co/settings/tokens',
    docsUrl: 'https://huggingface.co/docs',
  },
  {
    providerKey: 'elevenlabs',
    name: 'ElevenLabs Voice',
    category: 'ai',
    providerType: 'elevenlabs',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['ELEVENLABS_API_KEY'],
    enables: 'High-quality voice synthesis for Jackie.',
    setupUrl: 'https://elevenlabs.io/app/speech-synthesis',
    docsUrl: 'https://elevenlabs.io/docs',
  },

  // ---------- Dev --------------------------------------------------------
  {
    providerKey: 'github',
    name: 'GitHub',
    category: 'dev',
    providerType: 'github',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'github',
    enables: 'Repo sync, issues, releases.',
    setupUrl: 'https://github.com/settings/tokens',
    docsUrl: 'https://docs.github.com/rest',
  },
  {
    providerKey: 'gitlab',
    name: 'GitLab',
    category: 'dev',
    providerType: 'gitlab',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'gitlab',
    enables: 'Repo sync, pipelines.',
    setupUrl: 'https://gitlab.com/-/profile/personal_access_tokens',
    docsUrl: 'https://docs.gitlab.com/ee/api',
  },
  {
    providerKey: 'linear',
    name: 'Linear',
    category: 'productivity',
    providerType: 'linear',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'linear',
    enables: 'Issue tracking and project sync.',
    setupUrl: 'https://linear.app/settings/api',
    docsUrl: 'https://developers.linear.app',
  },
  {
    providerKey: 'aikido',
    name: 'Aikido Security',
    category: 'security',
    providerType: 'aikido',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['AIKIDO_API_KEY'],
    enables: 'Security and dependency scanning.',
    setupUrl: 'https://app.aikido.dev',
    docsUrl: 'https://help.aikido.dev',
  },

  // ---------- Storage ----------------------------------------------------
  {
    providerKey: 'supabase',
    name: 'Supabase',
    category: 'storage',
    providerType: 'supabase',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'supabase',
    enables: 'External Postgres / Auth / Storage.',
    setupUrl: 'https://supabase.com/dashboard',
    docsUrl: 'https://supabase.com/docs',
  },
  {
    providerKey: 'aws_s3',
    name: 'AWS S3',
    category: 'storage',
    providerType: 'aws',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'],
    enables: 'Object storage for assets and exports.',
    setupUrl: 'https://console.aws.amazon.com/s3',
    docsUrl: 'https://docs.aws.amazon.com/s3',
  },
  {
    providerKey: 'pinata_ipfs',
    name: 'Pinata · IPFS',
    category: 'storage',
    providerType: 'pinata',
    authType: 'bearer_token',
    requiresWebhook: false,
    requiresSecrets: ['PINATA_JWT'],
    enables: 'IPFS pinning for NFTs and shared assets.',
    setupUrl: 'https://app.pinata.cloud/keys',
    docsUrl: 'https://docs.pinata.cloud',
  },
  {
    providerKey: 'dropbox',
    name: 'Dropbox',
    category: 'storage',
    providerType: 'dropbox',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'dropbox',
    enables: 'File backup and import.',
    setupUrl: 'https://www.dropbox.com/developers',
    docsUrl: 'https://www.dropbox.com/developers/documentation',
  },
  {
    providerKey: 'box',
    name: 'Box',
    category: 'storage',
    providerType: 'box',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'box',
    enables: 'Enterprise file storage.',
    setupUrl: 'https://app.box.com',
    docsUrl: 'https://developer.box.com',
  },

  // ---------- Productivity / Data ---------------------------------------
  {
    providerKey: 'gmail',
    name: 'Gmail (send)',
    category: 'messaging',
    providerType: 'google',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'gmail',
    enables: 'Outbound email via authorized Gmail account.',
    setupUrl: 'https://mail.google.com',
    docsUrl: 'https://developers.google.com/gmail/api',
  },
  {
    providerKey: 'google_calendar',
    name: 'Google Calendar',
    category: 'productivity',
    providerType: 'google',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'googlecalendar',
    enables: 'Schedule sync, event reminders.',
    setupUrl: 'https://calendar.google.com',
    docsUrl: 'https://developers.google.com/calendar',
  },
  {
    providerKey: 'google_sheets',
    name: 'Google Sheets',
    category: 'data',
    providerType: 'google',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'googlesheets',
    enables: 'Two-way sync of structured data.',
    setupUrl: '/sheets-sync',
    docsUrl: 'https://developers.google.com/sheets/api',
  },
  {
    providerKey: 'google_drive',
    name: 'Google Drive',
    category: 'storage',
    providerType: 'google',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'googledrive',
    enables: 'File import, export, backups.',
    setupUrl: 'https://drive.google.com',
    docsUrl: 'https://developers.google.com/drive',
  },
  {
    providerKey: 'airtable',
    name: 'Airtable',
    category: 'data',
    providerType: 'airtable',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'airtable',
    enables: 'Bidirectional sync with Airtable bases.',
    setupUrl: 'https://airtable.com/account',
    docsUrl: 'https://airtable.com/developers',
  },
  {
    providerKey: 'notion',
    name: 'Notion',
    category: 'productivity',
    providerType: 'notion',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'notion',
    enables: 'Sync notes, knowledge base, project pages.',
    setupUrl: 'https://www.notion.so/my-integrations',
    docsUrl: 'https://developers.notion.com',
  },
  {
    providerKey: 'contentful',
    name: 'Contentful CMS',
    category: 'data',
    providerType: 'contentful',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'contentful',
    enables: 'Headless CMS content sync.',
    setupUrl: 'https://app.contentful.com',
    docsUrl: 'https://www.contentful.com/developers/docs',
  },
  {
    providerKey: 'firecrawl',
    name: 'Firecrawl Web Scraping',
    category: 'data',
    providerType: 'firecrawl',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['FIRECRAWL_API_KEY'],
    enables: 'Web crawling and structured extraction for Jackie.',
    setupUrl: 'https://www.firecrawl.dev',
    docsUrl: 'https://docs.firecrawl.dev',
  },

  // ---------- Social / Community ----------------------------------------
  {
    providerKey: 'slack',
    name: 'Slack Notifications',
    category: 'social',
    providerType: 'slack',
    authType: 'oauth',
    requiresWebhook: false,
    requiresSecrets: [],
    oauthConnector: 'slack',
    enables: 'Squad delivery, alerts, mission updates.',
    setupUrl: 'https://api.slack.com/apps',
    docsUrl: 'https://api.slack.com',
  },
  {
    providerKey: 'discord',
    name: 'Discord Webhook',
    category: 'social',
    providerType: 'discord',
    authType: 'webhook_secret',
    requiresWebhook: true,
    requiresSecrets: ['DISCORD_WEBHOOK_URL'],
    enables: 'Community notifications and bot relays.',
    setupUrl: 'https://discord.com/developers/applications',
    docsUrl: 'https://discord.com/developers/docs',
  },
  {
    providerKey: 'twitch',
    name: 'Twitch',
    category: 'social',
    providerType: 'twitch',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'],
    enables: 'Streaming presence and community signals.',
    setupUrl: 'https://dev.twitch.tv/console/apps',
    docsUrl: 'https://dev.twitch.tv/docs',
  },

  // ---------- Cards / Pricing -------------------------------------------
  {
    providerKey: 'tcgplayer',
    name: 'TCGplayer Pricing',
    category: 'cards_pricing',
    providerType: 'tcgplayer',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['TCGPLAYER_PUBLIC_KEY', 'TCGPLAYER_PRIVATE_KEY'],
    enables: 'Verified Pokémon card market pricing.',
    setupUrl: 'https://docs.tcgplayer.com',
    docsUrl: 'https://docs.tcgplayer.com',
  },
  {
    providerKey: 'cardmarket',
    name: 'Cardmarket Pricing',
    category: 'cards_pricing',
    providerType: 'cardmarket',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['CARDMARKET_APP_TOKEN', 'CARDMARKET_APP_SECRET'],
    enables: 'EU-focused verified card pricing.',
    setupUrl: 'https://www.cardmarket.com',
    docsUrl: 'https://api.cardmarket.com/ws/documentation',
  },
  {
    providerKey: 'ebay_sold',
    name: 'eBay Sold Comps',
    category: 'cards_pricing',
    providerType: 'ebay',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['EBAY_APP_ID', 'EBAY_CERT_ID'],
    enables: 'Real sold-comp data for verified pricing.',
    setupUrl: 'https://developer.ebay.com',
    docsUrl: 'https://developer.ebay.com/api-docs',
  },
  {
    providerKey: 'pricecharting',
    name: 'PriceCharting',
    category: 'cards_pricing',
    providerType: 'pricecharting',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['PRICECHARTING_API_KEY'],
    enables: 'Index-style pricing for graded and raw cards.',
    setupUrl: 'https://www.pricecharting.com/api-documentation',
    docsUrl: 'https://www.pricecharting.com/api-documentation',
  },
  {
    providerKey: 'pokemon_tcg_api',
    name: 'Pokémon TCG API',
    category: 'cards_pricing',
    providerType: 'pokemon_tcg',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['POKEMON_TCG_API_KEY'],
    enables: 'Card identification metadata.',
    setupUrl: 'https://dev.pokemontcg.io',
    docsUrl: 'https://docs.pokemontcg.io',
  },
  {
    providerKey: 'fx_rates',
    name: 'FX / CAD Conversion',
    category: 'cards_pricing',
    providerType: 'fx',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['FX_API_KEY'],
    enables: 'Real currency conversion for CAD display.',
    setupUrl: 'https://openexchangerates.org',
    docsUrl: 'https://docs.openexchangerates.org',
  },

  // ---------- Email -----------------------------------------------------
  {
    providerKey: 'smtp_email',
    name: 'Email · SMTP',
    category: 'messaging',
    providerType: 'smtp',
    authType: 'api_key',
    requiresWebhook: false,
    requiresSecrets: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'],
    enables: 'Generic transactional email.',
    setupUrl: 'https://resend.com',
    docsUrl: 'https://resend.com/docs',
  },
];

/**
 * Compute honest status for a single registry entry, given the live
 * environment context (secrets present + authorized OAuth connectors +
 * any admin override stored in IntegrationProvider).
 *
 * Returns the most pessimistic plausible status — never overstates.
 */
export function computeStatus(entry, { availableSecrets = [], authorizedConnectors = [], override } = {}) {
  if (override && override.status) return override.status;

  const secretsSet = new Set((availableSecrets || []).map((s) => String(s).toUpperCase()));
  const connectorsSet = new Set((authorizedConnectors || []).map((c) => String(c).toLowerCase()));

  // OAuth-based providers: connected when their connector is authorized.
  if (entry.authType === 'oauth' && entry.oauthConnector) {
    return connectorsSet.has(entry.oauthConnector.toLowerCase())
      ? STATUS.CONNECTED
      : STATUS.NOT_CONNECTED;
  }

  // Wallet providers: never auto-connected.
  if (entry.authType === 'wallet') return STATUS.NOT_CONNECTED;

  // Secret-based providers.
  const required = entry.requiresSecrets || [];
  if (required.length === 0) {
    // Nothing to check, no OAuth → setup required.
    return STATUS.SETUP_REQUIRED;
  }
  const missing = required.filter((s) => !secretsSet.has(String(s).toUpperCase()));
  if (missing.length === required.length) return STATUS.NEEDS_CREDENTIALS;
  if (missing.length > 0) return STATUS.NEEDS_CREDENTIALS;

  // All secrets present, but webhook-required providers still need
  // verification before we can claim Connected.
  if (entry.requiresWebhook) return STATUS.NEEDS_VERIFICATION;
  return STATUS.NEEDS_VERIFICATION;
}

export function getCategoryLabel(key) {
  const found = INTEGRATION_CATEGORIES.find((c) => c.key === key);
  return found ? found.label : key;
}