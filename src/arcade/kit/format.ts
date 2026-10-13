/** Seconds as m:ss. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 1234567 → "1,234,567". */
export const formatNumber = (n: number) => Math.floor(n).toLocaleString("en-US");
