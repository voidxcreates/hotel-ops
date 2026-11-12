import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { inr } from '../util';
import BookingPanel, { PAY } from './BookingPanel';
import NewReservation from './NewReservation';
import { addDays, dayFull, dayNum, dayShort, diffDays, isWeekend, monthYear, todayYmd } from './dates';
import './frontdesk.css';

const DAYS = 14; // columns on the timeline

export default function FrontDesk() {
  const [start, setStart] = useState(todayYmd());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [payFirst, setPayFirst] = useState(false);
  const [draft, setDraft] = useState(null); // null = closed, {} or { room, checkIn } = New reservation open
  const [params, setParams] = useSearchParams();
  const today = todayYmd();

  const load = useCallback(async () => {
    try {
      setData(await api.ownerFrontDesk(start, DAYS));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [start]);
  useEffect(() => { load(); }, [load]);

  // The dashboard's "Collect" button sends the owner here: /owner/front-desk?booking=12&pay=1
  useEffect(() => {
    const id = params.get('booking');
    const wantsNew = params.get('new') === '1';
    if (!id && !wantsNew) return;
    if (id) { setOpenId(Number(id)); setPayFirst(params.get('pay') === '1'); }
    if (wantsNew) setDraft({});
    setParams({}, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(start, i)), [start]);
  const groups = useMemo(() => {
    const out = [];
    (data?.rooms || []).forEach((r) => {
      let g = out.find((x) => x.type === r.type);
      if (!g) { g = { type: r.type, rate: r.rate, rooms: [] }; out.push(g); }
      g.rooms.push(r);
    });
    return out;
  }, [data]);

  const bookings = data?.bookings || [];
  const open = bookings.find((b) => b.id === openId);
  const term = q.trim().toLowerCase();
  const todayCol = diffDays(today, start);

  async function changed(message) {
    await load();
    if (message) setNotice(message);
  }

  function openBooking(id) { setPayFirst(false); setOpenId(id); }

  function onLane(e, room) {
    if (e.target.closest('button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.min(DAYS - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * DAYS)));
    const day = addDays(start, col);
    if (day < today) { setNotice('Pick today or a later day to book.'); return; }
    setDraft({ room: room.number, checkIn: day });
  }

  // A stay is drawn from the middle of check-in day to the middle of check-out day.
  function bar(b) {
    const from = diffDays(b.checkIn, start);
    let left = ((from + 0.5) / DAYS) * 100;
    let right = ((from + b.nights + 0.5) / DAYS) * 100;
    if (right <= 0 || left >= 100) return null;
    left = Math.max(left, 0);
    right = Math.min(right, 100);
    const [tone, text] = PAY[b.payment] || PAY.UNPAID;
    const cls = { CHECKED_IN: 'in', RESERVED: 'res', CHECKED_OUT: 'out' }[b.status] || 'res';
    const dim = term && !b.guestName.toLowerCase().includes(term);
    return (
      <button
        key={b.id}
        className={`fd-bar ${cls}${dim ? ' dim' : ''}`}
        style={{ left: `${left}%`, width: `${right - left}%` }}
        onClick={() => openBooking(b.id)}
        aria-label={`${b.guestName}, room ${b.room}, ${text}`}
      >
        <b>{b.guestName}</b>
        <span className={`ow-chip ${tone}`}>{text}</span>
      </button>
    );
  }

  const c = data?.counts;

  return (
    <>
      <div className="fd-top">
        <div>
          <h1 className="ow-h1">Front desk</h1>
          <p className="ow-sub">{dayFull(today)}. Click a booking to see payments. Click an empty day to book.</p>
        </div>
        <button className="btn" onClick={() => setDraft({})}>+ New reservation</button>
      </div>

      <div className="fd-bar-row">
        <span className="fd-lg in">Checked in <b>{c ? c.checkedIn : '-'}</b></span>
        <span className="fd-lg go">Arriving / leaving today <b>{c ? c.arrivingLeavingToday : '-'}</b></span>
        <span className="fd-lg res">Reserved <b>{c ? c.reserved : '-'}</b></span>
        <span className="fd-grow" />
        <input className="fd-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guest" aria-label="Search guest" />
        <button className="btn alt sm" onClick={() => setStart(addDays(start, -7))} aria-label="Earlier week">&larr;</button>
        <button className="btn alt sm" onClick={() => setStart(today)}>Today</button>
        <button className="btn alt sm" onClick={() => setStart(addDays(start, 7))} aria-label="Later week">&rarr;</button>
      </div>

      <div aria-live="polite">
        {notice && <p className="notice">{notice}</p>}
        {error && <p className="error" role="alert">{error} <button className="link" onClick={load}>Try again</button></p>}
      </div>

      <div className="fd-tl" role="region" aria-label="Booking timeline">
        <div className="fd-in">
          <div className="fd-hd">
            <div className="fd-rl">{monthYear(start)}</div>
            {days.map((d) => (
              <div key={d} className={`fd-dy${d === today ? ' td' : ''}${isWeekend(d) ? ' we' : ''}`}>
                {dayShort(d)}<b>{dayNum(d)}</b>
              </div>
            ))}
          </div>
          {!data && !error && <p className="ow-empty" style={{ padding: 16 }}>Loading...</p>}
          {groups.map((g) => (
            <div key={g.type}>
              <div className="fd-grp">{g.type} &middot; {inr(g.rate)} per night</div>
              {g.rooms.map((r) => (
                <div className="fd-rw" key={r.number}>
                  <div className="fd-rl">Room {r.number}<small>{r.type}</small></div>
                  <div className="fd-lane" onClick={(e) => onLane(e, r)}>
                    {todayCol >= 0 && todayCol < DAYS && <div className="fd-now" style={{ left: `${(todayCol / DAYS) * 100}%` }} />}
                    {bookings.filter((b) => b.room === r.number).map(bar)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="k fd-note">Blue = checked in, orange = reserved, grey = checked out. The tag on each bar shows payment.</p>

      {open && (
        <BookingPanel key={`${open.id}-${payFirst}`} booking={open} startPay={payFirst} onClose={() => setOpenId(null)} onChanged={changed} />
      )}

      {draft && data && (
        <NewReservation
          rooms={data.rooms}
          initial={draft}
          onClose={() => setDraft(null)}
          onSaved={(msg) => { setDraft(null); changed(msg); }}
        />
      )}
    </>
  );
}