import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { inr } from '../util';
import { ArrowIn, ArrowOut, Bed, Bolt, CalendarIcon, Check, Door, KeyIcon, ListIcon, Plus } from './icons';
import './dashboard.css';


const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "YYYY-MM-DD" -> local Date (new Date('2026-11-02') would be read as UTC and can show the wrong day)
const parse = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d); };
const dayFull = (ymd) => { const d = parse(ymd); return `${WEEK[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };

const PAY = { PAID: ['ok', 'Paid'], PART_PAID: ['warn', 'Part-paid'], UNPAID: ['err', 'Unpaid'] };
const SHOWN = 6; // activities listed on the Dashboard; "View all" opens the Front desk

function Stat({ label, value, tone, icon }) {
  return (
    <div className="ow-stat ow-stat-ico">
      <span className={`ow-ico ${tone}`}>{icon}</span>
      <div>
        <div className="k">{label}</div>
        <div className="v">{value}</div>
      </div>
    </div>
  );
}

function status(a) {
  if (a.done) return ['ok', 'Done'];
  if (a.kind === 'CHECK_OUT') return a.due > 0 ? ['err', `${inr(a.due)} due`] : ['warn', 'Ready'];
  return ['warn', 'Waiting'];
}

export default function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      setData(await api.ownerDashboard());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Load once, then refresh every 30 seconds so the numbers stay live.
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) {
    return (
      <>
        <h1 className="ow-h1">Dashboard</h1>
        {error
          ? <p className="error" role="alert">{error} <button className="link" onClick={load}>Try again</button></p>
          : <p className="ow-sub">Loading...</p>}
      </>
    );
  }

  const { totalRooms, occupied, available, todayBookings, activities, balances, arrivals } = data;
  const waiting = activities.filter((a) => a.kind === 'CHECK_IN' && !a.done);
  const goCheckIn = () => navigate(waiting.length ? `/owner/front-desk?booking=${waiting[0].bookingId}` : '/owner/front-desk');

  return (
    <>
      <h1 className="ow-h1">Dashboard</h1>
      <p className="ow-sub">Live from the Front desk. Check someone in, then come back here.</p>
      {error && <p className="error" role="alert">Could not refresh: {error}</p>}

      <section className="ow-stats" aria-label="Today at a glance">
        <Stat label="Total rooms" value={totalRooms} tone="blu" icon={<Bed />} />
        <Stat label="Occupied" value={occupied} tone="grn" icon={<Check />} />
        <Stat label="Available" value={available} tone="blu" icon={<Door />} />
        <Stat label="Today's bookings" value={todayBookings} tone="org" icon={<CalendarIcon />} />
      </section>

      <div className="ow-row2">
        <section className="ow-panel" aria-label="Today's activities">
          <div className="ow-ph">
            <span className="ow-ico blu"><ListIcon /></span>
            <h2>Today's activities</h2>
            <span className="ow-count" aria-label={`${activities.length} activities`}>{activities.length}</span>
            <button className="link" onClick={() => navigate('/owner/front-desk')}>View all</button>
          </div>
          {activities.length === 0 && <p className="ow-empty">Nothing is planned for today.</p>}
          {activities.slice(0, SHOWN).map((a) => {
            const [tone, text] = status(a);
            return (
              <button key={`${a.kind}-${a.bookingId}`} className="ow-act" onClick={() => navigate(`/owner/front-desk?booking=${a.bookingId}`)}>
                <span className={`ow-ico ${a.kind === 'CHECK_IN' ? 'grn' : 'org'}`}>{a.kind === 'CHECK_IN' ? <ArrowIn /> : <ArrowOut />}</span>
                <span className="ow-act-t">
                  <b>{a.kind === 'CHECK_IN' ? 'Guest check-in' : 'Guest check-out'}</b>
                  <small>{a.guestName} &middot; Room {a.room}</small>
                </span>
                <span className={`ow-chip ${tone}`}>{text}</span>
              </button>
            );
          })}
        </section>

        <section className="ow-quick" aria-label="Quick actions">
          <h2><Bolt /> Quick actions</h2>
          <button onClick={() => navigate('/owner/front-desk?new=1')}><Plus /> New reservation</button>
          <button onClick={goCheckIn}><KeyIcon /> Check-in guest{waiting.length > 0 && <small>{waiting.length} waiting</small>}</button>
          <button onClick={() => navigate('/owner/front-desk')}><Bed /> View rooms</button>
        </section>
      </div>

      <div className="ow-cols">
        <section className="ow-panel">
          <h2>Balance to collect (in house)</h2>
          {balances.length === 0 && <p className="ow-empty">Nothing to collect right now.</p>}
          {balances.map((b) => (
            <div className="ow-row" key={b.id}>
              <span><b>{b.guestName}</b> <span className="dot">&middot;</span> Room {b.room}</span>
              <span className="ow-amt">
                {inr(b.amount)}
                <button className="ow-collect" onClick={() => navigate(`/owner/front-desk?booking=${b.id}&pay=1`)}>Collect</button>
              </span>
            </div>
          ))}
        </section>

        <section className="ow-panel">
          <h2>Next arrivals</h2>
          {arrivals.length === 0 && <p className="ow-empty">No upcoming arrivals.</p>}
          {arrivals.map((a) => {
            const [tone, text] = PAY[a.payment] || PAY.UNPAID;
            return (
              <div className="ow-row arr" key={a.id}>
                <span>
                  <b>{a.guestName}</b> <span className="dot">&middot;</span> Room {a.room} <span className="dot">&middot;</span> {a.nights} {a.nights === 1 ? 'night' : 'nights'}
                </span>
                <span className="ow-when">{dayFull(a.arrivalDate)} <span className={`ow-chip ${tone}`}>{text}</span></span>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}