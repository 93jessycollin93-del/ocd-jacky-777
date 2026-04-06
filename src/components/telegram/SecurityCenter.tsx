import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTelegram } from './TelegramProvider';
import { formatAddress } from '@/lib/ton-wallet';
import { haptic, telegramConfirm } from '@/lib/telegram';
import {
  Shield, Wallet, Smartphone, Eye, EyeOff, LogOut, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, Lock, ArrowLeft, Fingerprint, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SecurityCenterProps {
  onBack: () => void;
}

export default function SecurityCenter({ onBack }: SecurityCenterProps) {
  const { wallet, connectWallet, disconnectWallet, isTelegram, user } = useTelegram();
  const [showAddress, setShowAddress] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  const handleDisconnect = async () => {
    haptic.warning();
    const ok = await telegramConfirm('Disconnect your wallet? You will need to reconnect to make transactions.');
    if (ok) {
      disconnectWallet();
      haptic.success();
    }
  };

  const securityChecklist = [
    { label: 'Seed phrase backed up', description: 'Store offline, never share digitally', critical: true },
    { label: 'No screenshots of seed phrase', description: 'Screenshots can be accessed by malware', critical: true },
    { label: 'Official wallet app used', description: 'Only use verified wallet applications', critical: true },
    { label: 'Bookmark verified URLs', description: 'Avoid clicking links in messages', critical: false },
    { label: 'Review all transactions', description: 'Verify recipient and amount before confirming', critical: false },
    { label: 'Enable 2FA where possible', description: 'Add extra layers of security', critical: false },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border/30 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <Shield size={18} className="text-primary" /> Security Command Center
          </h1>
          <p className="text-[10px] text-muted-foreground">Wallet, sessions, and safety</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Anti-phishing warning */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-300">Anti-Phishing Notice</p>
              <p className="text-[10px] text-red-300/70 mt-1 leading-relaxed">
                This app will NEVER ask for your seed phrase, private key, or password. If any popup or message requests these, it is a scam. Close it immediately.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Wallet section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border/40 bg-card/80 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">TON Wallet</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              wallet.status === 'connected' ? 'bg-primary/20 text-primary' :
              wallet.status === 'connecting' ? 'bg-amber-500/20 text-amber-400' :
              wallet.status === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-muted/40 text-muted-foreground'
            }`}>
              {wallet.status === 'connected' ? '● Connected' :
               wallet.status === 'connecting' ? '◌ Connecting' :
               wallet.status === 'error' ? '✕ Error' :
               '○ Disconnected'}
            </span>
          </div>

          {wallet.status === 'connected' && wallet.address ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                <div>
                  <p className="text-[9px] text-muted-foreground">Address</p>
                  <p className="text-xs font-mono text-foreground">
                    {showAddress ? wallet.address : formatAddress(wallet.address)}
                  </p>
                </div>
                <button onClick={() => setShowAddress(!showAddress)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  {showAddress ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {wallet.network && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Globe size={12} />
                  <span>Network: <span className="text-foreground font-medium">{wallet.network}</span></span>
                </div>
              )}
              <Button variant="destructive" size="sm" className="w-full min-h-[44px]" onClick={handleDisconnect}>
                <LogOut size={14} className="mr-2" /> Disconnect Wallet
              </Button>
            </div>
          ) : (
            <Button className="w-full min-h-[44px]" onClick={connectWallet} disabled={wallet.status === 'connecting'}>
              {wallet.status === 'connecting' ? (
                <><RefreshCw size={14} className="mr-2 animate-spin" /> Connecting...</>
              ) : (
                <><Wallet size={14} className="mr-2" /> Connect TON Wallet</>
              )}
            </Button>
          )}

          {wallet.status === 'error' && (
            <p className="text-[10px] text-red-400 text-center">
              TON Connect SDK integration required for live wallet connection. Architecture ready.
            </p>
          )}
        </motion.div>

        {/* Session info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border/40 bg-card/80 p-4 space-y-2"
        >
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={16} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">Current Session</span>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform</span>
              <span className="text-foreground font-medium">{isTelegram ? 'Telegram Mini App' : 'Web Browser'}</span>
            </div>
            {user && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telegram ID</span>
                  <span className="text-foreground font-mono">{user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Premium</span>
                  <span className="text-foreground">{user.is_premium ? '✓ Yes' : '✕ No'}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Encryption</span>
              <span className="text-primary font-medium flex items-center gap-1"><Lock size={10} /> HTTPS</span>
            </div>
          </div>
        </motion.div>

        {/* Security checklist */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border/40 bg-card/80 p-4"
        >
          <button
            onClick={() => { haptic.selection(); setShowChecklist(!showChecklist); }}
            className="flex items-center justify-between w-full min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <Fingerprint size={16} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Safety Checklist</span>
            </div>
            <span className="text-xs text-muted-foreground">{showChecklist ? '▲' : '▼'}</span>
          </button>
          {showChecklist && (
            <div className="mt-3 space-y-2">
              {securityChecklist.map((item, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <CheckCircle2 size={14} className={item.critical ? 'text-red-400 shrink-0 mt-0.5' : 'text-muted-foreground shrink-0 mt-0.5'} />
                  <div>
                    <p className="text-[11px] text-foreground font-medium">{item.label}</p>
                    <p className="text-[9px] text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Transaction safety */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
        >
          <p className="text-[10px] text-amber-300/70 leading-relaxed">
            <strong className="text-amber-300">Transaction Safety:</strong> All transactions require explicit confirmation. Review recipient address, amount, and fees before approving. Transactions on the blockchain are irreversible.
          </p>
        </motion.div>
      </div>

      {/* Bottom disclaimer */}
      <div className="shrink-0 px-4 py-2 border-t border-border/20">
        <p className="text-[8px] text-muted-foreground/50 text-center">
          ⚠️ This platform does not guarantee transaction safety. Always verify before confirming. Not financial advice.
        </p>
      </div>
    </div>
  );
}
