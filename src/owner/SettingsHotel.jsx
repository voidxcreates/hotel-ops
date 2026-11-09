import { useEffect, useState } from 'react';
import { api } from '../api';
import { digits } from '../util';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const fromHotel = (h) => ({ name: h.name, address: h.address, phone: h.phone, checkInTime: h.checkInTime, checkOutTime: h.checkOutTime });

export default function SettingsHotel({ hotel, onSaved }) {
  const [f, setF] = useState(() => fromHotel(hotel));
  const [saved, setSaved] = useState(() => fromHotel(hotel));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setNotice(''); };
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  async function submit(e) {
    e.preventDefault();
    const name = f.name.trim();
    const address = f.address.trim();
    if (name.length < 2 || name.length > 60) return setError('Enter the hotel name.');
    if (!address) return setError('Enter the address.');
    if (!/^\d{10}$/.test(f.phone)) return setError('Phone must be exactly 10 digits.');
    if (!TIME.test(f.checkInTime)) return setError('Enter the check-in time.');
    if (!TIME.test(f.checkOutTime)) return setError('Enter the check-out time.');
    setBusy(true);
    setError('');
    try {
      const body = { ...f, name, address };
      await api.ownerUpdateHotel(body);
      setF(body);
      setSaved(body);
      setNotice('Saved. The admin has been told about the change.');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="ow-panel st-card" onSubmit={submit} noValidate>
      <label>Hotel name<input value={f.name} onChange={set('name')} maxLength={60} /></label>
      <label>Address<input value={f.address} onChange={set('address')} maxLength={200} /></label>
      <label>Phone number
        <input value={f.phone} inputMode="numeric" onChange={(e) => { setF({ ...f, phone: digits(e.target.value, 10) }); setNotice(''); }} />
        <span className="k">10 digits</span>
      </label>
      <div className="fields">
        <label>Check-in time<input type="time" value={f.checkInTime} onChange={set('checkInTime')} /></label>
        <label>Check-out time<input type="time" value={f.checkOutTime} onChange={set('checkOutTime')} /></label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      <button className="btn" disabled={!dirty || busy}>{busy ? 'Saving...' : 'Save changes'}</button>
      <p className="k">The admin gets a notification when you change hotel details.</p>
    </form>
  );
}
