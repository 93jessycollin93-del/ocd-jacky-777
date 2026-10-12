import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "paddle-duel",
  title: "Paddle Duel",
  emoji: "🏓",
  category: "Sports & Racing",
  blurb:
    "Pong in neon. Where the ball meets your paddle sets its angle, and every return makes it faster. Play the AI on Easy, Medium or Hard, or share the screen with a friend. First to 11, win by 2.",
  controls: {
    desktop: "W / S move the left paddle, ↑ / ↓ the right one (2 players) · the mouse also works against the AI · P or Esc to pause",
    touch: "Drag on your side of the screen to move your paddle (each player drags their own half) · tap ⏸ to pause",
  },
  accent: "#22d3ee",
  tags: ["Pong", "1P or 2P", "Neon"],
  scoreLabel: "Best win streak vs Hard",
  order: 1,
};
