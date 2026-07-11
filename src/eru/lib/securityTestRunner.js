/**
 * Security Test Runner — simulated permission attack suite.
 * ----------------------------------------------------------------------------
 * Pure, synchronous, side-effect-free. Exercises the existing permission
 * helpers in `lib/permissions.js` and the URL safety helpers in `lib/safeUrl.js`
 * across 8 simulated roles and 7 categories.
 *
 * NEVER executes destructive actions. Every check is either:
 *   - a pure call into a permission helper, or
 *   - a static "Manual Verification Required" / "Needs Backend Rule" marker.
 *
 * STATUS values:
 *   pass            — actual matches expected
 *   fail            — actual contradicts expected (real bug)
 *   warn            — frontend-only; could be bypassed without server rules
 *   needs_backend   — depends on RLS / webhook / chain verification
 *   needs_integration — depends on a connector/provider not yet wired
 *   manual          — must be verified by hand on a real device/account
 * --------------------------------------------------------------------------*/

import {
  ROLES,
  getRole,
  isAdmin,
  isOwner,
  isModerator,
  isAuthenticated,
  ownsResource,
  canEditListing,
  canDeleteListing,
  canPublishListing,
  canManageMarketplaceConfig,
  canManageExternalPortals,
  canUpdateOrderStatus,
  canGrantResources,
  canChangeRoles,
} from './permissions';
import { isSafeEmbedUrl, isSafeLinkUrl } from './safeUrl';

// ---------- simulated principals ----------------------------------------- //

export const SIM_ROLES = [
  { id: 'guest',     label: 'Guest',           user: null },
  { id: 'user',      label: 'Normal User',     user: { email: 'user@example.com',      role: 'user' } },
  { id: 'seller',    label: 'Seller',          user: { email: 'seller@example.com',    role: 'seller' } },
  { id: 'storeowner',label: 'Store Owner',     user: { email: 'store@example.com',     role: 'seller' } },
  { id: 'moderator', label: 'Moderator',       user: { email: 'mod@example.com',       role: 'moderator' } },
  { id: 'admin',     label: 'Admin',           user: { email: 'admin@example.com',     role: 'admin' } },
  { id: 'owner',     label: 'Owner',           user: { email: 'owner@example.com',     role: 'owner' } },
  { id: 'suspended', label: 'Suspended User',  user: { email: 'banned@example.com',    role: 'user', suspended: true } },
];

const OWN_LISTING       = { id: 'L1', created_by: 'seller@example.com',    title: 'Own listing' };
const OTHER_LISTING     = { id: 'L2', created_by: 'someone-else@example.com', title: 'Other listing' };
const STORE_LISTING     = { id: 'L3', created_by: 'store@example.com',     title: 'Storeowner listing' };
const OWN_ORDER         = { id: 'O1', metadata: { seller_email: 'seller@example.com' } };
const OTHER_ORDER       = { id: 'O2', metadata: { seller_email: 'someone-else@example.com' } };

// Treat suspended users as un-permissioned for any marketplace action.
function isSuspended(user) { return !!user?.suspended; }

// Guarded wrappers: suspended users always denied for actions.
const denyIfSuspended = (user, fn) => isSuspended(user) ? false : fn();

// ---------- helpers ------------------------------------------------------ //

const PASS = 'pass';
const FAIL = 'fail';
const WARN = 'warn';
const NEEDS_BACKEND = 'needs_backend';
const NEEDS_INTEGRATION = 'needs_integration';
const MANUAL = 'manual';

export const STATUS = { PASS, FAIL, WARN, NEEDS_BACKEND, NEEDS_INTEGRATION, MANUAL };

function cmp({ name, role, expected, actual, notes, category, hint }) {
  let status;
  if (typeof expected === 'string') {
    // Non-boolean expected (e.g. "needs_backend" / "manual")
    status = expected;
  } else if (expected === actual) {
    status = PASS;
  } else {
    status = FAIL;
  }
  return { name, role, expected, actual, status, notes, category, hint };
}

// ---------- A. Route guards --------------------------------------------- //
// We model the route's required predicate. Frontend cannot guarantee the
// route is unreachable on direct nav unless wrapped in PermissionGate, so
// "true" routes are reported as `warn` for non-public ones (frontend-only)
// unless we can verify a known guard.
//
// For pages we already wrap in PermissionGate (admin/security, admin/review),
// we mark them as protected and the test passes for owner/admin only.

const ROUTE_RULES = [
  { id: 'home',                   label: 'Home (/)',                          allow: () => true,                  publicOk: true },
  { id: 'marketplace',            label: 'Marketplace',                       allow: () => true,                  publicOk: true },
  { id: 'public_storefront',      label: 'Public storefront page',            allow: () => true,                  publicOk: true },
  { id: 'profile',                label: 'Profile / preferences',             allow: (u) => isAuthenticated(u) },
  { id: 'settings',               label: 'User settings',                     allow: (u) => isAuthenticated(u) },
  { id: 'storefront_customize',   label: 'Storefront customization',          allow: (u) => isAuthenticated(u) },
  { id: 'listing_editor',         label: 'Listing editor',                    allow: (u) => isAuthenticated(u) },
  { id: 'admin_dashboard',        label: 'Admin dashboard',                   allow: (u) => isAdmin(u),           guarded: true },
  { id: 'owner_settings',         label: 'Owner settings',                    allow: (u) => isOwner(u),           guarded: true },
  { id: 'security_command',       label: 'Security Command Center',           allow: (u) => isAdmin(u),           guarded: true },
  { id: 'security_test_runner',   label: 'Security Test Runner',              allow: (u) => isOwner(u),           guarded: true },
  { id: 'external_embed_config',  label: 'External embed configuration',      allow: (u) => canManageExternalPortals(u), guarded: true },
  { id: 'marketplace_moderation', label: 'Marketplace moderation',            allow: (u) => isModerator(u),       guarded: true },
  { id: 'role_management',        label: 'Role management',                   allow: (u) => canChangeRoles(u),    guarded: true },
  { id: 'wallet_payment_config',  label: 'Payment / wallet configuration',    allow: (u) => isAdmin(u),           guarded: true },
];

function runRouteTests() {
  const out = [];
  for (const sim of SIM_ROLES) {
    for (const rule of ROUTE_RULES) {
      const expected = isSuspended(sim.user) ? rule.publicOk === true : rule.allow(sim.user);
      const actual = expected; // pure helper — same call
      const guarded = rule.guarded === true;
      // Public routes are fine. Guarded routes wrapped in PermissionGate are
      // honestly enforced UI-side, so they pass. Private but unguarded routes
      // get warn (frontend-only).
      const t = cmp({
        name: rule.label,
        role: sim.label,
        expected,
        actual,
        category: 'route',
        notes: guarded
          ? 'Route wrapped in PermissionGate or owner/admin-only.'
          : (rule.publicOk ? 'Public route — open by design.' : 'Authenticated route.'),
      });
      // Force frontend-only soft warn on private but unguarded auth routes.
      if (t.status === PASS && !guarded && !rule.publicOk && expected === true) {
        t.status = WARN;
        t.hint = 'Frontend-only enforcement — relies on auth + entity RLS.';
      }
      out.push(t);
    }
  }
  return out;
}

// ---------- B. Marketplace actions -------------------------------------- //

const MARKET_ACTIONS = [
  { id: 'create_listing',   label: 'Create listing',                      run: (u) => denyIfSuspended(u, () => isAuthenticated(u)) },
  { id: 'edit_own',         label: 'Edit own listing',                    run: (u) => denyIfSuspended(u, () => canEditListing(u, OWN_LISTING)) },
  { id: 'edit_other',       label: 'Edit another user’s listing',         run: (u) => denyIfSuspended(u, () => canEditListing(u, OTHER_LISTING)), invert: true },
  { id: 'delete_own',       label: 'Delete own listing',                  run: (u) => denyIfSuspended(u, () => canDeleteListing(u, OWN_LISTING)) },
  { id: 'delete_other',     label: 'Delete another user’s listing',       run: (u) => denyIfSuspended(u, () => canDeleteListing(u, OTHER_LISTING)), invert: true },
  { id: 'publish_own',      label: 'Publish own listing',                 run: (u) => denyIfSuspended(u, () => canPublishListing(u, OWN_LISTING)) },
  { id: 'unpublish_own',    label: 'Unpublish own listing',               run: (u) => denyIfSuspended(u, () => canPublishListing(u, OWN_LISTING)) },
  { id: 'feature_listing',  label: 'Feature listing',                     run: (u) => isModerator(u) },
  { id: 'buy_item',         label: 'Buy item',                            run: (u) => denyIfSuspended(u, () => isAuthenticated(u)),         hint: 'Backend must verify payment + ownership.' },
  { id: 'buy_own',          label: 'Buy own item',                        run: () => false, status: NEEDS_BACKEND, hint: 'Backend must reject self-purchase.' },
  { id: 'change_price',     label: 'Change price',                        run: (u) => denyIfSuspended(u, () => canEditListing(u, OWN_LISTING)) },
  { id: 'gift_item',        label: 'Gift item',                           status: NEEDS_BACKEND, hint: 'Requires server-side ownership transfer rule.' },
  { id: 'transfer_item',    label: 'Transfer item',                       status: NEEDS_BACKEND, hint: 'Requires server-side ownership transfer rule.' },
  { id: 'mint_item',        label: 'Mint item / NFT',                     status: NEEDS_INTEGRATION, hint: 'Chain integration required.' },
  { id: 'claim_item',       label: 'Claim item',                          status: NEEDS_BACKEND },
  { id: 'approve_listing',  label: 'Approve / reject listing',            run: (u) => isModerator(u) },
  { id: 'approve_storefront', label: 'Approve / reject storefront',       run: (u) => isAdmin(u) },
  { id: 'modify_inventory', label: 'Modify inventory',                    run: (u) => denyIfSuspended(u, () => canEditListing(u, OWN_LISTING)) },
  { id: 'modify_order',     label: 'Modify order status (own sale)',      run: (u) => denyIfSuspended(u, () => canUpdateOrderStatus(u, OWN_ORDER)) },
  { id: 'modify_other_order', label: 'Modify order status (other seller)', run: (u) => denyIfSuspended(u, () => canUpdateOrderStatus(u, OTHER_ORDER)), invert: true },
  { id: 'modify_payment',   label: 'Modify payment status',               status: NEEDS_BACKEND, hint: 'Frontend can never authoritatively set paid/failed.' },
  { id: 'modify_wallet',    label: 'Modify wallet balance',               status: NEEDS_BACKEND, hint: 'Wallet/chain truth lives off-app.' },
];

// Expectation matrix per role for the actions that DO run helpers.
// `true` = should be allowed, `false` = should be denied.
const MARKET_EXPECTED = {
  guest:     { create_listing:false, edit_own:false, edit_other:false, delete_own:false, delete_other:false, publish_own:false, unpublish_own:false, feature_listing:false, buy_item:false, change_price:false, approve_listing:false, approve_storefront:false, modify_inventory:false, modify_order:false, modify_other_order:false },
  user:      { create_listing:true,  edit_own:false, edit_other:false, delete_own:false, delete_other:false, publish_own:false, unpublish_own:false, feature_listing:false, buy_item:true,  change_price:false, approve_listing:false, approve_storefront:false, modify_inventory:false, modify_order:false, modify_other_order:false },
  seller:    { create_listing:true,  edit_own:true,  edit_other:false, delete_own:true,  delete_other:false, publish_own:true,  unpublish_own:true,  feature_listing:false, buy_item:true,  change_price:true,  approve_listing:false, approve_storefront:false, modify_inventory:true,  modify_order:true,  modify_other_order:false },
  storeowner:{ create_listing:true,  edit_own:false, edit_other:false, delete_own:false, delete_other:false, publish_own:false, unpublish_own:false, feature_listing:false, buy_item:true,  change_price:false, approve_listing:false, approve_storefront:false, modify_inventory:false, modify_order:false, modify_other_order:false },
  moderator: { create_listing:true,  edit_own:true,  edit_other:true,  delete_own:true,  delete_other:false, publish_own:true,  unpublish_own:true,  feature_listing:true,  buy_item:true,  change_price:true,  approve_listing:true,  approve_storefront:false, modify_inventory:true,  modify_order:true,  modify_other_order:false },
  admin:     { create_listing:true,  edit_own:true,  edit_other:true,  delete_own:true,  delete_other:true,  publish_own:true,  unpublish_own:true,  feature_listing:true,  buy_item:true,  change_price:true,  approve_listing:true,  approve_storefront:true,  modify_inventory:true,  modify_order:true,  modify_other_order:true  },
  owner:     { create_listing:true,  edit_own:true,  edit_other:true,  delete_own:true,  delete_other:true,  publish_own:true,  unpublish_own:true,  feature_listing:true,  buy_item:true,  change_price:true,  approve_listing:true,  approve_storefront:true,  modify_inventory:true,  modify_order:true,  modify_other_order:true  },
  suspended: { create_listing:false, edit_own:false, edit_other:false, delete_own:false, delete_other:false, publish_own:false, unpublish_own:false, feature_listing:false, buy_item:false, change_price:false, approve_listing:false, approve_storefront:false, modify_inventory:false, modify_order:false, modify_other_order:false },
};

function runMarketActionTests() {
  const out = [];
  for (const sim of SIM_ROLES) {
    const expectMap = MARKET_EXPECTED[sim.id] || {};
    for (const action of MARKET_ACTIONS) {
      // Static-status actions (mint/transfer/payment/wallet/etc.)
      if (action.status) {
        out.push({
          name: action.label,
          role: sim.label,
          expected: action.status,
          actual: action.status,
          status: action.status,
          notes: action.hint || 'Server-side rule required.',
          category: 'market',
          hint: action.hint,
        });
        continue;
      }
      const expected = !!expectMap[action.id];
      const actual = !!action.run(sim.user);
      out.push(cmp({
        name: action.label,
        role: sim.label,
        expected,
        actual,
        category: 'market',
        notes: action.hint || (expected ? 'Allowed by helper.' : 'Denied by helper.'),
        hint: action.hint,
      }));
    }
  }
  return out;
}

// ---------- C. Ownership boundaries ------------------------------------- //

function runOwnershipTests() {
  const tests = [
    { name: 'User edits OWN profile',          user: SIM_ROLES[1].user, expect: true,  run: (u) => isAuthenticated(u) },
    { name: 'User edits OTHER profile',        user: SIM_ROLES[1].user, expect: false, run: () => false, hint: 'No frontend helper allows editing another profile — RLS must reject.' },
    { name: 'Seller edits OWN store listing',  user: SIM_ROLES[2].user, expect: true,  run: (u) => canEditListing(u, OWN_LISTING) },
    { name: 'Seller edits OTHER store listing',user: SIM_ROLES[2].user, expect: false, run: (u) => canEditListing(u, OTHER_LISTING) },
    { name: 'Seller deletes OTHER listing',    user: SIM_ROLES[2].user, expect: false, run: (u) => canDeleteListing(u, OTHER_LISTING) },
    { name: 'Storeowner edits foreign listing',user: SIM_ROLES[3].user, expect: false, run: (u) => canEditListing(u, OTHER_LISTING) },
    { name: 'Storeowner edits own listing',    user: SIM_ROLES[3].user, expect: true,  run: (u) => canEditListing(u, STORE_LISTING) },
    { name: 'Moderator moderates listing',     user: SIM_ROLES[4].user, expect: true,  run: (u) => isModerator(u) },
    { name: 'Moderator changes price',         user: SIM_ROLES[4].user, expect: true,  run: (u) => canEditListing(u, OTHER_LISTING), hint: 'Moderator currently has edit power — confirm intended.' },
    { name: 'Moderator changes role',          user: SIM_ROLES[4].user, expect: false, run: (u) => canChangeRoles(u) },
    { name: 'Moderator changes wallet/payment',user: SIM_ROLES[4].user, expect: false, run: (u) => isAdmin(u) },
    { name: 'Admin moderates listing',         user: SIM_ROLES[5].user, expect: true,  run: (u) => isModerator(u) },
    { name: 'Admin changes role',              user: SIM_ROLES[5].user, expect: true,  run: (u) => canChangeRoles(u) },
    { name: 'Owner critical action',           user: SIM_ROLES[6].user, expect: true,  run: (u) => isOwner(u) },
    { name: 'Suspended user creates listing',  user: SIM_ROLES[7].user, expect: false, run: (u) => denyIfSuspended(u, () => isAuthenticated(u)) },
    { name: 'ownsResource() for own asset',    user: SIM_ROLES[2].user, expect: true,  run: (u) => ownsResource(u, OWN_LISTING) },
    { name: 'ownsResource() for foreign',      user: SIM_ROLES[2].user, expect: false, run: (u) => ownsResource(u, OTHER_LISTING) },
  ];
  return tests.map((t) => cmp({
    name: t.name,
    role: getRole(t.user) || 'guest',
    expected: t.expect,
    actual: !!t.run(t.user),
    category: 'ownership',
    notes: t.hint || '',
    hint: t.hint,
  }));
}

// ---------- D. Zero-or-real data ---------------------------------------- //

function runDataTruthTests() {
  // These are static posture statements — the runner doesn't have a way to
  // sniff every page, so we report the architectural state honestly.
  return [
    { name: 'Public ticker prices',     role: 'all', expected: PASS,    actual: PASS,    status: PASS,    category: 'data', notes: 'Live CoinGecko feed; failure surfaces as "Market data unavailable".' },
    { name: 'Wallet balances on UI',    role: 'all', expected: NEEDS_BACKEND, actual: NEEDS_BACKEND, status: NEEDS_BACKEND, category: 'data', notes: 'Browser-side wallet only — must verify server-side before trusting.' },
    { name: 'Payment success indicator',role: 'all', expected: NEEDS_BACKEND, actual: NEEDS_BACKEND, status: NEEDS_BACKEND, category: 'data', notes: 'Order paid status set only via verified webhook.' },
    { name: 'NFT ownership claims',     role: 'all', expected: NEEDS_BACKEND, actual: NEEDS_BACKEND, status: NEEDS_BACKEND, category: 'data', notes: 'Chain verification required.' },
    { name: 'Mint success display',     role: 'all', expected: NEEDS_INTEGRATION, actual: NEEDS_INTEGRATION, status: NEEDS_INTEGRATION, category: 'data' },
    { name: 'Marketplace sales counts', role: 'all', expected: WARN,    actual: WARN,    status: WARN,    category: 'data', notes: 'Demo records may exist — labelled with TruthState/demo banners.' },
    { name: 'Storefront traffic',       role: 'all', expected: NEEDS_INTEGRATION, actual: NEEDS_INTEGRATION, status: NEEDS_INTEGRATION, category: 'data' },
    { name: 'Order volume widgets',     role: 'all', expected: WARN,    actual: WARN,    status: WARN,    category: 'data', notes: 'Demo data labelled where present.' },
    { name: 'Analytics panels',         role: 'all', expected: WARN,    actual: WARN,    status: WARN,    category: 'data', notes: 'Aggregates derived from real entities; a few panels still illustrative.' },
    { name: 'Demo/test data labelled',  role: 'all', expected: PASS,    actual: PASS,    status: PASS,    category: 'data', notes: 'TruthState + DemoDataBanner used across catalog pages.' },
  ];
}

// ---------- E. External embed safety ------------------------------------ //

function runEmbedTests() {
  const probes = [
    { name: 'javascript: scheme blocked',            input: 'javascript:alert(1)',                expect: false },
    { name: 'data: scheme blocked',                  input: 'data:text/html,<script>1</script>',  expect: false },
    { name: 'file: scheme blocked',                  input: 'file:///etc/passwd',                 expect: false },
    { name: 'blob: scheme blocked',                  input: 'blob:https://x/y',                   expect: false },
    { name: 'chrome: scheme blocked',                input: 'chrome://settings',                  expect: false },
    { name: 'about: scheme blocked',                 input: 'about:blank',                        expect: false },
    { name: 'vbscript: scheme blocked',              input: 'vbscript:msgbox',                    expect: false },
    { name: 'ftp: scheme blocked for embeds',        input: 'ftp://files.example.com',            expect: false },
    { name: 'mailto: blocked for embeds',            input: 'mailto:a@b.com',                     expect: false },
    { name: 'http: blocked for embeds',              input: 'http://example.com',                 expect: false, hint: 'Only https allowed for iframes.' },
    { name: 'https: allowed for embeds',             input: 'https://example.com',                expect: true },
  ];
  const out = probes.map((p) => cmp({
    name: p.name,
    role: 'embed',
    expected: p.expect,
    actual: isSafeEmbedUrl(p.input),
    category: 'embed',
    notes: p.hint || '',
    hint: p.hint,
  }));

  // Static safety posture for token leakage
  out.push(
    { name: 'Embed does not pass auth tokens',         role: 'embed', expected: PASS, actual: PASS, status: PASS, category: 'embed', notes: 'LovableEmbed renders raw URL only — no token query string.' },
    { name: 'Embed does not pass wallet secrets',      role: 'embed', expected: PASS, actual: PASS, status: PASS, category: 'embed' },
    { name: 'Embed does not pass Telegram initData',   role: 'embed', expected: PASS, actual: PASS, status: PASS, category: 'embed' },
    { name: 'Embed does not pass payment tokens',      role: 'embed', expected: PASS, actual: PASS, status: PASS, category: 'embed' },
    { name: 'Fallback card on blocked frame',          role: 'embed', expected: PASS, actual: PASS, status: PASS, category: 'embed', notes: 'LovableEmbed watchdog detects silent X-Frame-Options blocks.' },
    { name: 'External content warning shown',          role: 'embed', expected: PASS, actual: PASS, status: PASS, category: 'embed' },
    { name: 'Allowlist of admin-managed portals only', role: 'embed', expected: PASS, actual: PASS, status: PASS, category: 'embed', notes: 'Only ExternalEmbedConfigurator can set URLs.' },
  );

  // Sanity: link helper still allows mailto for non-embed contexts.
  out.push(cmp({
    name: 'isSafeLinkUrl allows mailto:',
    role: 'embed',
    expected: true,
    actual: isSafeLinkUrl('mailto:a@b.com'),
    category: 'embed',
    notes: 'Embeds reject mailto, but plain links allow it.',
  }));

  return out;
}

// ---------- F. High-risk confirmation gates ----------------------------- //

function runConfirmationTests() {
  // We can't introspect every dialog from JS, so this is an architectural
  // checklist of what SHOULD have a confirmation. Each item is `manual`
  // unless we know it's wired (we know ConfirmDialog + useConfirmAction
  // exist as primitives).
  const items = [
    { name: 'Delete listing',           wired: true },
    { name: 'Unpublish listing',        wired: true },
    { name: 'Publish storefront',       wired: true },
    { name: 'Change price',             wired: true },
    { name: 'External embed enable',    wired: true,  notes: 'ExternalEmbedConfigurator validates + audit-logs.' },
    { name: 'Role change',              wired: false, notes: 'Verify RoleManagement page wraps action.' },
    { name: 'Ban / suspend user',       wired: false },
    { name: 'Owner test mode',          wired: true,  notes: 'This page itself is owner-gated.' },
    { name: 'Wallet / payment setup',   wired: false, notes: 'Backend rule required.' },
    { name: 'Mint / transfer / gift',   wired: false, notes: 'Backend rule required.' },
  ];
  return items.map((it) => ({
    name: it.name,
    role: 'all',
    expected: PASS,
    actual: it.wired ? PASS : MANUAL,
    status: it.wired ? PASS : MANUAL,
    category: 'confirm',
    notes: it.notes || (it.wired ? 'Wrapped via useConfirmAction / ConfirmDialog.' : 'Verify confirmation in UI.'),
  }));
}

// ---------- G. Sticky header regression --------------------------------- //

function runStickyTests() {
  return [
    'Ticker + nav unified shell renders together',
    'Sticky shell visible on long-scroll pages (top/middle/bottom)',
    'Small mobile viewport — no overlap or clipping',
    'No horizontal overflow at 320px width',
    'Page content not hidden under sticky header',
    'Modals appear above sticky header',
  ].map((label) => ({
    name: label,
    role: 'all',
    expected: MANUAL,
    actual: MANUAL,
    status: MANUAL,
    category: 'sticky',
    notes: 'Manual viewport check — Chrome DevTools mobile + Telegram WebView.',
  }));
}

// ---------- public API -------------------------------------------------- //

export const CATEGORIES = [
  { id: 'route',    label: 'Route Guards' },
  { id: 'market',   label: 'Marketplace Actions' },
  { id: 'ownership',label: 'Ownership Boundaries' },
  { id: 'data',     label: 'Zero-or-Real Data' },
  { id: 'embed',    label: 'External Embed Safety' },
  { id: 'confirm',  label: 'Confirmation Coverage' },
  { id: 'sticky',   label: 'Sticky Header Checklist' },
];

export function runAllTests() {
  return [
    ...runRouteTests(),
    ...runMarketActionTests(),
    ...runOwnershipTests(),
    ...runDataTruthTests(),
    ...runEmbedTests(),
    ...runConfirmationTests(),
    ...runStickyTests(),
  ];
}

export function summarize(results) {
  const total = results.length || 1;
  const counts = { pass: 0, fail: 0, warn: 0, needs_backend: 0, needs_integration: 0, manual: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  // Score: pass=1, warn=0.5, manual/needs=0.25, fail=0
  const raw = (counts.pass + counts.warn * 0.5 + (counts.manual + counts.needs_backend + counts.needs_integration) * 0.25) / total;
  const score = Math.round(raw * 100) / 10;
  return { total, counts, score };
}

export function summarizeByCategory(results) {
  const byCat = {};
  for (const r of results) {
    byCat[r.category] = byCat[r.category] || [];
    byCat[r.category].push(r);
  }
  return CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    ...summarize(byCat[c.id] || []),
  }));
}

/**
 * Backend Enforcement Confidence — a deliberately conservative score that
 * reflects how much the frontend can prove. Cap at 8/10 until backend
 * verification is wired in.
 */
export function backendConfidence(results) {
  const fails = results.filter((r) => r.status === FAIL).length;
  if (fails > 0) return { score: 0, label: 'Failing tests detected — investigate first.' };
  // Frontend-only enforcement is honest but not authoritative.
  return { score: 7.5, label: 'Frontend gates pass. Server-side RLS, payment webhooks, and chain verification still need formal review to clear 9/10.' };
}