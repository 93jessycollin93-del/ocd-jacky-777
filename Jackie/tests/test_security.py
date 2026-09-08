"""The scanner finds what SECURITY_PRINCIPLES.md says to find — and never
reproduces the secret it found."""

import unittest

from core import security

SECRET = "sk-live-51H9xQqRvT8mNpZ"


class ScannerTests(unittest.TestCase):
    def rules_for(self, text: str) -> set[str]:
        return {finding.rule for finding in security.scan_text(text)}

    def test_flags_hardcoded_credentials(self) -> None:
        self.assertIn("hardcoded-secret", self.rules_for(f'api_key = "{SECRET}"'))
        self.assertIn("hardcoded-secret", self.rules_for('password = "hunter2!"'))
        self.assertIn("hardcoded-secret", self.rules_for("client_secret: 'abcd1234'"))

    def test_flags_dangerous_calls(self) -> None:
        self.assertIn("eval", self.rules_for("value = eval(user_input)"))
        self.assertIn("unsafe-pickle", self.rules_for("data = pickle.loads(blob)"))
        self.assertIn("shell-true", self.rules_for("subprocess.run(cmd, shell=True)"))
        self.assertIn("tls-verification-off", self.rules_for("requests.get(url, verify=False)"))

    def test_flags_operational_risk(self) -> None:
        self.assertIn("debug-enabled", self.rules_for("app.run(debug=True)"))
        self.assertIn("binds-all-interfaces", self.rules_for('app.run(host="0.0.0.0")'))
        self.assertIn("weak-hash", self.rules_for("hashlib.md5(payload)"))

    def test_flags_credentials_reaching_logs(self) -> None:
        self.assertIn("secret-in-log", self.rules_for("print(f'token={token}')"))
        self.assertIn("secret-in-log", self.rules_for("logger.info('password: %s', password)"))

    def test_safe_yaml_is_not_flagged(self) -> None:
        self.assertIn("unsafe-yaml", self.rules_for("cfg = yaml.load(text)"))
        self.assertNotIn("unsafe-yaml", self.rules_for("cfg = yaml.safe_load(text)"))
        self.assertNotIn("unsafe-yaml", self.rules_for("cfg = yaml.load(text, Loader=yaml.SafeLoader)"))

    def test_clean_code_produces_nothing(self) -> None:
        self.assertEqual(security.scan_text("total = sum(values)\nreturn total\n"), [])

    # -- the scanner's own security posture -------------------------------

    def test_finding_never_reproduces_the_secret(self) -> None:
        """Keep secrets out of logs — including the log that reports the secret."""
        findings = security.scan_text(f'api_key = "{SECRET}"')
        self.assertTrue(findings)
        rendered = security.render(findings)
        self.assertNotIn(SECRET, rendered)
        self.assertIn("redacted", rendered)

    def test_private_key_block_is_redacted(self) -> None:
        text = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----"
        findings = security.scan_text(text)
        self.assertIn("private-key", {f.rule for f in findings})

    # -- comment handling --------------------------------------------------

    def test_code_rules_skip_comments(self) -> None:
        self.assertNotIn("eval", self.rules_for("# do not use eval(x) here"))

    def test_secret_rules_still_apply_in_comments(self) -> None:
        """A commented-out password is still a password in the repository."""
        self.assertIn("hardcoded-secret", self.rules_for(f'# api_key = "{SECRET}"'))

    # -- reporting ---------------------------------------------------------

    def test_report_is_honest_about_being_a_heuristic(self) -> None:
        clean = security.render([], subject="that text")
        self.assertIn("not the same as proof", clean)

    def test_findings_are_ordered_worst_first(self) -> None:
        findings = security.scan_text('app.run(debug=True)\nvalue = eval(x)\n')
        self.assertEqual(findings[0].severity, security.HIGH)

    def test_summarize_counts_by_severity(self) -> None:
        counts = security.summarize(security.scan_text("value = eval(x)"))
        self.assertEqual(counts[security.HIGH], 1)


if __name__ == "__main__":
    unittest.main()
