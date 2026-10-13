// Offline sign-in fallback. Supabase keeps the signed-in session in localStorage, and its access token
// expires after about an hour. Opening the app offline after that, the token can't be refreshed, so
// getSession() reports nobody signed in. While offline, we fall back to the user stored in that session
// so that pages and games already saved on the device still open.
// This only affects what the app shows. It never creates a session or a token, so nothing on the server
// is reachable until the device is back online and Supabase refreshes the real session.
import type { User } from "@supabase/supabase-js";

export const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

/** The user saved with the last Supabase session on this device, or null after a sign-out. */
export function storedUser(): User | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
      const saved = JSON.parse(localStorage.getItem(key) ?? "null");
      const user = saved?.user ?? saved?.currentSession?.user;
      if (user && typeof user.id === "string") return user as User;
    }
  } catch {
    // Storage blocked or corrupt: no fallback.
  }
  return null;
}
