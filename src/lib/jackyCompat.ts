/**
 * jackyCompat — adapter for `src/pages/JackyLive.tsx`'s original calling
 * convention, so the fleet's shared `jackyClient.ts` didn't need a
 * Jackie-only patch.
 *
 * `JackyLive.tsx` was written against a second, independently-built client
 * (`jacky.getStatus()`, `jacky.askSquad()`, …) that landed on this repo's
 * `main` in parallel with the fleet-wide `jackyClient.ts` this repo now also
 * carries. Both talk to the same engine; only the calling convention differs.
 * Rather than fork the shared file — which is byte-identical across all four
 * fleet repos and depends on staying that way — this file re-exports the
 * shared client under the old names. `JackyLive.tsx` keeps working unmodified
 * except for its one import line.
 *
 * If more of this repo starts wanting the `jacky.x()` style, prefer moving
 * call sites onto `jackyClient` directly over growing this file — it exists
 * to unblock one page, not to become a second API.
 */

import { jackyClient, type JackyStatus, type JackyAssessment, type JackyAskResponse } from './jackyClient';

export type { JackyStatus, JackyAssessment };

export const jacky = {
  getStatus: (): Promise<JackyStatus> => jackyClient.status(),
  getAssessment: (): Promise<JackyAssessment> => jackyClient.assessment(),
  ask: (prompt: string, opts?: { task_type?: string }): Promise<JackyAskResponse> =>
    jackyClient.ask({ prompt, task_type: opts?.task_type }),
  askSquad: (squad: string, prompt: string) => jackyClient.squadAsk(squad, prompt),
  discussSquad: (squad: string, prompt: string) => jackyClient.squadDiscuss(squad, prompt),
};
