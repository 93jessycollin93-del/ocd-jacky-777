import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Link to="/settings" className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Privacy Policy</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto prose prose-sm text-foreground space-y-6 pb-20">
        <section>
          <h2 className="text-xl font-bold mt-4">Privacy Policy</h2>
          <p className="text-sm text-muted-foreground">Effective: January 1, 2026 | Last Updated: April 10, 2026</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold">1. Introduction</h3>
          <p>We ("App", "we", "us", "our") respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold">2. Data We Collect</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Account Information:</strong> Email, name, phone number (encrypted at rest)</li>
            <li><strong>Payment Information:</strong> Processed by Stripe, Apple Pay, Google Pay (we don't store card data)</li>
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent (analytics only with consent)</li>
            <li><strong>Device Information:</strong> OS, app version, device type</li>
            <li><strong>Location:</strong> Only if you grant permission</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold">3. How We Use Your Data</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Process payments and transactions</li>
            <li>Send transactional emails (order confirmations, password resets)</li>
            <li>Improve app features and security</li>
            <li>Detect fraud and prevent abuse</li>
            <li>Comply with legal obligations</li>
            <li>Marketing (only with opt-in consent)</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold">4. Data Security</h3>
          <p>All data is encrypted in transit (TLS/SSL) and at rest (AES-256-GCM). Sensitive fields like phone numbers and SSN-like identifiers are encrypted before database storage.</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold">5. Your Rights (GDPR/CCPA)</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Right to Access:</strong> Request a copy of your data</li>
            <li><strong>Right to Delete:</strong> Request deletion of your account and data</li>
            <li><strong>Right to Correct:</strong> Update inaccurate data</li>
            <li><strong>Right to Portability:</strong> Export your data in standard format</li>
            <li><strong>Right to Opt-Out:</strong> Withdraw consent for analytics at any time</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold">6. Analytics & Cookies</h3>
          <p>We use analytics to understand how users interact with our app. You can opt-out in Settings → Sound & Haptics. We do not use third-party cookies.</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold">7. Third-Party Services</h3>
          <p>We use the following services that may collect data:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Stripe:</strong> Payment processing (see Stripe Privacy Policy)</li>
            <li><strong>Apple/Google:</strong> In-app purchases (see their privacy policies)</li>
            <li><strong>Telegram:</strong> Mini App data (see Telegram Privacy Policy)</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold">8. Age Restrictions</h3>
          <p>This app is intended for users 13+. Users under 13 require parental consent. If you're a parent/guardian and discover a child has provided personal data without consent, contact us immediately.</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold">9. Data Retention</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Account Data:</strong> Deleted within 30 days of account deletion</li>
            <li><strong>Transaction Records:</strong> Retained 7 years for tax compliance</li>
            <li><strong>Audit Logs:</strong> Retained 2 years for security purposes</li>
            <li><strong>Backups:</strong> Deleted after 90 days</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold">10. Contact Us</h3>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <p><strong>Privacy Team:</strong> privacy@yourapp.com</p>
            <p><strong>Data Protection Officer:</strong> dpo@yourapp.com</p>
            <p><strong>Mailing Address:</strong> [Your Company Address]</p>
          </div>
        </section>

        <section className="text-xs text-muted-foreground border-t border-border pt-4">
          <p>This privacy policy is subject to change. We will notify you of major changes via email.</p>
        </section>
      </div>
    </div>
  );
}