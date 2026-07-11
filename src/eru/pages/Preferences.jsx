import { useEffect, useState } from 'react';
import { Save, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import DisplayPreferencesSection from '@/eru/components/preferences/DisplayPreferencesSection';
import SavedContentSection from '@/eru/components/preferences/SavedContentSection';
import PaymentDefaultsSection from '@/eru/components/preferences/PaymentDefaultsSection';
import IntegrationQuotaSection from '@/eru/components/preferences/IntegrationQuotaSection';
import TelegramConnectSection from '@/eru/components/preferences/TelegramConnectSection';

/**
 * Preferences
 * ----------------------------------------------------------------------------
 * Mobile-first hub where users manage:
 *   1. Display preferences (color mode, typography, density) — live via ThemeContext
 *   2. Saved content overview — read-only summary with deep links
 *   3. Payment currency defaults — persisted on the user record
 *
 * Display prefs persist immediately (ThemeContext handles localStorage).
 * Payment prefs are saved explicitly via base44.auth.updateMe to avoid
 * accidental overwrites mid-edit.
 */
const DEFAULT_PAYMENT_PREFS = {
  default_currency: 'GOLD',
  fallback_method: 'wallet',
  auto_confirm_under: 0,
};

export default function Preferences() {
  const { currentUser } = useAuth();
  const [paymentPrefs, setPaymentPrefs] = useState(DEFAULT_PAYMENT_PREFS);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    setPaymentPrefs({
      ...DEFAULT_PAYMENT_PREFS,
      ...(currentUser.payment_preferences || {}),
    });
  }, [currentUser]);

  const handleSavePayment = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ payment_preferences: paymentPrefs });
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Account</p>
        </div>
        <h1 className="text-xl font-semibold text-foreground mt-1">Preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage display, saved content, and payment defaults in one place.</p>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-3xl mx-auto">
        <DisplayPreferencesSection />

        <SavedContentSection userEmail={currentUser?.email} />

        <IntegrationQuotaSection />

        <TelegramConnectSection />

        <PaymentDefaultsSection prefs={paymentPrefs} onChange={setPaymentPrefs} />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSavePayment}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save payment defaults'}
          </button>
          {savedAt && !saving && (
            <span className="text-xs text-primary inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center">Display changes apply instantly. Payment defaults save when you tap the button.</p>
      </div>
    </div>
  );
}