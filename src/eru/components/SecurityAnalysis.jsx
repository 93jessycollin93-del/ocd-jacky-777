import { useState } from 'react';
import { Shield, XCircle, ChevronDown, ChevronUp, RefreshCw, Smartphone, Send } from 'lucide-react';

const SEVERITY = {
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', dot: 'bg-red-400' },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', dot: 'bg-orange-400' },
  medium:   { label: 'Medium',   color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', dot: 'bg-yellow-400' },
  low:      { label: 'Low',      color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/30',   dot: 'bg-blue-400' },
};

const STATUS = {
  fixed:      { label: 'Fixed',      color: 'text-green-400',  bg: 'bg-green-400/10'  },
  pending:    { label: 'Pending',    color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  monitoring: { label: 'Monitoring', color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  open:       { label: 'Open',       color: 'text-red-400',    bg: 'bg-red-400/10'    },
};

const PLATFORMS = {
  telegram: {
    label: 'Telegram Mini App',
    icon: Send,
    color: '#0088cc',
    findings: [
      {
        id: 'tg-1', severity: 'critical', status: 'open',
        title: 'initData Validation Missing',
        desc: 'Telegram WebApp.initData is not validated server-side. An attacker can forge user identity and gain unauthorized access.',
        fix: 'Validate initData HMAC-SHA256 signature on your backend using the bot token as key. Reject any request with invalid or expired initData (>5 min old).',
        ref: 'Telegram Bot API — initData validation',
      },
      {
        id: 'tg-2', severity: 'high', status: 'pending',
        title: 'TON Payment Replay Attack',
        desc: 'Payment callbacks are accepted without nonce verification, enabling replay attacks to double-credit purchases.',
        fix: 'Store processed payment_id values in a database. Reject any duplicate payment_id. Use server-side idempotency keys.',
        ref: 'TON Payments — webhook deduplication',
      },
      {
        id: 'tg-3', severity: 'high', status: 'pending',
        title: 'Sensitive Data in WebApp postMessage',
        desc: 'Private keys and session tokens are passed through Telegram.WebApp.sendData without encryption.',
        fix: 'Never send sensitive data via sendData. Use encrypted backend channels. sendData should only carry non-sensitive identifiers.',
        ref: 'Telegram Mini Apps — postMessage security',
      },
      {
        id: 'tg-4', severity: 'medium', status: 'monitoring',
        title: 'Content Security Policy Not Set',
        desc: 'No CSP header prevents XSS attacks in the Mini App iframe context.',
        fix: "Add Content-Security-Policy header: default-src 'self'; script-src 'self' 'nonce-{random}'; connect-src 'self' api.telegram.org.",
        ref: 'OWASP CSP Best Practices',
      },
      {
        id: 'tg-5', severity: 'medium', status: 'open',
        title: 'Bot Token Exposed in Frontend Code',
        desc: 'The Telegram bot token is referenced in client-side JavaScript, allowing extraction and bot hijacking.',
        fix: 'Move all bot token usage to backend functions. The token must never appear in frontend bundles. Use environment variables server-side only.',
        ref: 'Telegram Bot Security Guidelines',
      },
      {
        id: 'tg-6', severity: 'low', status: 'fixed',
        title: 'Missing Telegram.WebApp.ready() Call',
        desc: 'App does not call Telegram.WebApp.ready() causing loader to persist longer than needed.',
        fix: 'Call Telegram.WebApp.ready() as early as possible in app initialization.',
        ref: 'Telegram WebApp API',
      },
    ],
  },
  ios: {
    label: 'iOS App Store',
    icon: Smartphone,
    color: '#007AFF',
    findings: [
      {
        id: 'ios-1', severity: 'critical', status: 'open',
        title: 'ATS (App Transport Security) Disabled',
        desc: 'NSAllowsArbitraryLoads is set to true in Info.plist, bypassing Apple\'s HTTPS requirement for all network traffic.',
        fix: 'Remove NSAllowsArbitraryLoads. Ensure all endpoints use TLS 1.2+ with valid certificates. Use NSExceptionDomains only for specific legacy domains.',
        ref: 'Apple ATS — WWDC Guideline 4.1',
      },
      {
        id: 'ios-2', severity: 'critical', status: 'pending',
        title: 'Keychain Data Accessible When Unlocked',
        desc: 'Sensitive tokens are stored with kSecAttrAccessibleAlways instead of kSecAttrAccessibleWhenUnlockedThisDeviceOnly.',
        fix: 'Use kSecAttrAccessibleWhenUnlockedThisDeviceOnly for all sensitive Keychain items. Tokens should not persist across device restores.',
        ref: 'Apple Keychain Services — data protection classes',
      },
      {
        id: 'ios-3', severity: 'high', status: 'open',
        title: 'In-App Purchase Receipt Not Validated Server-Side',
        desc: 'StoreKit purchase receipts are validated only client-side, allowing jailbroken devices to spoof purchases.',
        fix: 'Send receipt data to your backend and validate against Apple\'s /verifyReceipt endpoint. Never trust client-side purchase confirmation alone.',
        ref: 'App Store Review Guideline 3.1.1',
      },
      {
        id: 'ios-4', severity: 'high', status: 'monitoring',
        title: 'Jailbreak Detection Absent',
        desc: 'No jailbreak checks present. Jailbroken devices can bypass SSL pinning, modify app memory, and extract crypto keys.',
        fix: 'Implement multi-factor jailbreak detection: check for Cydia, suspicious file paths, fork() ability, and dyld injection. Use a hardened runtime.',
        ref: 'OWASP Mobile Top 10 — M8',
      },
      {
        id: 'ios-5', severity: 'high', status: 'open',
        title: 'Crypto Private Keys in NSUserDefaults',
        desc: 'Wallet private keys are stored in NSUserDefaults which is plaintext on-disk and visible in iTunes backups.',
        fix: 'Migrate to Secure Enclave for key storage. Use CryptoKit with SecureEnclave.P256. Never store keys in UserDefaults or plists.',
        ref: 'Apple Secure Enclave — CryptoKit',
      },
      {
        id: 'ios-6', severity: 'medium', status: 'pending',
        title: 'SSL Pinning Not Implemented',
        desc: 'API communications rely only on system certificate validation, vulnerable to MITM via rogue CA certificates.',
        fix: 'Implement certificate or public key pinning using URLSession. Pin against your specific leaf or intermediate cert. Update pins before cert expiry.',
        ref: 'OWASP Certificate Pinning',
      },
      {
        id: 'ios-7', severity: 'medium', status: 'fixed',
        title: 'Screenshot of Sensitive Screens',
        desc: 'App allows screenshots on wallet balance and private key display screens.',
        fix: 'Implement applicationWillResignActive / applicationDidEnterBackground to overlay sensitive screens. Use UIScreen.isCaptured detection.',
        ref: 'Apple HIG — Privacy',
      },
      {
        id: 'ios-8', severity: 'low', status: 'monitoring',
        title: 'Excessive Permission Requests',
        desc: 'App requests Camera, Contacts, and Location permissions on first launch without contextual justification.',
        fix: 'Request permissions only when immediately needed with clear usage descriptions in Info.plist. Apple may reject apps without proper NSUsageDescription strings.',
        ref: 'App Store Review Guideline 5.1.1',
      },
    ],
  },
  android: {
    label: 'Android Play Store',
    icon: Smartphone,
    color: '#3DDC84',
    findings: [
      {
        id: 'and-1', severity: 'critical', status: 'open',
        title: 'Exported Activities Without Permission',
        desc: 'Multiple Activities are exported (android:exported=true) without permission enforcement, allowing any app to launch them directly.',
        fix: 'Add android:permission="your.app.permission.INTERNAL" to exported components. Audit AndroidManifest.xml for all exported components.',
        ref: 'Android Security — Component Exposure',
      },
      {
        id: 'and-2', severity: 'critical', status: 'pending',
        title: 'Private Keys in SharedPreferences',
        desc: 'Crypto wallet keys stored in SharedPreferences are accessible to root users and via ADB backup on unencrypted devices.',
        fix: 'Use Android Keystore System (KeyStore.getInstance("AndroidKeyStore")) for all cryptographic key material. Keys never leave the secure hardware.',
        ref: 'Android Keystore — hardware-backed security',
      },
      {
        id: 'and-3', severity: 'critical', status: 'open',
        title: 'allowBackup=true Exposes App Data',
        desc: 'android:allowBackup="true" in AndroidManifest allows ADB backup to extract the full app data directory without root.',
        fix: 'Set android:allowBackup="false" or implement a custom BackupAgent that excludes sensitive data. For Android 12+, use android:dataExtractionRules.',
        ref: 'Android Manifest — allowBackup',
      },
      {
        id: 'and-4', severity: 'high', status: 'open',
        title: 'Network Security Config Not Set',
        desc: 'No network_security_config.xml defined. App trusts user-installed CA certificates by default (Android 6 and below behavior).',
        fix: 'Create res/xml/network_security_config.xml with <certificates src="system"/> only. Pin your domain certificates. Reference in AndroidManifest.',
        ref: 'Android Network Security Config',
      },
      {
        id: 'and-5', severity: 'high', status: 'monitoring',
        title: 'Root Detection Absent',
        desc: 'No root detection implemented. Rooted devices can hook crypto functions, extract keys from memory, and bypass payment checks.',
        fix: 'Use Play Integrity API (replaces SafetyNet) to attest device integrity. Check for su binary, RootBeer lib, and build.prop indicators.',
        ref: 'Play Integrity API',
      },
      {
        id: 'and-6', severity: 'high', status: 'pending',
        title: 'In-App Purchases Not Verified Server-Side',
        desc: 'Google Play purchase tokens are acknowledged only client-side. A compromised client can simulate successful purchases.',
        fix: 'Use Google Play Developer API on your backend to verify purchases. Acknowledge purchases server-side only after granting entitlement.',
        ref: 'Google Play Billing — server-side verification',
      },
      {
        id: 'and-7', severity: 'medium', status: 'pending',
        title: 'Logcat Leaking Sensitive Data',
        desc: 'Debug log statements print wallet addresses, API responses, and user tokens in production builds.',
        fix: 'Use BuildConfig.DEBUG guards for all Log statements. Enable ProGuard/R8 rule: -assumenosideeffects class android.util.Log { *; } for release.',
        ref: 'Android ProGuard — log stripping',
      },
      {
        id: 'and-8', severity: 'medium', status: 'open',
        title: 'WebView JavaScript Bridge Exposed',
        desc: 'addJavascriptInterface() exposes Java objects to all JavaScript including malicious injected scripts in loaded URLs.',
        fix: 'Restrict WebView to trusted URLs only. Validate URLs before loading. Use @JavascriptInterface annotation and disable file access. Consider WebViewAssetLoader.',
        ref: 'Android WebView Security',
      },
      {
        id: 'and-9', severity: 'low', status: 'fixed',
        title: 'Debuggable Build in Production',
        desc: 'android:debuggable="true" was previously detected in a production APK, allowing ADB debugging.',
        fix: 'Never set debuggable=true in production. Let the build system control this via buildTypes in build.gradle.',
        ref: 'Android Build Security',
      },
    ],
  },
};

function ScoreGauge({ score, label, color }) {
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';
  const gradeColor = score >= 90 ? 'text-green-400' : score >= 75 ? 'text-blue-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(230 18% 14%)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${gradeColor}`}>{grade}</span>
      </div>
      <p className="text-[10px] text-muted-foreground text-center leading-tight">{label}</p>
      <p className="text-xs font-semibold">{score}/100</p>
    </div>
  );
}

function FindingCard({ finding, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY[finding.severity];
  const sta = STATUS[finding.status];

  return (
    <div className={`rounded-xl border ${sev.border} ${sev.bg} overflow-hidden`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full text-left px-3 py-3 flex items-start gap-2.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${sev.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">{finding.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] font-bold uppercase ${sev.color}`}>{sev.label}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${sta.bg} ${sta.color}`}>{sta.label}</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/40">
          <div className="pt-3">
            <p className="text-xs text-muted-foreground font-medium mb-1">🔍 Finding</p>
            <p className="text-xs text-foreground/80 leading-relaxed">{finding.desc}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">🔧 Remediation</p>
            <p className="text-xs text-foreground/80 leading-relaxed font-mono bg-black/20 rounded-lg px-2.5 py-2">{finding.fix}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-muted-foreground/60 truncate flex-1">{finding.ref}</p>
            <div className="flex gap-1.5 flex-shrink-0 ml-2">
              {['open','pending','monitoring','fixed'].map(s => (
                <button key={s} onClick={() => onStatusChange(finding.id, s)}
                  className={`text-[9px] px-1.5 py-0.5 rounded-full capitalize transition-all ${finding.status === s ? `${STATUS[s].bg} ${STATUS[s].color} font-bold` : 'bg-secondary text-muted-foreground'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformView({ platform, data, findings, onStatusChange }) {
  const Icon = data.icon;
  const bySeverity = { critical: [], high: [], medium: [], low: [] };
  findings.forEach(f => bySeverity[f.severity]?.push(f));
  const fixed = findings.filter(f => f.status === 'fixed').length;
  const open = findings.filter(f => f.status === 'open').length;
  const critical = bySeverity.critical.length;

  const rawScore = Math.round(
    100 - (bySeverity.critical.filter(f=>f.status!=='fixed').length * 18) -
           (bySeverity.high.filter(f=>f.status!=='fixed').length * 10) -
           (bySeverity.medium.filter(f=>f.status!=='fixed').length * 5) -
           (bySeverity.low.filter(f=>f.status!=='fixed').length * 2)
  );
  const score = Math.max(0, Math.min(100, rawScore));

  return (
    <div className="space-y-4">
      {/* Platform header */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${data.color}20` }}>
            <Icon className="w-5 h-5" style={{ color: data.color }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{data.label}</p>
            <p className="text-xs text-muted-foreground">{findings.length} findings · {fixed} resolved</p>
          </div>
          <ScoreGauge score={score} label="Security Score" color={data.color} />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {Object.entries(bySeverity).map(([sev, items]) => (
            <div key={sev} className={`rounded-xl p-2 text-center ${SEVERITY[sev].bg} border ${SEVERITY[sev].border}`}>
              <p className={`text-lg font-bold ${SEVERITY[sev].color}`}>{items.length}</p>
              <p className={`text-[9px] font-semibold capitalize ${SEVERITY[sev].color}`}>{sev}</p>
            </div>
          ))}
        </div>

        {critical > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-red-400/10 border border-red-400/30 rounded-xl px-3 py-2">
            <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{critical} critical issue{critical > 1 ? 's' : ''} require immediate attention</p>
          </div>
        )}
      </div>

      {/* Findings */}
      <div className="space-y-2">
        {['critical','high','medium','low'].map(sev =>
          bySeverity[sev].map(f => (
            <FindingCard key={f.id} finding={f} onStatusChange={onStatusChange} />
          ))
        )}
      </div>
    </div>
  );
}

export default function SecurityAnalysis() {
  const [activePlatform, setActivePlatform] = useState('telegram');
  const [findings, setFindings] = useState(() => {
    const all = {};
    Object.entries(PLATFORMS).forEach(([pKey, pData]) => {
      pData.findings.forEach(f => { all[f.id] = { ...f }; });
    });
    return all;
  });
  const [scanning, setScanning] = useState(false);

  const handleStatusChange = (id, status) => {
    setFindings(prev => ({ ...prev, [id]: { ...prev[id], status } }));
  };

  const runScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 2000);
  };

  const platformFindings = (pKey) =>
    PLATFORMS[pKey].findings.map(f => findings[f.id] || f);

  const totalOpen = Object.values(findings).filter(f => f.status === 'open').length;
  const totalFixed = Object.values(findings).filter(f => f.status === 'fixed').length;
  const totalCritical = Object.values(findings).filter(f => f.severity === 'critical' && f.status !== 'fixed').length;

  return (
    <div className="space-y-4 px-4 py-4 pb-24">
      {/* Summary bar */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Security Overview</p>
          </div>
          <button onClick={runScan} disabled={scanning}
            className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-lg font-medium">
            <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Rescan'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-red-400">{totalCritical}</p>
            <p className="text-[9px] text-red-400 font-semibold">CRITICAL OPEN</p>
          </div>
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-yellow-400">{totalOpen}</p>
            <p className="text-[9px] text-yellow-400 font-semibold">OPEN ISSUES</p>
          </div>
          <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-green-400">{totalFixed}</p>
            <p className="text-[9px] text-green-400 font-semibold">FIXED</p>
          </div>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(PLATFORMS).map(([key, data]) => {
          const pFindings = platformFindings(key);
          const critOpen = pFindings.filter(f => f.severity === 'critical' && f.status !== 'fixed').length;
          return (
            <button key={key} onClick={() => setActivePlatform(key)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all text-center ${activePlatform === key ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
              <data.icon className="w-4 h-4" style={{ color: activePlatform === key ? undefined : data.color }}
                {...(activePlatform === key ? { className: 'w-4 h-4 text-primary' } : {})} />
              <p className="text-[10px] font-medium leading-tight">{data.label.split(' ')[0]}</p>
              {critOpen > 0 && (
                <span className="text-[9px] bg-red-400/20 text-red-400 rounded-full px-1.5 py-0.5 font-bold">{critOpen} crit</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active platform findings */}
      <PlatformView
        platform={activePlatform}
        data={PLATFORMS[activePlatform]}
        findings={platformFindings(activePlatform)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}