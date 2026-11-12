import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import { digits, isPhone } from '../util';
import IdPhoto from './IdPhoto';
import { dayFull } from './dates';
import { ID_TYPES, PURPOSES, cleanId } from './idTypes';

const MAX_PHOTO = 8 * 1024 * 1024;
const BLANK = {
  fullName: '', phone: '', email: '', address: '', city: '', state: '', pin: '', idType: 'AADHAAR', idNumber: '',
  adults: 1, children: 0, comingFrom: '', goingTo: '', purpose: 'Tourism', vehicle: '', foreign: false,
};

// One side of the ID: shows the photo on file or the new one, with "Take photo" and "Gallery" buttons.
function PhotoPicker({ label, has, existingUrl, file, onPick }) {
  const [preview, setPreview] = useState(null);
  const cam = useRef(null);
  const gal = useRef(null);
  useEffect(() => {
    if (!file) { setPreview(null); return undefined; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const pick = (e) => { const x = e.target.files?.[0]; if (x) onPick(x); e.target.value = ''; };
  const shown = preview || existingUrl;
  return (
    <div className="gs-pick">
      <div className="gs-label">{label} {file || has ? <span className="ow-chip ok">Added</span> : <span className="ow-chip err">Required</span>}</div>
      {file || has
        ? <IdPhoto url={shown} label={`${label} ${file ? '' : '(on file)'}`.trim()} />
        : <div className="gs-empty">No photo yet</div>}
      <div className="actions">
        <button type="button" className="btn alt sm" onClick={() => cam.current.click()}>{file || has ? 'Retake' : 'Take photo'}</button>
        <button type="button" className="btn alt sm" onClick={() => gal.current.click()}>Gallery</button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={gal} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  );
}

// Shared by the Guests screen and the Front desk booking panel. Loads and saves by booking id.
export default function CheckInDetails({ bookingId, onClose, onSaved }) {
  const [info, setInfo] = useState(null);
  const [f, setF] = useState(BLANK);
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [urls, setUrls] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    let live = true;
    api.ownerCheckInDetails(bookingId).then(async (r) => {
      if (!live) return;
      const d = r.details || {};
      setInfo(r);
      setF({
        ...BLANK, ...d, fullName: r.booking.guestName, phone: r.booking.phone || '',
        idType: r.identity?.type || 'AADHAAR', idNumber: '',
      });
      for (const side of ['front', 'back']) {
        if (r.identity?.[side === 'front' ? 'hasFront' : 'hasBack']) {
          api.ownerIdPhoto(bookingId, side).then((u) => live && setUrls((x) => ({ ...x, [side]: u }))).catch(() => {});
        }
      }
    }).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [bookingId]);

  if (!info) {
    return <Modal title="Check-in details" onClose={onClose}>{error ? <p className="error" role="alert">{error}</p> : <p className="ow-empty">Loading...</p>}</Modal>;
  }

  const type = ID_TYPES[f.idType];
  const sameType = info.identity?.type === f.idType;
  const hasFront = !!front || (sameType && info.identity.hasFront);
  const hasBack = !!back || (sameType && info.identity.hasBack);
  const tooBig = (x) => x && x.size > MAX_PHOTO;

  function pickPhoto(side, file) {
    if (!file.type.startsWith('image/')) { setError('Choose a photo (an image file).'); return; }
    if (tooBig(file)) { setError('That photo is bigger than 8 MB. Take it again or pick a smaller one.'); return; }
    setError('');
    (side === 'front' ? setFront : setBack)(file);
  }

  async function submit(e) {
    e.preventDefault();
    const id = cleanId(f.idNumber);
    const adults = Number(f.adults);
    const children = Number(f.children);
    if (!f.fullName.trim()) return setError('Enter the full name.');
    if (!isPhone(f.phone)) return setError('Phone must be exactly 10 digits.');
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return setError('That email does not look right.');
    if (!f.address.trim()) return setError('Enter the home address.');
    if (!f.city.trim() || !f.state.trim()) return setError('Enter the city and the state.');
    if (f.pin && !/^\d{6}$/.test(f.pin)) return setError('PIN code must be 6 digits.');
    if (id ? !type.test(id) : !sameType) return setError(id ? `${type.label} number: ${type.hint}` : `Enter the ${type.label} number.`);
    if (type.photos && !hasFront) return setError('The front photo of the ID is required.');
    if (type.photos && !hasBack) return setError('The back photo of the ID is required.');
    if (!Number.isInteger(adults) || adults < 1 || adults > 10) return setError('Adults must be 1 to 10.');
    if (!Number.isInteger(children) || children < 0 || children > 10) return setError('Children must be 0 to 10.');
    if (!f.comingFrom.trim()) return setError('Enter where the guest is coming from.');
    setBusy(true);
    setError('');
    try {
      await api.ownerSaveCheckInDetails(bookingId, {
        fullName: f.fullName.trim(), phone: f.phone, email: f.email.trim(), address: f.address.trim(), city: f.city.trim(),
        state: f.state.trim(), pin: f.pin, idType: f.idType, idNumber: id, adults, children,
        comingFrom: f.comingFrom.trim(), goingTo: f.goingTo.trim(), purpose: f.purpose, vehicle: f.vehicle.trim(), foreign: f.foreign,
      });
      if (type.photos && front) await api.ownerUploadIdPhoto(bookingId, 'front', front);
      if (type.photos && back) await api.ownerUploadIdPhoto(bookingId, 'back', back);
      onSaved('Check-in details saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const b = info.booking;
  return (
    <Modal title="Check-in details" wide onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p className="k">Room {b.room} · {dayFull(b.checkIn)} to {dayFull(b.checkOut)} · {b.nights} {b.nights === 1 ? 'night' : 'nights'}</p>

        <h3 className="gs-h">Guest</h3>
        <div className="fields">
          <label>Full name<input value={f.fullName} onChange={set('fullName')} autoFocus /></label>
          <label>Phone number<input value={f.phone} inputMode="numeric" onChange={(e) => setF({ ...f, phone: digits(e.target.value, 10) })} /></label>
        </div>
        <label>Email (optional)<input type="email" value={f.email} onChange={set('email')} /></label>
        <label>Home address<input value={f.address} onChange={set('address')} /></label>
        <div className="fields">
          <label>City or town<input value={f.city} onChange={set('city')} /></label>
          <label>State<input value={f.state} onChange={set('state')} /></label>
        </div>
        <label>PIN code (optional)<input value={f.pin} inputMode="numeric" onChange={(e) => setF({ ...f, pin: digits(e.target.value, 6) })} /></label>

        <fieldset className="gs-fs">
          <legend className="gs-h">Identity document</legend>
          <div className="gs-radios">
            {Object.entries(ID_TYPES).map(([k, v]) => (
              <label key={k} className={`gs-radio${f.idType === k ? ' on' : ''}`}>
                <input type="radio" name="idType" checked={f.idType === k} onChange={() => setF({ ...f, idType: k, idNumber: '' })} />
                {v.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label>ID number
          <input value={f.idNumber} onChange={set('idNumber')} autoComplete="off"
            placeholder={sameType ? `Leave blank to keep the one ending ${info.identity.last4}` : ''} />
          <span className="k">{type.hint} Only the last 4 are shown on screen later.</span>
        </label>

        {type.photos ? (
          <div className="gs-photos2">
            <PhotoPicker label="ID front" has={sameType && info.identity.hasFront} existingUrl={urls.front} file={front} onPick={(x) => pickPhoto('front', x)} />
            <PhotoPicker label="ID back" has={sameType && info.identity.hasBack} existingUrl={urls.back} file={back} onPick={(x) => pickPhoto('back', x)} />
          </div>
        ) : (
          <p className="k">For Aadhaar we keep only the type and the last 4 digits. Check the card in person; no photo is taken or stored.</p>
        )}
        {type.photos && <p className="k">Photos are stored encrypted. Only the owner can view them.</p>}

        <h3 className="gs-h">Stay</h3>
        <div className="fields">
          <label>Adults<input type="number" min="1" max="10" value={f.adults} onChange={set('adults')} /></label>
          <label>Children<input type="number" min="0" max="10" value={f.children} onChange={set('children')} /></label>
          <label>Coming from<input value={f.comingFrom} onChange={set('comingFrom')} /></label>
          <label>Going to (optional)<input value={f.goingTo} onChange={set('goingTo')} /></label>
          <label>Purpose of visit
            <select value={f.purpose} onChange={set('purpose')}>{PURPOSES.map((p) => <option key={p}>{p}</option>)}</select>
          </label>
          <label>Vehicle number (optional)<input value={f.vehicle} onChange={set('vehicle')} /></label>
        </div>
        <label className="gs-check"><input type="checkbox" checked={f.foreign} onChange={(e) => setF({ ...f, foreign: e.target.checked })} /> Foreign guest</label>
        {f.foreign && <p className="k">Foreign guests usually have to be reported to the authorities as well. Use Passport as the ID.</p>}

        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions end">
          <button type="button" className="btn alt" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
