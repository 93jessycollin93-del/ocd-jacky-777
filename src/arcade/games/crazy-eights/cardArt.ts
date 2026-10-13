// Card pictures for the table, borrowed from Klondike's code-drawn deck (same card ids: suit × 13 + rank).
// Each face is rendered once at a fixed size and turned into an image URL; CSS scales it.
import { SpriteCache } from "../klondike/cards";

const CW = 120;
const CH = 168;
const cache = new SpriteCache();
const urls = new Map<number | "back", string>();

export function cardUrl(card: number | "back"): string {
  let url = urls.get(card);
  if (!url) {
    const dpr = 2;
    const sprite = card === "back" ? cache.back(CW, CH, dpr) : cache.face(card, CW, CH, dpr);
    url = sprite.toDataURL();
    urls.set(card, url);
  }
  return url;
}

export const CARD_RATIO = CH / CW;
