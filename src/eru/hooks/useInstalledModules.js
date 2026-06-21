// Tiny hook to manage installed App Store modules. Persists to localStorage so
// installs survive reloads, and broadcasts a custom event so the Dashboard
// re-renders immediately when a module is installed/uninstalled from the
// /app-store page (cross-route reactivity without a global store).
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'dashboard_installed_modules_v1';
const CHANGE_EVENT = 'installed-modules-changed';

function readStored() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeStored(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: ids }));
}

export function useInstalledModules() {
  const [installed, setInstalled] = useState(readStored);

  useEffect(() => {
    const sync = () => setInstalled(readStored());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const install = useCallback((id) => {
    const next = Array.from(new Set([...readStored(), id]));
    writeStored(next);
  }, []);

  const uninstall = useCallback((id) => {
    const next = readStored().filter((item) => item !== id);
    writeStored(next);
  }, []);

  const isInstalled = useCallback((id) => installed.includes(id), [installed]);

  return { installed, install, uninstall, isInstalled };
}