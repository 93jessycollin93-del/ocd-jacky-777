import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initTelegramWebApp, isTelegramWebApp, getTelegramUser, type TelegramUser } from '@/lib/telegram';
import { getPersistedWalletState, persistWalletState, type WalletState } from '@/lib/ton-wallet';

interface TelegramContextValue {
  isTelegram: boolean;
  user: TelegramUser | null;
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  platform: 'telegram' | 'web';
}

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false,
  user: null,
  wallet: { status: 'disconnected', address: null, balance: null, network: null, lastConnected: null },
  connectWallet: async () => {},
  disconnectWallet: () => {},
  platform: 'web',
});

export const useTelegram = () => useContext(TelegramContext);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [isTg] = useState(() => isTelegramWebApp());
  const [user] = useState(() => getTelegramUser());
  const [wallet, setWallet] = useState<WalletState>(getPersistedWalletState);

  useEffect(() => {
    if (isTg) initTelegramWebApp();
  }, [isTg]);

  const connectWallet = async () => {
    setWallet(prev => ({ ...prev, status: 'connecting' }));
    // TODO: Replace with real TON Connect SDK integration
    // For now, set to error state to show the UI flow works
    setTimeout(() => {
      const state: WalletState = {
        status: 'error',
        address: null,
        balance: null,
        network: null,
        lastConnected: null,
      };
      setWallet(state);
      persistWalletState(state);
    }, 1500);
  };

  const disconnectWallet = () => {
    const state: WalletState = {
      status: 'disconnected',
      address: null,
      balance: null,
      network: null,
      lastConnected: null,
    };
    setWallet(state);
    persistWalletState(state);
  };

  return (
    <TelegramContext.Provider value={{
      isTelegram: isTg,
      user,
      wallet,
      connectWallet,
      disconnectWallet,
      platform: isTg ? 'telegram' : 'web',
    }}>
      {children}
    </TelegramContext.Provider>
  );
}
