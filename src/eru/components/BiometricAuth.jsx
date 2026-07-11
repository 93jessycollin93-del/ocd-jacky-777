import { useState, useCallback } from 'react';
import { Fingerprint, Scan, Shield, AlertTriangle, CheckCircle, X, Lock } from 'lucide-react';

// Check WebAuthn / biometric support
export function isBiometricSupported() {
  return typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;
}

// Encode/decode helpers for WebAuthn
function bufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
function base64ToBuffer(base64) {
  const bin = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer;
}

// Simple biometric verify via WebAuthn assertion (uses stored credential or falls back to platform authenticator)
async function verifyBiometric(challenge = 'secure-action') {
  const encoder = new TextEncoder();
  const challengeBytes = encoder.encode(challenge + '-' + Date.now());

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: challengeBytes,
      timeout: 60000,
      userVerification: 'required', // Forces biometric (FaceID/TouchID/fingerprint)
      rpId: window.location.hostname,
    }
  });
  return !!credential;
}

// Register biometric for this device
async function registerBiometric(userEmail) {
  const encoder = new TextEncoder();
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: encoder.encode('register-' + Date.now()),
      rp: { name: 'SecureApp', id: window.location.hostname },
      user: {
        id: encoder.encode(userEmail),
        name: userEmail,
        displayName: userEmail,
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Forces built-in FaceID/TouchID/fingerprint
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    }
  });
  if (credential) {
    localStorage.setItem('biometric_registered', 'true');
    localStorage.setItem('biometric_credential_id', bufferToBase64(credential.rawId));
    return true;
  }
  return false;
}

// Hook for biometric state
export function useBiometric() {
  const supported = isBiometricSupported();
  const registered = localStorage.getItem('biometric_registered') === 'true';
  return { supported, registered };
}

// Modal component
export default function BiometricAuth({ open, onClose, onSuccess, action = 'this action', userEmail }) {
  const [phase, setPhase] = useState('prompt'); // prompt | scanning | success | error | register
  const [errorMsg, setErrorMsg] = useState('');
  const { supported, registered } = useBiometric();

  const handleAuth = useCallback(async () => {
    setPhase('scanning');
    setErrorMsg('');
    try {
      if (!registered) {
        // Register first, then verify
        await registerBiometric(userEmail || 'user@app.local');
      }
      const ok = await verifyBiometric(action);
      if (ok) {
        setPhase('success');
        setTimeout(() => { onSuccess?.(); onClose?.(); setPhase('prompt'); }, 1200);
      } else {
        throw new Error('Biometric verification failed');
      }
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Biometric cancelled or not permitted. Please try again.'
        : err.name === 'NotSupportedError'
        ? 'Biometric authentication not available on this device.'
        : err.message || 'Authentication failed';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, [registered, userEmail, action, onSuccess, onClose]);

  const handleSkip = () => { onSuccess?.(); onClose?.(); setPhase('prompt'); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-md bg-card border-t border-border rounded-t-3xl px-6 py-8 space-y-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-muted-foreground">Secure Verification</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Icon area */}
        <div className="flex flex-col items-center gap-4 py-2">
          {phase === 'success' ? (
            <div className="w-20 h-20 rounded-full bg-green-400/10 border-2 border-green-400/40 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          ) : phase === 'scanning' ? (
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center animate-pulse">
              <Scan className="w-10 h-10 text-primary" />
            </div>
          ) : phase === 'error' ? (
            <div className="w-20 h-20 rounded-full bg-red-400/10 border-2 border-red-400/40 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <Fingerprint className="w-10 h-10 text-primary" />
            </div>
          )}

          <div className="text-center">
            {phase === 'success' && <p className="font-semibold text-green-400">Verified!</p>}
            {phase === 'scanning' && <p className="font-semibold text-primary">Scanning…</p>}
            {phase === 'error' && <p className="font-semibold text-red-400">Verification Failed</p>}
            {phase === 'prompt' && <p className="font-semibold">Biometric Required</p>}

            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {phase === 'error' ? errorMsg :
               phase === 'scanning' ? 'Touch the sensor or look at your camera' :
               phase === 'success' ? 'Identity confirmed' :
               `Authenticate with Face ID or fingerprint to proceed with ${action}`}
            </p>
          </div>
        </div>

        {/* Device support notice */}
        {!supported && (
          <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
            <p className="text-xs text-yellow-400">Biometric not supported on this device/browser. Using fallback.</p>
          </div>
        )}

        {/* Registered badge */}
        {supported && registered && phase === 'prompt' && (
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
            <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <p className="text-xs text-primary">Biometric registered on this device</p>
          </div>
        )}
        {supported && !registered && phase === 'prompt' && (
          <div className="flex items-center gap-2 bg-blue-400/10 border border-blue-400/20 rounded-xl px-3 py-2">
            <Shield className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-400">First use — biometric will be registered on this device</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5">
          {(phase === 'prompt' || phase === 'error') && (
            <button
              onClick={handleAuth}
              disabled={!supported}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
              <Fingerprint className="w-4 h-4" />
              {registered ? 'Authenticate' : 'Register & Authenticate'}
            </button>
          )}
          <button onClick={handleSkip} className="w-full py-3 bg-secondary border border-border rounded-2xl text-sm text-muted-foreground font-medium">
            Skip — proceed without biometric
          </button>
        </div>
      </div>
    </div>
  );
}