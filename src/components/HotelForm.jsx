import { useState } from 'react';
import { addMonths, day, digits, inr, isPhone, todayInput } from '../util';

const MAX_RECEPTIONISTS = 5;

const EMPTY = () => ({
  name: '', addressLine: '', city: '', state: '', pincode: '', roomCount: 10, planCode: 'TRIAL', joinedAt: todayInput(),
  ownerName: '', ownerPhone: '', ownerEmail: '', receptionists: [],
});
const fromHotel = (h) => ({
  name: h.name, addressLine: h.addressLine || '', city: h.city || '', state: h.state || '', pincode: h.pincode || '',
  roomCount: h.roomCount, ownerName: h.owner?.name || '', ownerPhone: h.owner?.phone || '', ownerEmail: h.owner?.email || '',
  receptionists: (h.receptionists || []).map((r) => ({ name: r.name, phone: r.phone })),
});

function Field({ label, error, hint, children }) {
  return (
    <label>
      {label}
      {children}
      {hint && <span className="k">{hint}</span>}
      {error && <span className="fe">{error}</span>}
    </label>
  );
}

// Used for both "Add hotel" (mode="add") and the Edit tab (mode="edit").
export default function HotelForm({ mode, plans, initial, onSubmit, onCancel, submitLabel }) {
  const [f, setF] = useState(() => (initial ? fromHotel(initial) : EMPTY()));
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, max) => (e) => setF({ ...f, [k]: max ? digits(e.target.value, max) : e.target.value });

  const addRec = () => setF({ ...f, receptionists: [...f.receptionists, { name: '', phone: '' }] });
  const removeRec = (i) => setF({ ...f, receptionists: f.receptionists.filter((_, n) => n !== i) });
  const setRec = (i, key, max) => (e) =>
    setF({
      ...f,
      receptionists: f.receptionists.map((r, n) =>
        n === i ? { ...r, [key]: max ? digits(e.target.value, max) : e.target.value } : r
      ),
    });

  function validate() {
    const e = {};
    if (!f.name.trim()) e.name = 'Enter the hotel name';
    if (!f.addressLine.trim()) e.addressLine = 'Enter the address';
    if (!f.city.trim()) e.city = 'Enter the city';
    if (f.pincode && f.pincode.length !== 6) e.pincode = 'Pincode must be 6 digits';
    const rooms = Number(f.roomCount);
    if (!Number.isInteger(rooms) || rooms < 1 || rooms > 500) e.roomCount = 'Rooms must be 1 to 500';
    if (!f.ownerName.trim()) e.ownerName = 'Enter the owner name';
    if (!isPhone(f.ownerPhone)) e.ownerPhone = 'Phone must be exactly 10 digits';
    if (f.ownerEmail && !/^\S+@\S+\.\S+$/.test(f.ownerEmail)) e.ownerEmail = 'Enter a valid email';

    const phones = f.receptionists.map((r) => r.phone);
    const recErrs = f.receptionists.map((r, i) => ({
      name: r.name.trim() ? '' : 'Enter the name',
      phone: !isPhone(r.phone) ? 'Phone must be exactly 10 digits' : phones.indexOf(r.phone) !== i ? 'This number is already added' : '',
    }));
    if (recErrs.some((r) => r.name || r.phone)) e.receptionists = recErrs;
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;
    const body = {
      name: f.name.trim(), addressLine: f.addressLine.trim(), city: f.city.trim(), state: f.state.trim(),
      pincode: f.pincode, roomCount: Number(f.roomCount),
      owner: { name: f.ownerName.trim(), phone: f.ownerPhone, email: f.ownerEmail.trim() },
      receptionists: f.receptionists.map((r) => ({ name: r.name.trim(), phone: r.phone })),
    };
    if (mode === 'add') { body.planCode = f.planCode; body.joinedAt = f.joinedAt; }
    setBusy(true);
    setError('');
    try {
      await onSubmit(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const plan = plans.find((p) => p.code === f.planCode);
  const monthly = plan ? plan.pricePerRoom * (Number(f.roomCount) || 0) : 0;

  return (
    <form onSubmit={submit} noValidate>
      <div className="sec">Hotel</div>
      <div className="fields">
        <Field label="Hotel name" error={errs.name}><input value={f.name} onChange={set('name')} /></Field>
        <Field label="Rooms" error={errs.roomCount}>
          <input type="number" min="1" max="500" value={f.roomCount} onChange={set('roomCount')} />
        </Field>
        <Field label="Address" error={errs.addressLine}><input value={f.addressLine} onChange={set('addressLine')} /></Field>
        <Field label="City" error={errs.city}><input value={f.city} onChange={set('city')} /></Field>
        <Field label="State"><input value={f.state} onChange={set('state')} /></Field>
        <Field label="Pincode" error={errs.pincode}>
          <input value={f.pincode} onChange={set('pincode', 6)} inputMode="numeric" maxLength={6} />
        </Field>
      </div>

      <div className="sec">Owner</div>
      <div className="fields">
        <Field label="Owner name" error={errs.ownerName}><input value={f.ownerName} onChange={set('ownerName')} /></Field>
        <Field label="Owner phone" error={errs.ownerPhone} hint={`${f.ownerPhone.length}/10 digits`}>
          <input value={f.ownerPhone} onChange={set('ownerPhone', 10)} inputMode="numeric" maxLength={10} />
        </Field>
        <Field label="Owner email" error={errs.ownerEmail}>
          <input type="email" value={f.ownerEmail} onChange={set('ownerEmail')} />
        </Field>
      </div>

      <div className="sec">Receptionists (optional)</div>
      {f.receptionists.length === 0 && (
        <p className="k">No receptionist added. Small hotels can skip this.</p>
      )}
      {f.receptionists.map((r, i) => (
        <div className="rec" key={i}>
          <div className="fields">
            <Field label={`Receptionist ${i + 1} name`} error={errs.receptionists?.[i]?.name}>
              <input value={r.name} onChange={setRec(i, 'name')} />
            </Field>
            <Field label="Phone" error={errs.receptionists?.[i]?.phone} hint={`${r.phone.length}/10 digits`}>
              <input value={r.phone} onChange={setRec(i, 'phone', 10)} inputMode="numeric" maxLength={10} />
            </Field>
          </div>
          <button type="button" className="btn alt sm" onClick={() => removeRec(i)} aria-label={`Remove receptionist ${i + 1}`}>
            Remove
          </button>
        </div>
      ))}
      <div className="rec-add">
        <button type="button" className="btn alt sm" onClick={addRec} disabled={f.receptionists.length >= MAX_RECEPTIONISTS}>
          + Add receptionist
        </button>
        <span className="k">{f.receptionists.length} of {MAX_RECEPTIONISTS} added</span>
      </div>

      {mode === 'add' && (
        <>
          <div className="sec">Plan</div>
          <div className="fields">
            <Field label="Plan">
              <select value={f.planCode} onChange={set('planCode')}>
                {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Joining date">
              <input type="date" value={f.joinedAt} onChange={set('joinedAt')} required />
            </Field>
          </div>
          <p className="k">
            Plan ends on <b>{f.joinedAt ? day(addMonths(f.joinedAt + 'T00:00:00', 1)) : '-'}</b> (1 month).
            {' '}Monthly amount: <b>{f.planCode === 'TRIAL' ? 'free during the trial' : inr(monthly)}</b>
          </p>
        </>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="btn sm" disabled={busy}>{busy ? 'Saving...' : submitLabel}</button>
        <button type="button" className="btn alt sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
