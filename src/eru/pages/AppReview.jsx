import { useState } from 'react';
import { Shield, Upload, CheckCircle, XCircle, Clock, AlertTriangle, Code, FileText, RotateCcw } from 'lucide-react';

const REVIEW_STAGES = [
  { id: 1, label: 'Malware Scan', desc: 'Scanning for known malicious patterns' },
  { id: 2, label: 'Dependency Check', desc: 'Checking third-party libraries for vulnerabilities' },
  { id: 3, label: 'Behavior Analysis', desc: 'Analyzing code logic for harmful intent' },
  { id: 4, label: 'Content Moderation', desc: 'Reviewing descriptions and metadata' },
  { id: 5, label: 'Authorization', desc: 'Issuing Authorized Product Label' },
];

const RECENT_REVIEWS = [
  { id: 1, name: 'Trading Bot v2.js', type: 'code', result: 'authorized', date: '2 days ago', score: 98 },
  { id: 2, name: 'NFT Mint Script', type: 'code', result: 'authorized', date: '5 days ago', score: 100 },
  { id: 3, name: 'Market Analyzer.py', type: 'code', result: 'flagged', date: '1 week ago', score: 34, reason: 'Contains obfuscated network calls to unrecognized endpoints.' },
];

const RESULT_CONFIG = {
  authorized: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Authorized' },
  flagged: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Flagged' },
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'In Review' },
};

export default function AppReview() {
  const [tab, setTab] = useState('submit');
  const [file, setFile] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState(null);
  const [pasteCode, setPasteCode] = useState('');

  const startReview = () => {
    if (!file && !pasteCode.trim()) return;
    setReviewing(true);
    setStage(0);
    setResult(null);
    let s = 0;
    const interval = setInterval(() => {
      s++;
      setStage(s);
      if (s >= REVIEW_STAGES.length) {
        clearInterval(interval);
        setReviewing(false);
        setResult(Math.random() > 0.2 ? 'authorized' : 'flagged');
      }
    }, 900);
  };

  const reset = () => {
    setFile(null); setPasteCode(''); setReviewing(false); setStage(0); setResult(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> App Review System
        </h2>
        <p className="text-xs text-muted-foreground">Submit code or content for safety review before monetizing</p>
      </div>

      <div className="flex border-b border-border">
        {[{id:'submit',label:'Submit'},{id:'history',label:'History'},{id:'info',label:'How It Works'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab===t.id?'text-primary border-b-2 border-primary':'text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {tab === 'submit' && !reviewing && !result && (
          <>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-xs text-primary">Only reviewed and <span className="font-bold">Authorized</span> content can be listed in the Creator Hub marketplace.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><Code className="w-3.5 h-3.5" />Paste your code</label>
              <textarea value={pasteCode} onChange={e => setPasteCode(e.target.value)}
                placeholder="Paste code, script, or application here..."
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm font-mono outline-none resize-none min-h-[140px]" />
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />or upload file<div className="flex-1 h-px bg-border" />
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl py-8 gap-2 cursor-pointer hover:border-primary/40 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{file ? file.name : 'Tap to upload file'}</p>
              <p className="text-xs text-muted-foreground/50">.js .py .ts .sol .json .txt</p>
              <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} accept=".js,.py,.ts,.sol,.json,.txt" />
            </label>

            <button onClick={startReview} disabled={!file && !pasteCode.trim()}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
              <Shield className="w-4 h-4" /> Start Security Review
            </button>
          </>
        )}

        {reviewing && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-3" />
              <p className="font-semibold">Reviewing your submission...</p>
              <p className="text-xs text-muted-foreground mt-1">{REVIEW_STAGES[Math.min(stage, REVIEW_STAGES.length-1)]?.desc}</p>
            </div>
            <div className="space-y-2">
              {REVIEW_STAGES.map((s, i) => (
                <div key={s.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${i < stage ? 'bg-green-400/10 border border-green-400/20' : i === stage ? 'bg-primary/10 border border-primary/20' : 'bg-card border border-border opacity-40'}`}>
                  {i < stage ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> :
                   i === stage ? <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" /> :
                   <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className={`rounded-xl p-6 text-center border ${result==='authorized'?'bg-green-400/10 border-green-400/20':'bg-red-400/10 border-red-400/20'}`}>
              {result === 'authorized' ? (
                <>
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <h3 className="font-bold text-lg text-green-400">Authorized ✓</h3>
                  <p className="text-sm text-muted-foreground mt-2">Your submission passed all safety checks. It is now eligible for listing in the Creator Hub marketplace with the <span className="text-green-400 font-semibold">Authorized Product Label</span>.</p>
                  <div className="mt-4 bg-green-400/10 border border-green-400/30 rounded-lg px-4 py-2 inline-block">
                    <p className="text-xs text-green-400 font-mono">AUTHORIZED · SAFETY SCORE: 97/100</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <h3 className="font-bold text-lg text-red-400">Review Failed</h3>
                  <p className="text-sm text-muted-foreground mt-2">Your submission was flagged. Please review and resubmit after addressing the issues.</p>
                  <div className="mt-3 bg-red-400/10 border border-red-400/30 rounded-xl p-3 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      <p className="text-xs text-red-400 font-semibold">Issues Found</p>
                    </div>
                    <p className="text-xs text-muted-foreground">• Suspicious external network calls detected<br/>• Obfuscated code sections require clarification</p>
                  </div>
                </>
              )}
            </div>
            <button onClick={reset} className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm text-muted-foreground hover:bg-secondary/40 transition-colors">
              <RotateCcw className="w-4 h-4" /> Submit Another
            </button>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            {RECENT_REVIEWS.map(r => {
              const cfg = RESULT_CONFIG[r.result];
              return (
                <div key={r.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium text-sm">{r.name}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                      <cfg.icon className="w-3 h-3" />{cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-xs text-muted-foreground">{r.date}</p>
                    <p className="text-xs text-muted-foreground">Score: <span className={r.score > 70 ? 'text-green-400' : 'text-red-400'}>{r.score}/100</span></p>
                  </div>
                  {r.reason && <p className="text-xs text-red-400/80 mt-2 bg-red-400/5 rounded-lg px-2 py-1.5">{r.reason}</p>}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'info' && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-foreground">Why Review?</h4>
              <p>Our platform is built on trust. Before any code, script, or application can be sold or traded, it must pass a multi-stage safety review to protect our community from harmful software.</p>
            </div>
            {REVIEW_STAGES.map(s => (
              <div key={s.id} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs text-primary font-bold flex-shrink-0 mt-0.5">{s.id}</div>
                <div>
                  <p className="font-medium text-foreground">{s.label}</p>
                  <p className="text-xs">{s.desc}</p>
                </div>
              </div>
            ))}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-2">
              <p className="text-xs text-primary">Passing review grants your submission the <span className="font-bold">Authorized Product Label</span> — a visible trust badge that increases buyer confidence and enables marketplace listing.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}