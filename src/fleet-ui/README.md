# fleet-ui — the shared eYe design system

One visual identity across the four apps: **PC** (reference), **Eru** (Base44),
**Jackie** (`ocd-jacky-777`, Lovable/Supabase) and **Cybernetic Empath**.

These files are **copied verbatim** into `src/fleet-ui/` in every repo. They are
deliberately dependency-free — no build step, no package to publish — because the
four apps live on four platforms with four different toolchains. PC is the
source of truth: edit here, then copy outward.

| File | What it is |
|---|---|
| `eye-theme.css` | The palette, as CSS custom properties. Three themes. |
| `tailwind-eye-preset.cjs` | Tailwind preset exposing the HUD colors as utilities. |

## Why two layers

`eye-theme.css` defines each color twice, on purpose:

1. **`--eye-*` raw tokens** (`var(--eye-accent)`) — for HUD chrome, canvas
   drawing, and anything hand-written. **Always active.** A fresh namespace, so
   it collides with nothing.
2. **shadcn/Base44 bridge** — the same colors as the bare `H S% L%` triplets
   that `hsl(var(--background))` expects. **Opt-in** via `data-eye-theme`.

The bridge is what makes this cheap. Eru and Jackie are both shadcn builds with
hundreds of existing components. Without it, adopting the eYe look would mean
touching every one of them. With it, they inherit the theme from one stylesheet.

### Why the bridge is gated

This is a cascade requirement, not a style preference. Unlayered declarations
outrank anything inside `@layer base` — and both Eru and Jackie define their
palettes there. An ungated `:root` block in this file would therefore *silently
override each host app's entire palette* the moment it was imported.

Gating it behind `data-eye-theme` means landing this file is inert: it adds new
`--eye-*` tokens and some unused classes, and changes nothing on screen. Each app
then adopts the palette deliberately, when someone is around to look at the
result:

```js
document.documentElement.dataset.eyeTheme = 'eye-dark';
```

## Install

**1. Import the stylesheet** before your own styles, so app rules can override it:

```css
/* src/index.css */
@import './fleet-ui/eye-theme.css';
```

**2. Register the Tailwind preset** — Eru and Jackie only. PC uses the Tailwind
CDN build with no config file to attach a preset to, so it consumes the tokens and
primitives from `eye-theme.css` directly:

```js
// Eru — tailwind.config.js (CommonJS)
presets: [require('./src/fleet-ui/tailwind-eye-preset.cjs')],
```

```ts
// Jackie — tailwind.config.ts (ESM)
import eyePreset from './src/fleet-ui/tailwind-eye-preset.cjs';
export default { presets: [eyePreset], /* … */ };
```

A preset *merges* with the host config, so each app keeps its own content globs,
plugins and extra theme keys. Nothing is lost.

**3. Adopt the palette** when you're ready to see it change (see gating above):

```js
document.documentElement.dataset.eyeTheme = 'eye-dark';
```

**4. Opt into the ground** on the element that owns the page background:

```html
<body class="eye-ground eye-scanlines">
```

Steps 1–2 are safe to land blind. Steps 3–4 are visible changes — do them where
you can check the result.

## Themes

Selected by `data-eye-theme` on `<html>`:

| Value | Look |
|---|---|
| *(absent)* | Raw tokens only; host app's own palette untouched |
| `eye-dark` | eYe Dark — the situation-room default |
| `cyber-neon` | Hotter magenta/cyan variant |
| `cream-light` | Daylight skin; scanlines and glows off |

Adding a theme means adding one `:root[data-eye-theme='…']` block per layer that
redefines the same token names. Both layers switch together, so Tailwind
utilities and raw CSS never disagree.

## Primitives

Structural classes so the same panel reads as the same object in every app:

- `.eye-ground` — situation-room background, ink color, mono type
- `.eye-scanlines` — faint CRT atmosphere (set `--eye-scanline-opacity: 0` to kill)
- `.eye-panel` — the standard bordered, gradient panel
- `.eye-label` — uppercase micro-label with the shared `0.14em` tracking
- `.eye-readout` — tabular numerals, so digits don't jitter as values update
- `.eye-pill` + `.live` / `.demo` / `.offline` — connection pill, mirroring
  `JackyLinkState` from `lib/jackyClient.ts`
- `.eye-simulated` — dashed marker for panels showing placeholder data

## The honesty rule

`.eye-pill` and `.eye-simulated` exist to enforce something the fleet audit
called out: several dashboards were rendering invented numbers as if they were
measurements.

`jackyClient.telemetry()` always resolves, but a reading taken while the engine
is unreachable comes back with `simulated: true`. **Any panel rendering such a
reading must show its state** — the pill at minimum, `.eye-simulated` on the
readout when there's room. A demo that admits it is fine; a dashboard that lies
is not.

## Accessibility

- Every animation is decorative. `prefers-reduced-motion: reduce` disables the
  scanlines and collapses transitions.
- Gold is reserved for status and insignia — never body text, where it fails
  contrast on the dark ground.
- `.eye-readout` uses tabular numerals so live-updating values don't reflow.
