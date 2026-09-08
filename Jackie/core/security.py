"""Risk scanning for code and text.

The rule set is taken straight from SECURITY_PRINCIPLES.md's list of things
Jackie should flag. It is a pattern scanner, not a prover: it raises suspicion
for a human to judge, and says so rather than implying certainty.

One rule governs the scanner itself. "Keep secrets out of logs" applies to the
tool that finds the secrets, so a finding about a hardcoded credential redacts
the credential. Jackie reports *where* the key is, never *what* it is.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

HIGH = "high"
MEDIUM = "medium"
LOW = "low"

_SEVERITY_ORDER = {HIGH: 0, MEDIUM: 1, LOW: 2}

# A line whose first non-space character starts a comment. Code-shaped rules
# skip these; secret-shaped rules do not, because a commented-out password is
# still a password sitting in the repository.
_COMMENT = re.compile(r"^\s*(#|//|/\*|\*)")


@dataclass(frozen=True)
class Rule:
    name: str
    pattern: re.Pattern[str]
    severity: str
    message: str
    suggestion: str
    redact: bool = False
    skip_comments: bool = True
    unless: re.Pattern[str] | None = None


@dataclass(frozen=True)
class Finding:
    rule: str
    severity: str
    line: int
    message: str
    suggestion: str
    excerpt: str

    def render(self) -> str:
        return (
            f"  [{self.severity.upper()}] line {self.line} · {self.rule}\n"
            f"    {self.message}\n"
            f"    {self.excerpt}\n"
            f"    → {self.suggestion}"
        )


def _c(pattern: str) -> re.Pattern[str]:
    return re.compile(pattern, re.IGNORECASE)


RULES: tuple[Rule, ...] = (
    Rule(
        name="hardcoded-secret",
        pattern=_c(r"""(password|passwd|pwd|secret|api[_-]?key|apikey|auth[_-]?token|access[_-]?key|client[_-]?secret)\s*[:=]\s*['"][^'"]{4,}['"]"""),
        severity=HIGH,
        message="A credential looks hardcoded here.",
        suggestion="Move it to an environment variable or a secrets manager, then rotate it — anything committed should be treated as burned.",
        redact=True,
        skip_comments=False,
    ),
    Rule(
        name="private-key",
        pattern=_c(r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
        severity=HIGH,
        message="A private key block is embedded in this file.",
        suggestion="Remove it, rotate the key, and load it from a file outside version control.",
        redact=True,
        skip_comments=False,
    ),
    Rule(
        name="eval",
        pattern=_c(r"\beval\s*\("),
        severity=HIGH,
        message="eval() executes whatever it is handed.",
        suggestion="Parse the value instead — ast.literal_eval or json.loads for data.",
    ),
    Rule(
        name="exec",
        pattern=_c(r"\bexec\s*\("),
        severity=HIGH,
        message="exec() runs arbitrary code at runtime.",
        suggestion="Replace with an explicit dispatch table so the reachable behaviour is enumerable.",
    ),
    Rule(
        name="unsafe-pickle",
        pattern=_c(r"\bpickle\.loads?\s*\("),
        severity=HIGH,
        message="Unpickling untrusted data is remote code execution.",
        suggestion="Use JSON for data you did not produce yourself.",
    ),
    Rule(
        name="shell-true",
        pattern=_c(r"shell\s*=\s*True"),
        severity=HIGH,
        message="shell=True sends the command through a shell, so interpolated values become injectable.",
        suggestion="Pass a list of arguments and leave shell at its default.",
    ),
    Rule(
        name="tls-verification-off",
        pattern=_c(r"verify\s*=\s*False"),
        severity=HIGH,
        message="TLS certificate verification is disabled on this request.",
        suggestion="Leave verification on; point at the proper CA bundle if the chain is the problem.",
    ),
    Rule(
        name="secret-in-log",
        pattern=_c(r"(print|log(ger)?\.\w+|console\.\w+)\s*\([^)]*\b(password|passwd|secret|api[_-]?key|token|credential)\b"),
        severity=HIGH,
        message="A credential looks like it is being written to output.",
        suggestion="Log an identifier or a redacted form — never the value itself.",
    ),
    Rule(
        name="unsafe-yaml",
        pattern=_c(r"yaml\.load\s*\("),
        severity=MEDIUM,
        message="yaml.load can construct arbitrary Python objects.",
        suggestion="Use yaml.safe_load.",
        unless=_c(r"SafeLoader|safe_load"),
    ),
    Rule(
        name="debug-enabled",
        pattern=_c(r"debug\s*=\s*True"),
        severity=MEDIUM,
        message="Debug mode leaks stack traces and can expose an interactive console.",
        suggestion="Drive it from configuration and keep it off outside local development.",
    ),
    Rule(
        name="binds-all-interfaces",
        pattern=_c(r"0\.0\.0\.0"),
        severity=MEDIUM,
        message="This binds every network interface, so the service is reachable off-box.",
        suggestion="Bind 127.0.0.1 unless it is genuinely meant to be public — and if it is, put auth in front of it.",
    ),
    Rule(
        name="weak-hash",
        pattern=_c(r"hashlib\.(md5|sha1)\s*\("),
        severity=MEDIUM,
        message="MD5 and SHA-1 are broken for anything security-bearing.",
        suggestion="Use SHA-256, or bcrypt/argon2 for passwords.",
    ),
)


def _redact(line: str, match: re.Match[str]) -> str:
    """Show the shape of the hit without reproducing the secret."""
    text = match.group(0)
    quoted = re.search(r"""['"]([^'"]*)['"]""", text)
    if quoted and quoted.group(1):
        text = text.replace(quoted.group(1), "…redacted…")
    else:
        head = text[:24]
        text = head + ("…redacted…" if len(match.group(0)) > 24 else "")
    return text.strip()


def scan_text(text: str) -> list[Finding]:
    """Scan a blob of code or prose. Returns findings ordered by severity, then line."""
    findings: list[Finding] = []

    for lineno, line in enumerate(text.splitlines(), start=1):
        is_comment = bool(_COMMENT.match(line))
        for rule in RULES:
            if rule.skip_comments and is_comment:
                continue
            match = rule.pattern.search(line)
            if not match:
                continue
            if rule.unless and rule.unless.search(line):
                continue

            excerpt = _redact(line, match) if rule.redact else line.strip()
            if len(excerpt) > 120:
                excerpt = excerpt[:119] + "…"

            findings.append(
                Finding(
                    rule=rule.name,
                    severity=rule.severity,
                    line=lineno,
                    message=rule.message,
                    suggestion=rule.suggestion,
                    excerpt=excerpt,
                )
            )

    findings.sort(key=lambda f: (_SEVERITY_ORDER[f.severity], f.line))
    return findings


def scan_file(path: Path | str) -> list[Finding]:
    """Scan one file. Unreadable files raise rather than reporting a false all-clear."""
    return scan_text(Path(path).read_text(encoding="utf-8", errors="replace"))


def summarize(findings: list[Finding]) -> dict[str, int]:
    counts = {HIGH: 0, MEDIUM: 0, LOW: 0}
    for finding in findings:
        counts[finding.severity] += 1
    return counts


def render(findings: list[Finding], subject: str = "input") -> str:
    """Human-readable report, in Jackie's register: precise, not alarmed."""
    if not findings:
        return f"Scanned {subject}. Nothing matched my risk patterns — which is not the same as proof it is safe."

    counts = summarize(findings)
    tally = ", ".join(f"{n} {sev}" for sev, n in counts.items() if n)
    lines = [f"Scanned {subject}. {len(findings)} thing(s) worth your eyes ({tally}):", ""]
    lines.extend(finding.render() for finding in findings)
    lines.append("")
    lines.append("These are pattern matches, not verdicts. I flag; you judge.")
    return "\n".join(lines)
