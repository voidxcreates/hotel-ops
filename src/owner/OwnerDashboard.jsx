import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import { inr } from '../util';

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "YYYY-MM-DD" -> local Date (new Date('2026-11-02') would be read as UTC and can show the wrong day)
const parse = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d); };
const dayShort = (ymd) => { const d = parse(ymd); return `${WEEK[d.getDay()]} ${d.getDate()}`; };
const dayFull = (ymd) => { const d = parse(ymd); return `${WEEK[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };

const PAY = { PAID: ['ok', 'Paid'], PART_PAID: ['warn', 'Part-paid'], UNPAID: ['err', 'Unpaid'] };

function Stat({ label, value }) {
  return (
    <div className="ow-stat">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}

export default function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [ask, setAsk] = useState(null); // balance row being collected
  const [askBusy, setAskBusy] = useState(false);
  const [askError, setAskError] = useState('');

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

  async function collect() {
    setAskBusy(true);
    setAskError('');
    try {
      await api.collectBalance(ask.id);
      setAsk(null);
      await load();
    } catch (e) {
      setAskError(e.message);
    } finally {
      setAskBusy(false);
    }
  }

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

  const { occupancyToday, arrivingToday, leavingToday, balanceDue, occupancyNext7, balances, arrivals } = data;

  return (
    <>
      <h1 className="ow-h1">Dashboard</h1>
      <p className="ow-sub">Live from the Front desk. Check someone in, then come back here.</p>
      {error && <p className="error" role="alert">Could not refresh: {error}</p>}

      <section className="ow-stats" aria-label="Today at a glance">
        <Stat label="Occupancy today" value={`${occupancyToday}%`} />
        <Stat label="Arriving today" value={arrivingToday} />
        <Stat label="Leaving today" value={leavingToday} />
        <Stat label="Balance due (in house)" value={inr(balanceDue)} />
      </section>

      <div className="ow-grid">
        <section className="ow-panel">
          <h2 style={{ border: 0, marginBottom: 0 }}>Rooms filled, next 7 nights</h2>
          <div className="ow-bars" role="list">
            {occupancyNext7.map((d) => (
              <div className="ow-col" role="listitem" key={d.date} title={`${dayFull(d.date)}: ${d.percent}% filled`}>
                <div className="ow-track">
                  <div className="ow-bar" style={{ height: `${Math.min(100, Math.max(0, d.percent))}%` }} />
                </div>
                <b>{d.percent}%</b>
                {dayShort(d.date)}
              </div>
            ))}
          </div>
        </section>

        <section className="ow-panel">
          <h2>Balance to collect (in house)</h2>
          {balances.length === 0 && <p className="ow-empty">Nothing to collect right now.</p>}
          {balances.map((b) => (
            <div className="ow-row" key={b.id}>
              <span><b>{b.guestName}</b> <span className="dot">&middot;</span> Room {b.room}</span>
              <span className="ow-amt">
                {inr(b.amount)}
                <button className="ow-collect" onClick={() => { setAskError(''); setAsk(b); }}>Collect</button>
              </span>
            </div>
          ))}
        </section>
      </div>

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

      {ask && (
        <ConfirmDialog title="Collect balance?" confirmLabel="Mark as collected" busy={askBusy} error={askError} onConfirm={collect} onCancel={() => setAsk(null)}>
          <p>Collect <b>{inr(ask.amount)}</b> from <b>{ask.guestName}</b> (Room {ask.room})?</p>
          <p className="k">Confirm only after you have received the money.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
