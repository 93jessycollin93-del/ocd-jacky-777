import { useState, useEffect } from 'react';
import { ClipboardList, Search, Filter, Shield, CreditCard, Key, Link, Database, Settings, LogIn, Fingerprint, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';

const TYPE_CONFIG = {
  auth:        { icon: LogIn,       color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',   label: 'Auth' },
  payment:     { icon: CreditCard,  color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', label: 'Payment' },
  wallet:      { icon: Shield,      color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', label: 'Wallet' },
  security:    { icon: Key,         color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',      label: 'Security' },
  integration: { icon: Link,        color: 'text-cyan-400',   bg: 'bg-cyan-400/10 border-cyan-400/20',    label: 'Integration' },
  data_access: { icon: Database,    color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20',  label: 'Data' },
  settings:    { icon: Settings,    color: 'text-gray-400',   bg: 'bg-gray-400/10 border-gray-400/20',    label: 'Settings' },
  trade:       { icon: ChevronDown, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', label: 'Trade' },
  login:       { icon: LogIn,       color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/20', label: 'Login' },
  biometric:   { icon: Fingerprint, color: 'text-primary',    bg: 'bg-primary/10 border-primary/20',      label: 'Biometric' },
};

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: 'text-green-400',  label: 'Success' },
  failed:  { icon: XCircle,     color: 'text-red-400',    label: 'Failed' },
  blocked: { icon: AlertTriangle, color: 'text-orange-400', label: 'Blocked' },
};

const ALL_TYPES = ['all', ...Object.keys(TYPE_CONFIG)];
const ALL_STATUS = ['all', 'success', 'failed', 'blocked'];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function LogItem({ log }) {
  const [expanded, setExpanded] = useState(false);
  const tc = TYPE_CONFIG[log.action_type] || TYPE_CONFIG.auth;
  const sc = STATUS_CONFIG[log.status] || STATUS_CONFIG.success;
  const Icon = tc.icon;
  const StatusIcon = sc.icon;

  return (
    <div className={`rounded-xl border ${tc.bg} overflow-hidden`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full text-left px-3 py-3 flex items-start gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
          <Icon className={`w-3.5 h-3.5 ${tc.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-xs font-semibold truncate">{log.action}</p>
            <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 ${sc.color}`} />
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[9px] font-bold uppercase ${tc.color}`}>{tc.label}</span>
            {log.source_app && <span className="text-[9px] text-muted-foreground">{log.source_app}</span>}
            {log.platform && <span className="text-[9px] px-1.5 py-0.5 bg-secondary rounded-full text-muted-foreground capitalize">{log.platform}</span>}
            <span className="text-[9px] text-muted-foreground ml-auto">{timeAgo(log.created_date)}</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/30">
          <p className="text-xs text-foreground/80 leading-relaxed pt-2">{log.detail}</p>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div><span className="text-muted-foreground">Status: </span><span className={sc.color + ' font-medium'}>{sc.label}</span></div>
            <div><span className="text-muted-foreground">Severity: </span><span className="font-medium capitalize">{log.severity}</span></div>
            {log.amount && <div><span className="text-muted-foreground">Amount: </span><span className="font-medium text-yellow-400">{log.amount} {log.currency || 'GOLD'}</span></div>}
            <div><span className="text-muted-foreground">Time: </span><span className="font-medium">{new Date(log.created_date).toLocaleString()}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActivityAuditLog() {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const downloadPDF = () => {
    setDownloading(true);
    const doc = new jsPDF();
    const now = new Date().toLocaleString();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text('Activity & Transaction Report', 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${now}`, 14, 28);
    doc.text(`Filters — Type: ${typeFilter} | Status: ${statusFilter}${search ? ` | Search: "${search}"` : ''}`, 14, 34);
    doc.text(`Total records: ${filtered.length}`, 14, 40);

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 44, 196, 44);

    let y = 52;
    filtered.forEach((log, i) => {
      if (y > 270) { doc.addPage(); y = 20; }

      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(`${i + 1}. ${log.action}`, 14, y);

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const meta = [
        log.action_type?.toUpperCase(),
        log.status,
        log.severity,
        log.platform,
        log.source_app,
        log.amount ? `${log.amount} ${log.currency || 'GOLD'}` : null,
        new Date(log.created_date).toLocaleString(),
      ].filter(Boolean).join('  ·  ');
      doc.text(meta, 14, y + 5);

      if (log.detail) {
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const lines = doc.splitTextToSize(log.detail, 182);
        doc.text(lines, 14, y + 11);
        y += 11 + lines.length * 4 + 4;
      } else {
        y += 16;
      }

      doc.setDrawColor(230, 230, 230);
      doc.line(14, y - 1, 196, y - 1);
    });

    doc.save(`activity-report-${Date.now()}.pdf`);
    setDownloading(false);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const dbLogs = await base44.entities.AuditLog.list('-created_date', 100);
      setLogs(dbLogs);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = logs.filter(l => {
    if (typeFilter !== 'all' && l.action_type !== typeFilter) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (search && !l.action.toLowerCase().includes(search.toLowerCase()) && !l.detail?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: logs.length,
    critical: logs.filter(l => l.severity === 'critical').length,
    failed: logs.filter(l => l.status === 'failed').length,
    payments: logs.filter(l => l.action_type === 'payment').length,
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Activity Log</h2>
          <p className="text-[10px] text-muted-foreground">All actions, payments & security events</p>
        </div>
        <button onClick={downloadPDF} disabled={downloading || filtered.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-40 text-xs font-medium">
          <Download className="w-3.5 h-3.5" />{downloading ? 'Generating…' : 'Export PDF'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-border">
        {[
          { label: 'Total', val: stats.total, color: 'text-foreground' },
          { label: 'Critical', val: stats.critical, color: 'text-red-400' },
          { label: 'Failed', val: stats.failed, color: 'text-orange-400' },
          { label: 'Payments', val: stats.payments, color: 'text-yellow-400' },
        ].map(({ label, val, color }) => (
          <div key={label} className="text-center">
            <p className={`text-base font-bold ${color}`}>{val}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="px-4 py-3 space-y-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions..."
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`p-2 rounded-xl border transition-all ${showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>

        {showFilters && (
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Type</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TYPES.map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    className={`text-[10px] px-2 py-1 rounded-lg capitalize font-medium transition-all ${typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    {t === 'all' ? 'All Types' : TYPE_CONFIG[t]?.label || t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Status</p>
              <div className="flex gap-1.5">
                {ALL_STATUS.map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`text-[10px] px-2 py-1 rounded-lg capitalize font-medium transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <ClipboardList className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No events match your filters</p>
          </div>
        ) : (
          filtered.map(log => <LogItem key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}