// ── Telegram WebApp SDK Integration ──
// Handles initData parsing, theme sync, and platform detection

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text?: string }> }, callback?: (id: string) => void) => void;
  showConfirm: (message: string, callback: (ok: boolean) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

/** Check if running inside Telegram WebApp */
export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;
}

/** Get the Telegram WebApp instance (null if not in Telegram) */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (!isTelegramWebApp()) return null;
  return window.Telegram!.WebApp;
}

/** Get the current Telegram user from initDataUnsafe */
export function getTelegramUser(): TelegramUser | null {
  const wa = getTelegramWebApp();
  return wa?.initDataUnsafe?.user ?? null;
}

/** Initialize Telegram WebApp — call once on mount */
export function initTelegramWebApp(): void {
  const wa = getTelegramWebApp();
  if (!wa) return;

  // Signal readiness
  wa.ready();
  wa.expand();

  // Set dark theme for vault feel
  wa.setHeaderColor('#0a0c10');
  wa.setBackgroundColor('#0a0c10');

  // Enable closing confirmation for transaction safety
  wa.enableClosingConfirmation();
}

/** Haptic feedback helpers */
export const haptic = {
  light: () => getTelegramWebApp()?.HapticFeedback.impactOccurred('light'),
  medium: () => getTelegramWebApp()?.HapticFeedback.impactOccurred('medium'),
  heavy: () => getTelegramWebApp()?.HapticFeedback.impactOccurred('heavy'),
  success: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred('success'),
  error: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred('error'),
  warning: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred('warning'),
  selection: () => getTelegramWebApp()?.HapticFeedback.selectionChanged(),
};

/** Show a native Telegram confirmation dialog */
export function telegramConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const wa = getTelegramWebApp();
    if (!wa) {
      resolve(window.confirm(message));
      return;
    }
    wa.showConfirm(message, resolve);
  });
}

/** Show a native Telegram alert */
export function telegramAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    const wa = getTelegramWebApp();
    if (!wa) {
      window.alert(message);
      resolve();
      return;
    }
    wa.showAlert(message, resolve);
  });
}
