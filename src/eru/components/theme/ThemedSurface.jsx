import { forwardRef } from 'react';
import { cn } from '@/eru/lib/utils';

/**
 * <ThemedSurface />
 * ----------------------------------------------------------------------------
 * Tiny declarative wrapper around the global ERU atmosphere classes
 * (defined in index.css). Use it whenever you want a section/card/panel/nav
 * surface to inherit the app-wide background continuity without hand-rolling
 * translucency + blur on every component.
 *
 * Props:
 *   variant   — which surface class to apply
 *               'surface' | 'panel' | 'card' | 'nav' | 'widget'
 *               | 'modal' | 'drawer' | 'header' | 'storefront' | 'button'
 *   density   — 'subtle' | 'medium' | 'intense' (overrides body density)
 *   accent    — when true, adds the .eru-cta-accent shimmer (good for CTAs)
 *   as        — element tag (default: 'div'); pass 'section', 'header', etc.
 *
 * It NEVER changes layout, pointer-events, or text contrast — it only adds
 * background, border, blur, and shadow tokens.
 * --------------------------------------------------------------------------*/

const VARIANT_CLASS = {
  surface: 'eru-theme-surface',
  panel: 'eru-theme-panel',
  card: 'eru-theme-card',
  nav: 'eru-theme-nav',
  widget: 'eru-theme-widget',
  modal: 'eru-theme-modal',
  drawer: 'eru-theme-drawer',
  header: 'eru-theme-header',
  storefront: 'eru-theme-storefront',
  button: 'eru-theme-button',
};

const DENSITY_CLASS = {
  subtle: 'eru-density-subtle',
  medium: 'eru-density-medium',
  intense: 'eru-density-intense',
};

const ThemedSurface = forwardRef(function ThemedSurface(
  { as: Tag = 'div', variant = 'surface', density, accent = false, className, children, ...rest },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={cn(
        VARIANT_CLASS[variant] || VARIANT_CLASS.surface,
        density && DENSITY_CLASS[density],
        accent && 'eru-cta-accent',
        // Sensible default radius + border so surfaces look right out-of-the-box
        // when used standalone. Override via className when needed.
        variant !== 'button' && 'border rounded-xl',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export default ThemedSurface;