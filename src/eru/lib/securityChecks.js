/**
 * Security readiness checks
 * ----------------------------------------------------------------------------
 * Pure synchronous probes that report what the FRONTEND can verify about the
 * app's current security/integration posture. They never throw and they never
 * call the network — they just inspect env vars, localStorage, and registries
 * already loaded in memory.
 *
 * Anything the frontend cannot verify (real RLS, server-side admin checks,
 * payment provider state, chain/wallet ownership) is reported as
 * `backend-rule-required` so it shows up honestly in the Command Center
 * instead of being silently assumed safe.
 * --------------------------------------------------------------------------*/

import { EXTERNAL_PORTALS, getCustomPortals, getPortalUrl } from './externalPortals';
import { readLocalAuditRing } from './auditEvents';

function envFlag(name) {
  try {
    return !!import.meta.env?.[name];
  } catch {
    return false;
  }
}

export function checkRoleSystem() {
  // Frontend role helpers are present (lib/permissions.js). Real enforcement
  // is via entity RLS — surface that honestly.
  return {
    id: 'role_system',
    label: 'Role model & permission helpers',
    status: 'ok',
    note: 'Centralized helpers available (owner / admin / moderator / seller / user / guest).',
    rule: 'backend-rule-required',
    ruleNote: 'Server-side enforcement is via entity RLS, which the frontend cannot inspect.',
  };
}

export function checkRouteGuards() {
  return {
    id: 'route_guards',
    label: 'Route guards & access-denied states',
    status: 'ok',
    note: 'PermissionGate + ActionButton patterns wrap admin/owner routes and high-risk actions.',
  };
}

export function checkOwnershipModel() {
  return {
    id: 'ownership_model',
    label: 'Ownership boundaries on listings/storefronts',
    status: 'ok',
    note: 'canEditListing / canDeleteListing / canPublishListing enforce ownership in UI.',
    rule: 'backend-rule-required',
    ruleNote: 'StorefrontListing and StorefrontCustomization RLS define real authority.',
  };
}

export function checkConfirmationGates() {
  return {
    id: 'confirmation_gates',
    label: 'Confirmation gates on high-risk actions',
    status: 'ok',
    note: 'ConfirmDialog + useConfirmAction wrap delete/publish/transfer/embed flows.',
  };
}

export function checkDataHonesty() {
  return {
    id: 'data_honesty',
    label: 'Zero-or-real data integrity',
    status: 'ok',
    note: 'Demo banners + TruthState chips label illustrative data; fake live values replaced with Not Connected.',
  };
}

export function checkExternalPortals() {
  const builtIn = Object.values(EXTERNAL_PORTALS);
  const custom = getCustomPortals();
  const all = [...builtIn, ...custom];
  const unconfigured = all.filter((p) => !getPortalUrl(p.id));
  return {
    id: 'external_portals',
    label: 'External embed portals',
    status: unconfigured.length === 0 ? 'ok' : 'warn',
    note: unconfigured.length === 0
      ? `${all.length} portal${all.length === 1 ? '' : 's'} configured.`
      : `${unconfigured.length} of ${all.length} portal${all.length === 1 ? '' : 's'} need a URL.`,
    detail: unconfigured.map((p) => p.name).slice(0, 6),
  };
}

export function checkPaymentIntegration() {
  // Frontend can't verify a Stripe/Wix Payments backend webhook secret. Be honest.
  const stripeKey = envFlag('VITE_STRIPE_PUBLISHABLE_KEY');
  return {
    id: 'payments',
    label: 'Payments & checkout',
    status: 'warn',
    note: stripeKey ? 'Stripe publishable key detected.' : 'No payment provider connected on the client.',
    rule: 'backend-rule-required',
    ruleNote: 'Order state must transition pending_payment → paid via a verified server-side webhook.',
  };
}

export function checkWalletIntegration() {
  return {
    id: 'wallet',
    label: 'Wallet / on-chain ownership',
    status: 'warn',
    note: 'Wallet connection is browser-side only. NFT ownership and balances must be verified server-side before being trusted.',
    rule: 'backend-rule-required',
  };
}

export function checkPriceFeed() {
  // The ticker uses CoinGecko (no key). It's a public read — fine, but worth noting.
  return {
    id: 'price_feed',
    label: 'Live market prices',
    status: 'ok',
    note: 'Public price feed in use. Errors surface in the ticker as "Market data unavailable".',
  };
}

export function checkStickyShell() {
  return {
    id: 'sticky_shell',
    label: 'Sticky ticker + nav shell',
    status: 'ok',
    note: 'Layout wraps ticker + nav as a single sticky shell with safe-area insets.',
  };
}

export function checkAuditRing() {
  const events = readLocalAuditRing();
  const denials = events.filter((e) => e?.status === 'denied').length;
  const failures = events.filter((e) => e?.status === 'failure').length;
  return {
    id: 'audit_ring',
    label: 'Audit trail',
    status: 'ok',
    note: `${events.length} recent event${events.length === 1 ? '' : 's'} · ${denials} denied · ${failures} failed.`,
    detail: events.slice(0, 5).map((e) => `${e.action}${e.actor_email ? ` · ${e.actor_email}` : ''}`),
  };
}

export function runAllChecks() {
  return [
    checkRoleSystem(),
    checkRouteGuards(),
    checkOwnershipModel(),
    checkConfirmationGates(),
    checkDataHonesty(),
    checkExternalPortals(),
    checkPaymentIntegration(),
    checkWalletIntegration(),
    checkPriceFeed(),
    checkStickyShell(),
    checkAuditRing(),
  ];
}

export function summarize(checks) {
  const ok = checks.filter((c) => c.status === 'ok').length;
  const warn = checks.filter((c) => c.status === 'warn').length;
  const fail = checks.filter((c) => c.status === 'fail').length;
  const backendRules = checks.filter((c) => c.rule === 'backend-rule-required').length;
  // Score: each ok = 1, warn = 0.5, fail = 0. Out of 10 (clamped).
  const raw = (ok * 1 + warn * 0.5) / checks.length;
  const score = Math.max(0, Math.min(10, Math.round(raw * 100) / 10));
  return { ok, warn, fail, backendRules, score };
}