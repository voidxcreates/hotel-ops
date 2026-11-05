import { useEffect, useState } from 'react';
import { api } from '../api';
import { inr } from '../util';
import { dayFull } from './dates';

export const PAY = { PAID: ['ok', 'Paid'], PART_PAID: ['warn', 'Part-paid'], UNPAID: ['err', 'Unpaid'] };
const STAY = { RESERVED: ['blue', 'Not checked-in'], CHECKED_IN: ['ok', 'Checked-in'], CHECKED_OUT: ['mut', 'Checked-out'] };
// button label -> [payment type the server expects, input label]
const ACTS = {
  Deposit: ['DEPOSIT', 'Deposit amount'],
  Adjustment: ['DISCOUNT', 'Discount amount'],
  Refund: ['REFUND', 'Amount to refund'],
  Pay: ['PAYMENT', 'Amount received now'],
};

// Slide-in panel with one booking: dates, payment table, the four money buttons, and check in / out.
export default function BookingPanel({ booking: b, startPay, onClose, onChanged }) {
  const [act, setAct] = useState(startPay && b.balance > 0 ? 'Pay' : '');
  const [amount, setAmount] = useState(startPay && b.balance > 0 ? String(b.balance) : '');
  const [askCancel, setAskCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function run(fn, message) {
    setBusy(true);
    setError('');
    try { await fn(); await onChanged(message); return true; }
    catch (e) { setError(e.message); return false; }
    finally { setBusy(false); }
  }

  function pick(name) {
    setAct(name);
    setAmount(name === 'Pay' && b.balance > 0 ? String(b.balance) : '');
    setError('');
  }

  async function confirmMoney() {
    const v = Number(amount);
    if (!(v > 0)) { setError('Type an amount first.'); return; }
    const ok = await run(() => api.ownerAddPayment(b.id, { kind: ACTS[act][0], amount: v }), `${act} saved.`);
    if (ok) { setAct(''); setAmount(''); }
  }

  const [stayTone, stayText] = STAY[b.status] || STAY.RESERVED;
  const [payTone, payText] = PAY[b.payment] || PAY.UNPAID;

  return (
    <aside className="fd-drawer" aria-label={`Booking for ${b.guestName}`}>
      <div className="fd-dhead">
        <div>
          <h2>{b.guestName}</h2>
          <div className="k">Room {b.room}{b.phone ? ` · ${b.phone}` : ''}</div>
        </div>
        <button className="icon" onClick={onClose} aria-label="Close">&times;</button>
      </div>

      <div className="fd-chips">
        <span className={`ow-chip ${stayTone}`}>{stayText}</span>
        <span className={`ow-chip ${payTone}`}>{payText}</span>
      </div>

      <dl className="fd-kv">
        <div><dt>Check-in</dt><dd>{dayFull(b.checkIn)}</dd></div>
        <div><dt>Check-out</dt><dd>{dayFull(b.checkOut)}</dd></div>
        <div><dt>Nights</dt><dd>{b.nights}</dd></div>
        <div><dt>Balance due</dt><dd className={b.balance > 0 ? 'due' : 'clear'}>{inr(b.balance)}</dd></div>
      </dl>

      <table className="fd-ledger">
        <thead><tr><th>Category</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          <tr>
            <td>Room charge ({b.nights} {b.nights === 1 ? 'night' : 'nights'})</td>
            <td>{inr(b.total)}</td>
            <td><span className={`ow-chip ${b.balance > 0 ? 'warn' : 'ok'}`}>{b.balance > 0 ? 'Pending' : 'Paid'}</span></td>
          </tr>
          {b.payments.map((p) => (
            <tr key={p.id}>
              <td>{p.category}</td>
              <td>{p.amount < 0 ? '-' : ''}{inr(Math.abs(p.amount))}</td>
              <td><span className="ow-chip ok">Done</span></td>
            </tr>
          ))}
          <tr className="sum"><td>Balance due</td><td colSpan="2">{inr(b.balance)}</td></tr>
        </tbody>
      </table>

      {b.status !== 'CHECKED_OUT' && (
        <div className="fd-acts">
          {Object.keys(ACTS).map((name) => (
            <button key={name} className="btn alt" onClick={() => pick(name)} aria-pressed={act === name}>{name}</button>
          ))}
        </div>
      )}

      {act && (
        <div className="fd-form">
          <label>{ACTS[act][1]} (&#8377;)
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </label>
          <div className="actions">
            <button className="btn sm" onClick={confirmMoney} disabled={busy}>{busy ? 'Please wait...' : `Confirm ${act.toLowerCase()}`}</button>
            <button className="btn alt sm" onClick={() => { setAct(''); setError(''); }} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <div className="fd-main">
        {b.status === 'RESERVED' && (
          <>
            <button className="btn" disabled={busy} onClick={() => run(() => api.ownerBookingAction(b.id, 'check-in'), `${b.guestName} checked in.`)}>
              Check in {b.guestName}
            </button>
            {!askCancel
              ? <button className="btn alt" onClick={() => setAskCancel(true)}>Cancel booking</button>
              : (
                <div className="fd-form">
                  <p>Cancel this booking?</p>
                  <div className="actions">
                    <button className="btn danger sm" disabled={busy} onClick={() => run(() => api.ownerBookingAction(b.id, 'cancel'), 'Booking cancelled.').then((ok) => ok && onClose())}>Yes, cancel it</button>
                    <button className="btn alt sm" onClick={() => setAskCancel(false)}>No</button>
                  </div>
                </div>
              )}
          </>
        )}
        {b.status === 'CHECKED_IN' && (
          <button className="btn" disabled={busy} onClick={() => run(() => api.ownerBookingAction(b.id, 'check-out'), `${b.guestName} checked out.`)}>
            Check out {b.guestName}
          </button>
        )}
      </div>
    </aside>
  );
}
