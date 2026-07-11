import { useEffect, useState } from 'react';
import NotesPanel from './NotesPanel';

// Mounts once in the Layout. Listens for the 'open-notes-panel' event fired by
// the nav widget toggle so users can open Notes from anywhere in the app.
export default function NotesWidgetMount() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    const toggleHandler = (e) => {
      if (e?.detail?.widgetId !== 'notes') return;
      setOpen((prev) => !prev);
    };
    window.addEventListener('open-notes-panel', openHandler);
    window.addEventListener('toggle-widget-visibility', toggleHandler);
    return () => {
      window.removeEventListener('open-notes-panel', openHandler);
      window.removeEventListener('toggle-widget-visibility', toggleHandler);
    };
  }, []);

  return <NotesPanel open={open} onClose={() => setOpen(false)} />;
}