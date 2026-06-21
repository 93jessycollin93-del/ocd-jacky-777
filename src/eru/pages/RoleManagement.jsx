import { useState, useEffect } from 'react';
import { useAuth } from '@/eru/lib/AuthContext';
import { base44 } from '@/eru/api/base44Client';
import { isAdmin } from '@/eru/lib/rbac';
import { ShieldCheck, Plus, Trash2, Edit, AlertTriangle } from 'lucide-react';

export default function RoleManagement() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('roles');
  const [roles, setRoles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showAssignRole, setShowAssignRole] = useState(false);

  useEffect(() => {
    if (!isAdmin(currentUser)) {
      return;
    }

    fetchData();
  }, [tab]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (tab === 'roles') {
        const data = await base44.entities.CustomRole.filter({}, '-created_date', 100);
        setRoles(data || []);
      } else {
        const data = await base44.entities.RoleAssignment.filter(
          { is_active: true },
          '-assigned_at',
          100
        );
        setAssignments(data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (roleId) => {
    if (!confirm('Delete this role?')) return;

    try {
      await base44.entities.CustomRole.delete(roleId);
      setRoles(roles.filter((r) => r.id !== roleId));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const revokeAssignment = async (assignmentId) => {
    try {
      await base44.entities.RoleAssignment.update(assignmentId, { is_active: false });
      setAssignments(assignments.filter((a) => a.id !== assignmentId));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (!isAdmin(currentUser)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Role Management
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Define custom roles and assign permissions</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-4">
        <button
          onClick={() => setTab('roles')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'roles'
              ? 'text-primary border-primary'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}>
          Roles ({roles.length})
        </button>
        <button
          onClick={() => setTab('assignments')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'assignments'
              ? 'text-primary border-primary'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}>
          Assignments ({assignments.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {/* Roles Tab */}
        {tab === 'roles' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowCreateRole(true)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Create Custom Role
            </button>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No custom roles</div>
            ) : (
              <div className="space-y-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold">{role.display_name}</h3>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {role.permissions.slice(0, 3).map((perm) => (
                          <span
                            key={perm}
                            className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {perm.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {role.permissions.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">
                            +{role.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-secondary rounded transition-colors">
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {!role.is_system && (
                        <button
                          onClick={() => deleteRole(role.id)}
                          className="p-2 hover:bg-red-500/10 rounded transition-colors">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assignments Tab */}
        {tab === 'assignments' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowAssignRole(true)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Assign Role
            </button>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No active assignments</div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{assignment.user_email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {assignment.role_name}
                        </span>
                        {assignment.expires_at && (
                          <span className="text-xs text-yellow-600 bg-yellow-500/10 px-2 py-0.5 rounded">
                            Expires: {new Date(assignment.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned by {assignment.assigned_by}
                      </p>
                    </div>

                    <button
                      onClick={() => revokeAssignment(assignment.id)}
                      className="p-2 hover:bg-red-500/10 rounded transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Role Modal Placeholder */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6">
            <h3 className="font-semibold mb-4">Create Custom Role</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Role creation form coming soon
            </p>
            <button
              onClick={() => setShowCreateRole(false)}
              className="w-full py-2 bg-secondary rounded-lg font-medium hover:opacity-80 transition-opacity">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Assign Role Modal Placeholder */}
      {showAssignRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6">
            <h3 className="font-semibold mb-4">Assign Role to User</h3>
            <p className="text-sm text-muted-foreground mb-4">Role assignment form coming soon</p>
            <button
              onClick={() => setShowAssignRole(false)}
              className="w-full py-2 bg-secondary rounded-lg font-medium hover:opacity-80 transition-opacity">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}