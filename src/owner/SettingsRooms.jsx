import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { inr } from '../util';
import { parseRooms } from './roomRange';

let seq = 0;
const key = () => `t${++seq}`;
const toRows = (types) => types.map((t) => ({ key: key(), id: t.id, name: t.name, rate: String(t.rate), rooms: [...t.rooms], adding: '', msg: '' }));
const snapshot = (rows) => JSON.stringify(rows.map(({ id, name, rate, rooms }) => ({ id, name, rate, rooms })));

export default function SettingsRooms() {
  const [rows, setRows] = useState(null);
  const [snap, setSnap] = useState('');
  const [limit, setLimit] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.ownerRooms();
      const next = toRows(r.types);
      setRows(next);
      setSnap(snapshot(next));
      setLimit(r.roomLimit);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!rows) return error ? <p className="error" role="alert">{error}</p> : <p className="ow-empty">Loading...</p>;

  const count = rows.reduce((s, r) => s + r.rooms.length, 0);
  const dirty = snapshot(rows) !== snap;
  const patch = (k, p) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...p } : r)));

  function removeType(r) {
    if (r.rooms.length > 0) { patch(r.key, { msg: 'Move or remove its rooms first.' }); return; }
    setRows(rows.filter((x) => x.key !== r.key));
  }

  function addRooms(r) {
    const { rooms, error: err } = parseRooms(r.adding);
    if (err) return patch(r.key, { msg: err });
    for (const n of rooms) {
      const owner = rows.find((x) => x.rooms.includes(n));
      if (owner) return patch(r.key, { msg: owner.key === r.key ? `Room ${n} is already added.` : `Room ${n} is already in ${owner.name || 'another type'}. Remove it there first.` });
    }
    if (count + rooms.length > limit) return patch(r.key, { msg: `Your plan covers ${limit} rooms. To add more, contact your account manager.` });
    patch(r.key, { rooms: [...r.rooms, ...rooms], adding: '', msg: '' });
    setNotice('');
  }

  async function save() {
    const names = new Set();
    for (const r of rows) {
      const name = r.name.trim();
      if (!name) return setError('Every room type needs a name.');
      if (names.has(name.toLowerCase())) return setError(`"${name}" is used twice. Room types need different names.`);
      names.add(name.toLowerCase());
      const rate = Number(r.rate);
      if (!Number.isInteger(rate) || rate < 1 || rate > 99999) return setError(`Rate for ${name} must be a whole number from 1 to 99999.`);
    }
    if (rows.length === 0) return setError('Add at least one room type.');
    setBusy(true);
    setError('');
    try {
      await api.ownerSaveRooms({ types: rows.map((r) => ({ id: r.id, name: r.name.trim(), rate: Number(r.rate), rooms: r.rooms })) });
      await load();
      setNotice('Rooms and rates saved.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="st-count"><b>{count} of {limit} rooms used</b></p>
      <div className="st-bar" role="progressbar" aria-valuemin="0" aria-valuemax={limit} aria-valuenow={count} aria-label="Rooms used">
        <i style={{ width: `${Math.min(100, (count / limit) * 100)}%` }} />
      </div>
      <p className="k">Your plan covers {limit} rooms. To add more, contact your account manager.</p>
      <p className="k">Change a rate any time. New reservations use the new rate. Bookings already made keep the price they were made at.</p>

      <div className="ow-panel st-card wide">
        <h2 className="st-h">Room types and rates</h2>
        {rows.map((r) => (
          <div key={r.key}>
            <div className="st-trow">
              <label>Room type<input value={r.name} maxLength={30} onChange={(e) => patch(r.key, { name: e.target.value, msg: '' })} /></label>
              <label>Rate per night (&#8377;)<input type="number" min="1" max="99999" value={r.rate} onChange={(e) => patch(r.key, { rate: e.target.value })} /></label>
              <button type="button" className="icon" onClick={() => removeType(r)} aria-label={`Remove ${r.name || 'room type'}`}>&times;</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn alt" onClick={() => setRows([...rows, { key: key(), id: null, name: '', rate: '', rooms: [], adding: '', msg: '' }])}>+ Add room type</button>
      </div>

      <h2 className="st-h2">Room numbers</h2>
      {rows.map((r) => (
        <form key={r.key} className="ow-panel st-card wide" onSubmit={(e) => { e.preventDefault(); addRooms(r); }}>
          <div><b className="st-type">{r.name || 'New room type'}</b> {Number(r.rate) > 0 && <span className="k">{inr(Number(r.rate))} per night</span>}</div>
          <div className="st-chips">
            {r.rooms.length === 0 && <span className="k">No rooms yet.</span>}
            {r.rooms.map((n) => (
              <span key={n} className="st-chip">{n}
                <button type="button" aria-label={`Remove room ${n}`} onClick={() => patch(r.key, { rooms: r.rooms.filter((x) => x !== n), msg: '' })}>&times;</button>
              </span>
            ))}
          </div>
          <div className="st-add">
            <input value={r.adding} onChange={(e) => patch(r.key, { adding: e.target.value, msg: '' })} placeholder="Room numbers, for example 101–104, 107" aria-label={`Add rooms to ${r.name || 'this room type'}`} />
            <button className="btn alt">Add</button>
          </div>
          {r.msg && <p className="error" role="alert">{r.msg}</p>}
        </form>
      ))}

      <div aria-live="polite">
        {error && <p className="error" role="alert">{error}</p>}
        {notice && <p className="notice">{notice}</p>}
      </div>
      <button className="btn" onClick={save} disabled={!dirty || busy}>{busy ? 'Saving...' : 'Save rooms and rates'}</button>
    </>
  );
}
