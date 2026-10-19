import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { day, dayTime, inr } from '../util';
import { ownerApi } from './ownerApi';
import { useOwner } from './ownerContext';
import {
  MAX_HISTORY_DAYS, MAX_SPAN_DAYS, addDays, dayRows, downloadReport, inRange, netAmount,
  presetRange, rangeError, spanDays, parseYmd, ymd,
} from './report';

const PRESETS = [['1', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['custom', 'Custom dates']];

// "This month" and "Last month" shortcuts for the custom dates.
function monthRange(offset) {
  const n = new Date();
  const first = new Date(n.getFullYear(), n.getMonth() + offset, 1);
  const last = offset === 0 ? n : new Date(n.getFullYear(), n.getMonth() + offset + 1, 0);
  return { from: ymd(first), to: ymd(last) };
}

// Popup behind the "Details" button: which bookings came, how many, and the ZIP report.
export default function DetailsModal({ onClose }) {
  const { hotel } = useOwner();
  const [preset, setPreset] = useState('7');
  const [custom, setCustom] = useState(() => presetRange(7));
  const [data, setData] = useState(null); // { key, bookings, transactions }
  const [error, setError] = useState('');

  const range = preset === 'custom' ? custom : presetRange(Number(preset));
  const problem = preset === 'custom' ? rangeError(custom) : '';
  const key = `${range.from}|${range.to}`;
  const today = ymd(new Date());
  const earliest = ymd(addDays(new Date(), -(MAX_HISTORY_DAYS - 1)));

  // Ask for the records of the chosen dates whenever they change.
  useEffect(() => {
    if (problem) return undefined;
    let alive = true;
    setError('');
    Promise.all([ownerApi.bookings(range), ownerApi.transactions(range)])
      .then(([bookings, transactions]) => { if (alive) setData({ key, bookings, transactions }); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [key, problem]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = !problem && data && data.key === key;

  const view = useMemo(() => {
    if (!ready) return null;
    return {
      checkIns: data.bookings.filter((b) => inRange(b.checkIn, range))
        .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn)),
      checkOuts: data.bookings.filter((b) => b.checkOut && inRange(b.checkOut, range)).length,
      collected: data.transactions.filter((t) => inRange(t.at, range)).reduce((s, t) => s + netAmount(t), 0),
      rows: dayRows(data.bookings, data.transactions, range),
    };
  }, [ready, data, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const rangeText = range.from === range.to
    ? day(parseYmd(range.from).toISOString())
    : `${day(parseYmd(range.from).toISOString())} to ${day(parseYmd(range.to).toISOString())}`;

  return (
    <Modal title="Check-ins and reports" wide onClose={onClose}>
      <div className="tabs" role="tablist" aria-label="Period">
        {PRESETS.map(([id, text]) => (
          <button key={id} role="tab" aria-selected={preset === id} className="tab" onClick={() => setPreset(id)}>{text}</button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="custom">
          <label>From
            <input type="date" value={custom.from} min={earliest} max={custom.to || today}
              onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          </label>
          <label>To
            <input type="date" value={custom.to} min={custom.from || earliest} max={today}
              onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          </label>
          <div className="quick">
            <button className="btn alt sm" onClick={() => setCustom(monthRange(0))}>This month</button>
            <button className="btn alt sm" onClick={() => setCustom(monthRange(-1))}>Last month</button>
          </div>
        </div>
      )}
      {preset === 'custom' && (
        <p className="k">You can look back {MAX_HISTORY_DAYS} days, and up to {MAX_SPAN_DAYS} days at a time.</p>
      )}
      {problem && <p className="error" role="alert">{problem}</p>}
      {!problem && <p className="k">{rangeText}{spanDays(range.from, range.to) > 1 ? ` (${spanDays(range.from, range.to)} days)` : ''}</p>}

      {error && <p className="error" role="alert">{error}</p>}
      {!problem && !ready && !error && <p className="k">Loading...</p>}

      {view && (
        <>
          <div className="cards">
            <div className="card"><div className="k">Bookings came</div><div className="v">{view.checkIns.length}</div></div>
            <div className="card"><div className="k">Check-outs</div><div className="v">{view.checkOuts}</div></div>
            <div className="card"><div className="k">Collected</div><div className="v">{inr(view.collected)}</div></div>
          </div>

          {view.rows.length > 1 && (
            <>
              <div className="sec">Day by day</div>
              <div className="tablescroll">
                <table>
                  <thead><tr><th>Day</th><th>Bookings</th><th>Check-outs</th><th>Collected</th></tr></thead>
                  <tbody>
                    {view.rows.map((r) => (
                      <tr key={r.key}>
                        <td>{r.label}</td><td>{r.checkIns}</td><td>{r.checkOuts}</td><td>{inr(r.collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="sec">Bookings that came</div>
          {view.checkIns.length === 0 && <p className="k">No bookings in this period.</p>}
          {view.checkIns.length > 0 && (
            <div className="tablescroll">
              <table>
                <thead>
                  <tr><th>Guest</th><th>Room</th><th>Checked in</th><th>Checked out</th><th>Nights</th><th>Total</th><th>Payment</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {view.checkIns.map((b) => {
                    const due = b.total - b.paid;
                    return (
                      <tr key={b.id}>
                        <td><b>{b.guest}</b></td>
                        <td>{b.room}</td>
                        <td>{dayTime(b.checkIn)}</td>
                        <td>{b.checkOut ? dayTime(b.checkOut) : <span className="chip">In house</span>}</td>
                        <td>{b.nights}</td>
                        <td>{inr(b.total)}</td>
                        <td>{due > 0 ? <span className="chip warn">{inr(due)} due</span> : <span className="chip">Paid</span>}</td>
                        <td>{b.source}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="modal-foot">
            <span className="k">
              The ZIP covers {rangeText}: check-ins, check-outs, every payment with its type and mode, and daily totals.
            </span>
            <button
              className="btn sm"
              onClick={() => downloadReport({ hotelName: hotel.name, range, bookings: data.bookings, transactions: data.transactions })}
            >
              Download report (ZIP)
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
