import { base44 } from '@/eru/api/base44Client';

/**
 * Permission definitions
 */
export const PERMISSIONS = {
  // Economy/Reporting
  VIEW_ECONOMY_LOGS: 'view_economy_logs',
  EDIT_ECONOMY_LOGS: 'edit_economy_logs',
  DELETE_ECONOMY_LOGS: 'delete_economy_logs',
  EXPORT_REPORTS: 'export_reports',
  VIEW_TRANSACTIONS: 'view_transactions',
  EDIT_TRANSACTIONS: 'edit_transactions',
  
  // Admin
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  VIEW_AUDIT_LOG: 'view_audit_log',
  
  // Payment
  VIEW_PAYMENT_DATA: 'view_payment_data',
  PROCESS_REFUNDS: 'process_refunds',
};

/**
 * Default roles with built-in permissions
 */
export const DEFAULT_ROLES = {
  admin: {
    name: 'admin',
    display_name: 'Administrator',
    permissions: Object.values(PERMISSIONS),
    is_system: true,
  },
  manager: {
    name: 'manager',
    display_name: 'Manager',
    permissions: [
      PERMISSIONS.VIEW_ECONOMY_LOGS,
      PERMISSIONS.EDIT_ECONOMY_LOGS,
      PERMISSIONS.EXPORT_REPORTS,
      PERMISSIONS.VIEW_TRANSACTIONS,
      PERMISSIONS.VIEW_PAYMENT_DATA,
      PERMISSIONS.VIEW_AUDIT_LOG,
    ],
    is_system: true,
  },
  analyst: {
    name: 'analyst',
    display_name: 'Analyst',
    permissions: [
      PERMISSIONS.VIEW_ECONOMY_LOGS,
      PERMISSIONS.EXPORT_REPORTS,
      PERMISSIONS.VIEW_TRANSACTIONS,
      PERMISSIONS.VIEW_AUDIT_LOG,
    ],
    is_system: true,
  },
  viewer: {
    name: 'viewer',
    display_name: 'Viewer',
    permissions: [
      PERMISSIONS.VIEW_ECONOMY_LOGS,
      PERMISSIONS.VIEW_TRANSACTIONS,
    ],
    is_system: true,
  },
  user: {
    name: 'user',
    display_name: 'Regular User',
    permissions: [PERMISSIONS.VIEW_TRANSACTIONS],
    is_system: true,
  },
};

/**
 * Check if user has permission
 * @param {Object} user - Current user object
 * @param {string} permission - Permission key to check
 * @returns {boolean} True if user has permission
 */
export async function hasPermission(user, permission) {
  if (!user) return false;

  // Admins have all permissions
  if (user.role === 'admin') {
    return true;
  }

  // Check custom role permissions
  try {
    const assignment = await base44.entities.RoleAssignment.filter(
      {
        user_email: user.email,
        is_active: true,
      },
      '-assigned_at',
      1
    );

    if (assignment && assignment.length > 0) {
      const role = assignment[0];
      
      // Check expiration
      if (role.expires_at && new Date(role.expires_at) < new Date()) {
        return false;
      }

      // Fetch role details
      const customRole = await base44.entities.CustomRole.filter(
        { id: role.custom_role_id },
        null,
        1
      );

      if (customRole && customRole.length > 0) {
        return customRole[0].permissions.includes(permission);
      }
    }
  } catch (err) {
    console.warn('Error checking custom role:', err.message);
  }

  // Fall back to default role
  const defaultRole = DEFAULT_ROLES[user.role];
  if (defaultRole) {
    return defaultRole.permissions.includes(permission);
  }

  return false;
}

/**
 * Get user's role (system or custom)
 */
export async function getUserRole(user) {
  if (!user) return null;

  // Check custom role assignment
  try {
    const assignment = await base44.entities.RoleAssignment.filter(
      {
        user_email: user.email,
        is_active: true,
      },
      '-assigned_at',
      1
    );

    if (assignment && assignment.length > 0) {
      return assignment[0];
    }
  } catch (err) {
    console.warn('Error fetching custom role:', err.message);
  }

  // Return system role
  return {
    name: user.role,
    display_name: DEFAULT_ROLES[user.role]?.display_name || user.role,
  };
}

/**
 * Check if user can perform admin action
 */
export function isAdmin(user) {
  return user?.role === 'admin';
}

/**
 * Check multiple permissions (AND logic)
 */
export async function hasAllPermissions(user, permissions) {
  for (const permission of permissions) {
    if (!(await hasPermission(user, permission))) {
      return false;
    }
  }
  return true;
}

/**
 * Check multiple permissions (OR logic)
 */
export async function hasAnyPermission(user, permissions) {
  for (const permission of permissions) {
    if (await hasPermission(user, permission)) {
      return true;
    }
  }
  return false;
}