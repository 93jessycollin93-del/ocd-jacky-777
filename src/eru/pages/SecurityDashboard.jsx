import { useState, useEffect } from 'react';
import { useAuth } from '@/eru/lib/AuthContext';
import { base44 } from '@/eru/api/base44Client';
import { Activity, Clock, AlertTriangle, Search } from 'lucide-react';

export default function SecurityDashboard() {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchEmail, setSearchEmail] = useState('');

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      return;
    }
    
    fetchLogs();
  }, [filter, searchEmail]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = {};

      if (filter !== 'all') {
        query.severity = filter;
      }

      if (searchEmail) {
        query.user_email = searchEmail;
      }

      const data = await base44.entities.SecurityAuditLog.filter(
        query,
        '-created_date',
        100
      );

      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== 'admin') {
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
          <Activity className="w-5 h-5 text-primary" /> Security Audit Log
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Immutable system event logs for admin review</p>
      </div>

      {/* Search & Filter */}
      <div className="px-4 py-3 border-b border-border space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'info', 'warning', 'critical'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filter === sev
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}>
              {sev === 'all' ? 'All Events' : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No events found</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-xl border transition-colors ${
                  log.severity === 'critical'
                    ? 'bg-red-500/5 border-red-500/20'
                    : log.severity === 'warning'
                      ? 'bg-yellow-500/5 border-yellow-500/20'
                      : 'bg-card border-border'
                }`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize truncate">
                      {log.event_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{log.user_email}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(log.created_date).toLocaleTimeString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${
                      log.severity === 'critical'
                        ? 'bg-red-500/20 text-red-600'
                        : log.severity === 'warning'
                          ? 'bg-yellow-500/20 text-yellow-600'
                          : 'bg-primary/10 text-primary'
                    }`}>
                    {log.severity.toUpperCase()}
                  </span>
                  <span
                    className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${
                      log.status === 'success'
                        ? 'bg-green-500/20 text-green-600'
                        : log.status === 'failed'
                          ? 'bg-red-500/20 text-red-600'
                          : 'bg-yellow-500/20 text-yellow-600'
                    }`}>
                    {log.status.toUpperCase()}
                  </span>
                  {log.ip_address && (
                    <span className="text-[9px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {log.ip_address}
                    </span>
                  )}
                </div>

                {log.details && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {JSON.stringify(log.details)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}