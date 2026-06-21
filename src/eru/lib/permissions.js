/**
 * Shared permission / role helpers for UI gating.
 * ----------------------------------------------------------------------------
 * These are SYNCHRONOUS helpers meant for:
 *   - conditionally rendering protected UI
 *   - guarding actions before they run
 *   - producing polished "permission denied" states
 *
 * They are NOT a security boundary on their own. Server-side RLS on entities
 * and admin checks inside backend functions are the real authority. Always
 * assume a malicious client can bypass UI gates and enforce on the server.
 *
 * Role model (superset — the User entity currently uses { user | admin }):
 *   owner      – app owner, effectively admin with billing rights
 *   admin      – platform admin
 *   moderator  – can review, hide, or flag content
 *   seller     – can create/edit their own listings
 *   user       – default signed-in user / buyer
 *   guest      – not signed in
 * --------------------------------------------------------------------------*/

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SELLER: 'seller',
  USER: 'user',
  GUEST: 'guest',
};

const ROLE_RANK = {
  guest: 0,
  user: 1,
  seller: 2,
  moderator: 3,
  admin: 4,
  owner: 5,
};

export function getRole(user) {
  if (!user) return ROLES.GUEST;
  const role = (user.role || '').toLowerCase();
  if (ROLE_RANK[role] !== undefined) return role;
  // Unknown role → treat as regular user rather than crash.
  return ROLES.USER;
}

export function isAuthenticated(user) {
  return !!user?.email;
}

export function isAtLeast(user, minRole) {
  const userRank = ROLE_RANK[getRole(user)] ?? 0;
  const minRank = ROLE_RANK[minRole] ?? 0;
  return userRank >= minRank;
}

export function isAdmin(user) {
  return isAtLeast(user, ROLES.ADMIN);
}

export function isOwner(user) {
  return getRole(user) === ROLES.OWNER;
}

export function isModerator(user) {
  return isAtLeast(user, ROLES.MODERATOR);
}

/**
 * Ownership check for a resource. A resource is considered owned if its
 * `created_by` (or seller_email / author_email) matches the current user.
 */
export function ownsResource(user, resource) {
  if (!user?.email || !resource) return false;
  const owner = resource.created_by || resource.seller_email || resource.author_email;
  return owner === user.email;
}

/**
 * Can the user edit this listing / product?
 * Admins and moderators always can. Owners of the resource can.
 */
export function canEditListing(user, listing) {
  if (!isAuthenticated(user)) return false;
  if (isModerator(user)) return true;
  return ownsResource(user, listing);
}

export function canDeleteListing(user, listing) {
  if (!isAuthenticated(user)) return false;
  if (isAdmin(user)) return true;
  return ownsResource(user, listing);
}

export function canPublishListing(user, listing) {
  if (!isAuthenticated(user)) return false;
  if (isModerator(user)) return true;
  return ownsResource(user, listing);
}

export function canManageMarketplaceConfig(user) {
  return isAdmin(user);
}

export function canManageExternalPortals(user) {
  return isAdmin(user);
}

export function canUpdateOrderStatus(user, order) {
  if (!isAuthenticated(user)) return false;
  if (isAdmin(user)) return true;
  // Sellers can update orders for items they sold
  return order?.metadata?.seller_email === user.email;
}

export function canGrantResources(user) {
  return isAdmin(user);
}

export function canChangeRoles(user) {
  return isAtLeast(user, ROLES.OWNER) || isAdmin(user);
}

/**
 * Produce a uniform denial reason string for audit logging / UI.
 */
export function denyReason(user, requirement) {
  if (!isAuthenticated(user)) return 'not_authenticated';
  return `missing_${requirement}`;
}