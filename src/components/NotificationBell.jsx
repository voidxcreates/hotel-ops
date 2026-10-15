import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { dayTime } from '../util';

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  // Check for owner edits now, every 20 seconds, and when the demo button is used.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const n = await api.notifications();
        if (alive) setItems(n);
      } catch { /* try again on the next tick */ }
    };
    poll();
    const t = setInterval(poll, 20000);
    window.addEventListener('owner-edit', poll);
    return () => { alive = false; clearInterval(t); window.removeEventListener('owner-edit', poll); };
  }, []);

  // Close the panel when you click outside it or press Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function openHotel(n) {
    setOpen(false);
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    api.ackNotifications([n.id]).catch(() => {});
    navigate(`/?hotel=${n.hotelId}`);
  }

  async function markAllRead() {
    const ids = items.map((n) => n.id);
    setItems([]);
    api.ackNotifications(ids).catch(() => {});
  }

  return (
    <div className="bell" ref={boxRef}>
      <button
        className="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications, ${items.length} new`}
        aria-expanded={open}
        title="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {items.length > 0 && <span className="badge" aria-hidden="true">{items.length > 9 ? '9+' : items.length}</span>}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Owner requests">
          <div className="bell-head">
            <span>Owner updates</span>
            {items.length > 0 && <button className="link" onClick={markAllRead}>Mark all as read</button>}
          </div>
          {items.length === 0 && <p className="bell-empty">No new requests.</p>}
          {items.map((n) => (
            <button key={n.id} className="bell-item" onClick={() => openHotel(n)}>
              <b>{n.hotelName}</b>
              <div className="k">{n.changedBy}, {dayTime(n.changedAt)}</div>
              <ul>
                {n.changes.map((c) => (
                  <li key={c.field}>{c.field}: <s>{c.from || 'empty'}</s> to <b>{c.to || 'empty'}</b></li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}