// A small badge shown while the device is offline: saved pages, games and on-device AI keep working,
// while features that need the server (cloud AI, sync, sign-in) wait for the connection.
import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

export function OfflineBadge() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-3 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-amber-400/40 bg-black/80 px-3 py-1.5 text-xs text-amber-200 shadow-lg backdrop-blur"
    >
      ● Offline: saved pages, games and on-device AI still work
    </div>
  );
}
