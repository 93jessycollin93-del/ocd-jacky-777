/**
 * eYe Tailwind preset — the utility-class half of the shared design system.
 *
 * `eye-theme.css` already bridges the eYe palette onto shadcn's `--background`
 * / `--primary` / … variables, so `bg-background` and `text-primary` pick up the
 * theme with no config change at all. This preset adds what the bridge can't:
 * named utilities for the HUD-specific colors (`text-eye`, `border-eye-line`,
 * `bg-nominal`) that have no shadcn equivalent, plus the shared type and radius
 * scales.
 *
 * Every color resolves through `var(--eye-*)`, so switching `data-eye-theme` on
 * <html> restyles Tailwind utilities and raw CSS together — no rebuild, no
 * duplicated palette to drift.
 *
 * Usage (Eru — tailwind.config.js, CommonJS):
 *     presets: [require('./src/fleet-ui/tailwind-eye-preset.cjs')]
 *
 * Usage (Jackie — tailwind.config.ts, ESM):
 *     import eyePreset from './src/fleet-ui/tailwind-eye-preset.cjs';
 *     export default { presets: [eyePreset], … }
 *
 * A preset merges with the host config rather than replacing it, so each app
 * keeps its own content globs, plugins and any extra theme keys.
 */

module.exports = {
  theme: {
    extend: {
      colors: {
        /* The eYe itself — signature teal. */
        eye: {
          DEFAULT: 'var(--eye-accent)',
          deep: 'var(--eye-accent-deep)',
          soft: 'var(--eye-accent-soft)',
        },
        /* Rank gold — reserved for status and insignia, never body text. */
        gold: {
          DEFAULT: 'var(--eye-gold)',
          soft: 'var(--eye-gold-soft)',
        },
        /* Situation semantics. Thresholds live in lib/jackyClient.ts (THERMAL). */
        nominal: 'var(--eye-nominal)',
        warn: 'var(--eye-warn)',
        crit: {
          DEFAULT: 'var(--eye-crit)',
          soft: 'var(--eye-crit-soft)',
        },
        /* Structural surfaces, for panels that predate the shadcn bridge. */
        ground: {
          DEFAULT: 'var(--eye-bg)',
          2: 'var(--eye-bg-2)',
        },
        panel: {
          DEFAULT: 'var(--eye-panel)',
          2: 'var(--eye-panel-2)',
          hi: 'var(--eye-panel-hi)',
        },
        ink: {
          DEFAULT: 'var(--eye-ink)',
          dim: 'var(--eye-ink-dim)',
          muted: 'var(--eye-muted)',
        },
        'eye-line': {
          DEFAULT: 'var(--eye-line)',
          2: 'var(--eye-line-2)',
        },
      },

      fontFamily: {
        display: 'var(--eye-font-display)',
        hud: 'var(--eye-font-mono)',
      },

      borderRadius: {
        eye: 'var(--eye-radius)',
        'eye-sm': 'var(--eye-radius-sm)',
      },

      boxShadow: {
        eye: 'var(--eye-shadow)',
        /* Focus/active glow for the teal accent. */
        'eye-glow': '0 0 0 3px var(--eye-accent-soft)',
      },

      backgroundImage: {
        'eye-glow-teal': 'var(--eye-glow-teal)',
        'eye-glow-gold': 'var(--eye-glow-gold)',
        /* Panel gradient, matching the .eye-panel primitive. */
        'eye-panel': 'linear-gradient(180deg, var(--eye-panel), var(--eye-panel-2))',
      },

      letterSpacing: {
        /* The wide tracking used on every uppercase micro-label. */
        label: '0.14em',
      },

      keyframes: {
        /* Radar sweep for the eYe insignia. */
        'eye-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        /* Slow breathing pulse for live-status indicators. */
        'eye-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },

      animation: {
        'eye-sweep': 'eye-sweep 2.6s linear infinite',
        'eye-pulse': 'eye-pulse 2s ease-in-out infinite',
      },
    },
  },
};
