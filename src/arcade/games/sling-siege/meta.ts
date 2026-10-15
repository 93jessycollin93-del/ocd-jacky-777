import type { GameMeta } from "../../types";

export const meta: GameMeta = {
  id: "sling-siege",
  title: "Sling Siege",
  emoji: "🪨",
  category: "Action",
  blurb:
    "Fling pebble critters at the grumblers' wobbly forts. Wood splinters, stone cracks, glass shatters and TNT goes boom. 18 levels across three worlds, with a trick for every critter.",
  controls: {
    desktop: "Drag back from the slingshot and let go to fire · click in flight for the critter's trick (or Space) · R restarts · P or Esc pauses",
    touch: "Drag back from the slingshot and let go · tap in flight for the critter's trick · drag the scenery to look around",
  },
  accent: "#f97316",
  tags: ["Physics", "Levels", "Destruction"],
  scoreLabel: "Total score",
  order: 5,
};
