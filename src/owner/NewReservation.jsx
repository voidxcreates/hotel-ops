import { useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import { digits, inr, isPhone } from '../util';
import { todayYmd } from './dates';
import { MODES } from './payModes';

// "initial" can carry a room and a check-in date when the owner clicked an empty day on the timeline.
export default function NewReservation({ rooms, initial = {}, onClose, onSaved }) {
  const [f, setF] = useState({
    guestName: '', phone: '', room: initial.room || rooms[0]?.number || '',
    checkIn: initial.checkIn || todayYmd(), nights: 1, advance: 0, mode: 'CASH',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const room = rooms.find((r) => r.number === f.room);
  const total = room ? room.rate * (Number(f.nights) || 0) : 0;

  async function submit(e) {
    e.preventDefault();
    const nights = Number(f.nights);
    const advance = Number(f.advance) || 0;
    if (!f.guestName.trim()) return setError('Enter the guest name.');
    if (f.phone && !isPhone(f.phone)) return setError('Phone must be exactly 10 digits.');
    if (!Number.isInteger(nights) || nights < 1 || nights > 60) return setError('Nights must be 1 to 60.');
    if (!f.checkIn || f.checkIn < todayYmd()) return setError('Check-in cannot be in the past.');
    if (advance < 0 || advance > total) return setError(`Advance must be between 0 and ${inr(total)}.`);
    setBusy(true);
    setError('');
    try {
      await api.ownerAddBooking({ guestName: f.guestName.trim(), phone: f.phone, room: f.room, checkIn: f.checkIn, nights, advance, mode: advance > 0 ? f.mode : undefined });
      onSaved(`Reservation saved for ${f.guestName.trim()}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New reservation" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label>Guest name<input value={f.guestName} onChange={set('guestName')} autoFocus /></label>
        <label>Phone (optional)
          <input value={f.phone} inputMode="numeric" maxLength={10} onChange={(e) => setF({ ...f, phone: digits(e.target.value, 10) })} />
        </label>
        <label>Room
          <select value={f.room} onChange={set('room')}>
            {rooms.map((r) => <option key={r.number} value={r.number}>{r.number} · {r.type} · {inr(r.rate)}</option>)}
          </select>
        </label>
        <div className="fields">
          <label>Check-in<input type="date" min={todayYmd()} value={f.checkIn} onChange={set('checkIn')} /></label>
          <label>Nights<input type="number" min="1" max="60" value={f.nights} onChange={set('nights')} /></label>
        </div>
        <label>Advance received (&#8377;)
          <input type="number" min="0" value={f.advance} onChange={set('advance')} />
          <span className="k">Room charge: {inr(total)}</span>
        </label>
        {Number(f.advance) > 0 && (
          <label>Paid by
            <select value={f.mode} onChange={set('mode')}>{MODES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions end">
          <button type="button" className="btn alt sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn sm" disabled={busy}>{busy ? 'Saving...' : 'Save reservation'}</button>
        </div>
      </form>
    </Modal>
  );
}