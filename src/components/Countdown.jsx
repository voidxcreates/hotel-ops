import { useEffect, useState } from 'react';

function useNow(ms) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

// Live countdown to the end of a plan. Turns amber in the last 7 days and red once it has ended.
export default function Countdown({ endsAt, seconds = false }) {
  const now = useNow(seconds ? 1000 : 30000);
  const left = new Date(endsAt).getTime() - now;
  if (left <= 0) return <span className="chip err">Plan ended</span>;
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const text = `${d}d ${h}h ${m}m` + (seconds ? ` ${s % 60}s` : '') + ' left';
  return <span className={`chip${d < 7 ? ' warn' : ''}`}>{text}</span>;
}
