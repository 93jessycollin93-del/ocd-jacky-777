/** Removes reasoning blocks (<think>…</think>) from a model's reply, including one still being written. */
export function stripThinking(raw: string): string {
  return raw.replace(/<think>[\s\S]*?(?:<\/think>\s*|$)/g, "").replace(/^\s+/, "");
}
