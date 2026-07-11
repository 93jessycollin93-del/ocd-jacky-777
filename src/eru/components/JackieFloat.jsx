import { useMemo, useState } from 'react';
import { Bot, GripVertical } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function JackieFloat({ prefs, updateWidget }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [draggingId, setDraggingId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const jackiePrefs = prefs?.jackie;
  const widgets = useMemo(() => ([
    {
      id: 'jackie',
      hidden: pathname === '/jackie' || !jackiePrefs?.visible,
      x: jackiePrefs?.x ?? 16,
      y: jackiePrefs?.y ?? 100,
      title: 'Open Jackie',
      icon: Bot,
      className: 'bg-primary glow-green border-primary',
      iconClass: 'text-primary-foreground',
      onClick: () => navigate('/jackie'),
    },
  ]), [pathname, jackiePrefs, navigate]);

  const handleMouseDown = (id) => (e) => {
    setDraggingId(id);
    const rect = e.currentTarget.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (id) => (e) => {
    if (draggingId !== id) return;
    const newX = Math.max(0, Math.min(e.clientX - offset.x, window.innerWidth - 56));
    const newY = Math.max(0, Math.min(e.clientY - offset.y, window.innerHeight - 56));
    updateWidget(id, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  return (
    <>
      {widgets.filter((widget) => !widget.hidden).map(({ id, x, y, icon: Icon, title, className, iconClass, onClick }) => (
        <div
          key={id}
          style={{ position: 'fixed', left: `${x}px`, top: `${y}px` }}
          className="z-50"
        >
          <button
            onMouseDown={handleMouseDown(id)}
            onMouseMove={handleMouseMove(id)}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => draggingId !== id && onClick()}
            className={`group relative w-12 h-12 rounded-full border shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-move ${className}`}
            title={title}
          >
            <Icon className={`w-5 h-5 pointer-events-none ${iconClass}`} />
            <span className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-2.5 h-2.5 text-muted-foreground" />
            </span>
          </button>
        </div>
      ))}
    </>
  );
}