import { useLocation } from 'react-router-dom';
import { useTheme } from '@/eru/context/ThemeContext';

export default function PageThemeLayer({ children }) {
  const location = useLocation();
  const { pageThemeMap } = useTheme();
  const scopedStyles = pageThemeMap?.[location.pathname] || {};

  return (
    <div
      data-theme-page={location.pathname}
      className="min-h-full min-w-0"
      style={{
        background: 'var(--page-bg, transparent)',
        borderColor: 'var(--page-border, hsl(var(--border)))',
        ...scopedStyles,
      }}
    >
      {children}
    </div>
  );
}