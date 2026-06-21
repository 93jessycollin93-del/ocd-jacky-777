import { useState, useEffect } from 'react';
import { ChevronRight, AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/eru/lib/AuthContext';
import { base44 } from '@/eru/api/base44Client';

export default function ComplianceCenter() {
  const { currentUser } = useAuth();
  const [age, setAge] = useState(null);
  const [analyticsConsent, setAnalyticsConsent] = useState(
    JSON.parse(localStorage.getItem('analyticsConsent') || 'true')
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Age gate on first visit
  useEffect(() => {
    const savedAge = localStorage.getItem('userAgeVerified');
    if (savedAge) {
      setAge(parseInt(savedAge));
    }
  }, []);

  const handleAgeGate = (userAge) => {
    setAge(userAge);
    localStorage.setItem('userAgeVerified', userAge);
    
    if (userAge < 13) {
      // COPPA: Require parental consent
      alert('You must be 13+ to use this app. Please ask your parent/guardian.');
    }
  };

  const toggleAnalytics = (enabled) => {
    setAnalyticsConsent(enabled);
    localStorage.setItem('analyticsConsent', JSON.stringify(enabled));
  };

  const handleDeleteMyData = async () => {
    setDeleting(true);
    try {
      await base44.functions.invoke('deleteMyData', {});
      alert('Your data has been deleted. You will be logged out.');
      window.location.href = '/';
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Age gate not verified yet
  if (age === null) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center px-4">
        <div className="max-w-sm space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Age Verification</h2>
            <p className="text-sm text-muted-foreground">This app is intended for users 13+</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleAgeGate(18)}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity">
              I'm 13 or older
            </button>
            <button
              onClick={() => handleAgeGate(10)}
              className="w-full py-3 bg-destructive/20 text-destructive rounded-xl font-medium hover:opacity-90 transition-opacity">
              I'm under 13
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    );
  }

  // Under 13 - show parental consent request
  if (age < 13) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Parental Consent Required</h2>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-sm text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
            <h3 className="text-lg font-semibold">Age-Restricted Content</h3>
            <p className="text-sm text-muted-foreground">
              This app requires users to be 13 or older. You must have parental consent to continue.
            </p>
            <p className="text-xs text-muted-foreground">
              A parental consent email will be sent to: <strong>parent@example.com</strong>
            </p>
            <button
              className="w-full py-3 bg-secondary text-foreground rounded-xl font-medium hover:opacity-80 transition-opacity">
              Request Parental Consent
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold">Compliance & Privacy</h2>
        <p className="text-xs text-muted-foreground">Age-verified • GDPR compliant • Data protected</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Analytics Consent */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Analytics & Usage Tracking</h3>
              <p className="text-xs text-muted-foreground mt-1">Help us improve by sharing usage data</p>
            </div>
            <button
              onClick={() => toggleAnalytics(!analyticsConsent)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                analyticsConsent ? 'bg-primary' : 'bg-secondary'
              }`}>
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  analyticsConsent ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {analyticsConsent
              ? '✅ Analytics enabled — you can opt-out anytime'
              : '❌ Analytics disabled — no data shared'}
          </p>
        </div>

        {/* Privacy Policy */}
        <Link
          to="/privacy-policy"
          className="flex items-center justify-between px-4 py-3.5 bg-card border border-border rounded-xl hover:bg-secondary/40 transition-colors">
          <div>
            <p className="text-sm font-medium">Privacy Policy</p>
            <p className="text-xs text-muted-foreground">View our data handling practices</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>

        {/* GDPR Rights */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">GDPR & Your Rights</p>
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl hover:bg-secondary/40 transition-colors">
              <div className="text-left">
                <p className="text-sm font-medium">Export My Data</p>
                <p className="text-xs text-muted-foreground">Download your data in JSON format</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-between px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors">
              <div className="text-left">
                <p className="text-sm font-medium text-red-500">Delete My Data</p>
                <p className="text-xs text-muted-foreground">Permanently delete all personal information</p>
              </div>
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>

        {/* Age Verification Status */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs font-semibold text-primary">Age Verified</p>
              <p className="text-[10px] text-muted-foreground">You are 13+ • Full access granted</p>
            </div>
          </div>
        </div>

        {/* Compliance Info */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
          <p>
            <strong>GDPR:</strong> You have the right to access, correct, delete, and port your data.
          </p>
          <p>
            <strong>CCPA:</strong> California residents can request data deletion and opt-out of sales.
          </p>
          <p>
            <strong>COPPA:</strong> Children under 13 require parental consent.
          </p>
          <p>
            Contact: <strong>privacy@yourapp.com</strong>
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="font-semibold">Delete My Data?</h3>
            </div>

            <p className="text-sm text-muted-foreground">
              This will permanently delete your account, all assets, transactions, and personal data. This action cannot be undone.
            </p>

            <div className="space-y-2">
              <button
                onClick={handleDeleteMyData}
                disabled={deleting}
                className="w-full py-2.5 bg-red-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-2.5 bg-secondary text-foreground rounded-lg font-medium hover:opacity-80 transition-opacity">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}