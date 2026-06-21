import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart2, FlaskConical, Sword } from 'lucide-react';
import { playSound, VIBRATE } from '../../lib/soundEngine';

/**
 * MobileTabBar — fixed iOS-style bottom tab bar shown ONLY on small viewports
 * (< md). Provides four primary navigation stacks: Dashboard, Markets, AI Lab,
 * and Card Arena. Honors `env(safe-area-inset-bottom)` so it sits above the
 * iOS home indicator. The existing floating nav remains available on
 * desktop/tablet (md+).
 *
 * Routing-wise, each tab is a top-level route — React Router preserves each
 * tab's own history because we use <Link>, so users can navigate within a
 * tab and "back" stays within that section as long as they don't tap a
 * different tab.
 */
const TABS = [
  { id: 'dashboard', label: 'Home',    to: '/',       icon: Home },
  { id: 'markets',   label: 'Markets', to: '/markets', icon: BarChart2 },
  { id: 'ailab',     label: 'AI Lab',  to: '/ailab',   icon: FlaskConical },
  { id: 'arena',     label: 'Arena',   to: '/arena',   icon: Sword },
];

function isActive(pathname, to) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function MobileTabBar() {
  const { pathname } = useLocation();

  return (
    <nav
      role="navigation"
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card backdrop-blur-md"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ id, label, to, icon: Icon }) => {
          const active = isActive(pathname, to);
          return (
            <li key={id} className="flex">
              <Link
                to={to}
                onClick={() => { playSound('click'); VIBRATE.click?.(); }}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}