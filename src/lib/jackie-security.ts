const SECURITY_PATTERNS = [
  /hardcoded\s*(api[_ ]?key|secret|password|token|credential)/i,
  /exposed\s*(secret|token|key|credential)/i,
  /api[_ ]?key\s*(in|exposed|hardcoded|leaked|visible)/i,
  /password\s*(in|exposed|hardcoded|leaked|visible|plain)/i,
  /secret\s*(in|exposed|hardcoded|leaked|visible)/i,
  /security\s*(breach|risk|vulnerability|issue|concern|warning|flaw)/i,
  /\beval\s*\(/i,
  /shell\s*=\s*True/i,
  /unsafe\s*(pickle|deserialization)/i,
  /credential[s]?\s*(exposed|leaked|hardcoded)/i,
  /\b(CVE-\d{4}-\d+)\b/i,
  /injection\s*(attack|vulnerability|risk)/i,
  /XSS|cross.site.scripting/i,
  /SQL\s*injection/i,
];

const FLAG_LABELS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /hardcoded\s*(api[_ ]?key|secret|password|token|credential)/i, label: "Hardcoded Secret Detected" },
  { pattern: /exposed\s*(secret|token|key|credential)/i, label: "Exposed Credential" },
  { pattern: /api[_ ]?key\s*(in|exposed|hardcoded|leaked|visible)/i, label: "API Key Exposure" },
  { pattern: /password\s*(in|exposed|hardcoded|leaked|visible|plain)/i, label: "Password Exposure" },
  { pattern: /security\s*(breach|risk|vulnerability|issue|concern|warning|flaw)/i, label: "Security Risk Identified" },
  { pattern: /\beval\s*\(/i, label: "Unsafe eval() Usage" },
  { pattern: /shell\s*=\s*True/i, label: "Unsafe Shell Execution" },
  { pattern: /injection\s*(attack|vulnerability|risk)/i, label: "Injection Vulnerability" },
  { pattern: /XSS|cross.site.scripting/i, label: "XSS Vulnerability" },
  { pattern: /SQL\s*injection/i, label: "SQL Injection Risk" },
];

export function detectSecurityFlag(content: string): string | null {
  for (const { pattern, label } of FLAG_LABELS) {
    if (pattern.test(content)) return label;
  }
  return null;
}

export function detectMemoryTier(content: string, userInput: string): 1 | 2 | 3 {
  // Gold: identity, architecture, core decisions
  const goldPatterns = [/core identity/i, /architecture/i, /foundational/i, /non-negotiable/i, /gold memory/i];
  if (goldPatterns.some((p) => p.test(content))) return 3;

  // Durable: security, preferences, project context
  const durablePatterns = [/security/i, /hardcoded/i, /credential/i, /preference/i, /remember/i, /important/i];
  if (durablePatterns.some((p) => p.test(content) || p.test(userInput))) return 2;

  return 1;
}

export function hasSecurityContent(content: string): boolean {
  return SECURITY_PATTERNS.some((p) => p.test(content));
}
