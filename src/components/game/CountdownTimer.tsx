import { useState, useEffect } from 'react';

export default function CountdownTimer({ endTime }: { endTime: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
  useEffect(() => {
    const interval = setInterval(() => setRemaining(Math.max(0, Math.ceil((endTime - Date.now()) / 1000))), 1000);
    return () => clearInterval(interval);
  }, [endTime]);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return <span className="text-primary font-display text-xs">{m}:{s.toString().padStart(2, '0')}</span>;
}
