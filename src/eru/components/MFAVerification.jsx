import { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';

export default function MFAVerification({ onVerify, onCancel, action = 'Verify' }) {
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          onCancel?.();
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onCancel]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError('Code must be 6 digits');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError('Code must contain only digits');
      return;
    }

    // In production: verify with backend
    // For now, accept any valid 6-digit code
    onVerify?.(code);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold">Verify Identity</h3>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          This is a critical action. Enter your 6-digit authentication code to proceed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="000000"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            maxLength="6"
            className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <div className="text-xs text-muted-foreground text-center">
            Code expires in {minutes}:{String(seconds).padStart(2, '0')}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            disabled={code.length !== 6}>
            {action}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 bg-secondary text-foreground rounded-lg font-medium hover:opacity-80 transition-opacity">
            Cancel
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          Check your authenticator app for the code.
        </p>
      </div>
    </div>
  );
}