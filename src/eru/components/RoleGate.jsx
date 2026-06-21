import { useAuth } from '@/eru/lib/AuthContext';
import { hasPermission } from '@/eru/lib/rbac';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * RoleGate: Conditionally render content based on permissions
 * Usage: <RoleGate permission="view_economy_logs"><Dashboard /></RoleGate>
 */
export default function RoleGate({
  permission,
  children,
  fallback = null,
  loading = null,
}) {
  const { currentUser } = useAuth();
  const [hasAccess, setHasAccess] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setHasAccess(false);
      return;
    }

    const checkAccess = async () => {
      const access = await hasPermission(currentUser, permission);
      setHasAccess(access);
    };

    checkAccess();
  }, [currentUser, permission]);

  // Still checking permissions
  if (hasAccess === null) {
    return loading || <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  // User has permission
  if (hasAccess) {
    return children;
  }

  // User doesn't have permission
  return (
    fallback || (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">
            You don't have permission to view this content.
          </p>
          <p className="text-xs text-muted-foreground">
            Contact your administrator for access.
          </p>
        </div>
      </div>
    )
  );
}