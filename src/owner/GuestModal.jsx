import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import { inr } from '../util';
import CheckInDetails from './CheckInDetails';
import IdPhoto from './IdPhoto';
import { dayFull } from './dates';
import { ID_TYPES, idText, maskedId } from './idTypes';

const dash = (v) => (v === '' || v == null ? '-' : v);

export default function GuestModal({ guestId, canDelete = true, onClose, onChanged }) {
  const [g, setG] = useState(null);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState({});
  const [zoom, setZoom] = useState(null);
  const [editing, setEditing] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const r = await api.ownerGuest(guestId);
      setG(r);
      setError('');
      setPhotos({});
      if (r.identity && ID_TYPES[r.identity.type].photos && r.detailsBookingId) {
        for (const side of ['front', 'back']) {
          if (r.identity[side === 'front' ? 'hasFront' : 'hasBack']) {
            api.ownerIdPhoto(r.detailsBookingId, side).then((u) => setPhotos((x) => ({ ...x, [side]: u || '' }))).catch(() => {});
          }
        }
      }
    } catch (e) {
      setError(e.message);
    }
  }, [guestId]);
  useEffect(() => { load(); }, [load]);

  async function remove() {
    setBusy(true);
    try { await api.ownerDeleteGuest(guestId); onChanged('Guest record deleted.'); onClose(); }
    catch (e) { setError(e.message); setAskDelete(false); }
    finally { setBusy(false); }
  }

  if (!g) {
    return <Modal title="Guest" wide onClose={onClose}>{error ? <p className="error" role="alert">{error}</p> : <p className="ow-empty">Loading...</p>}</Modal>;
  }

  const d = g.details;
  const persons = d && `${d.adults} adult${d.adults === 1 ? '' : 's'}${d.children ? `, ${d.children} child${d.children === 1 ? '' : 'ren'}` : ''}`;
  const items = d ? [
    ['Address', d.address], ['City and state', [d.city, d.state].filter(Boolean).join(', ')],
    ['PIN code', d.pin], ['Email', d.email], ['Persons', persons], ['Purpose', d.purpose],
    ['Coming from', d.comingFrom], ['Going to', d.goingTo], ['Vehicle', d.vehicle], ...(d.foreign ? [['Foreign guest', 'Yes']] : []),
  ] : [];
  const showPhotos = g.identity && ID_TYPES[g.identity.type].photos && (g.identity.hasFront || g.identity.hasBack);

  return (
    <>
      <Modal title={g.name} wide onClose={onClose}>
        <p className="k">{g.phone} · {g.stays} {g.stays === 1 ? 'stay' : 'stays'}</p>
        {error && <p className="error" role="alert">{error}</p>}

        <h3 className="gs-h">Check-in details</h3>
        {d ? (
          <dl className="gs-grid">
            {items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{dash(v)}</dd></div>)}
          </dl>
        ) : <p className="k">Not collected yet. They are filled in when the guest arrives.</p>}

        <h3 className="gs-h">Identity document</h3>
        {g.identity ? (
          <>
            <p><b>{ID_TYPES[g.identity.type].label}</b> · {maskedId(g.identity)}</p>
            {showPhotos ? (
              <>
                <div className="gs-photos">
                  {g.identity.hasFront && <IdPhoto url={photos.front} label="ID front" onOpen={(u) => setZoom({ url: u, label: 'ID front' })} />}
                  {g.identity.hasBack && <IdPhoto url={photos.back} label="ID back" onOpen={(u) => setZoom({ url: u, label: 'ID back' })} />}
                </div>
                <p className="k">Tap a photo to open it larger.</p>
              </>
            ) : <p className="k">Only the type and the last 4 digits are kept. No photo is stored.</p>}
          </>
        ) : <p className="k">No ID recorded.</p>}

        <h3 className="gs-h">Current and upcoming</h3>
        {g.current.length === 0 && <p className="k">None.</p>}
        {g.current.map((c) => (
          <div className="rowx" key={c.bookingId}>
            <span>Room {c.room} · {dayFull(c.checkIn)} to {dayFull(c.checkOut)}</span>
            <button className="btn alt sm" onClick={() => navigate(`/owner/front-desk?booking=${c.bookingId}`)}>Open</button>
          </div>
        ))}
        {g.stays > g.current.length && <p className="k">{g.stays - g.current.length} earlier {g.stays - g.current.length === 1 ? 'stay' : 'stays'}.</p>}

        <p className="gs-total">Total spent: <b>{inr(g.totalSpent)}</b>{g.balanceDue > 0 && <> · Balance due: <b className="error">{inr(g.balanceDue)}</b></>}</p>

        <div className="actions">
          {g.detailsBookingId && <button className="btn alt" onClick={() => setEditing(true)}>{d ? 'Edit check-in details' : 'Add check-in details'}</button>}
          {canDelete && g.canDelete && <button className="btn alt" onClick={() => setAskDelete(true)}>Delete guest record</button>}
        </div>
      </Modal>

      {zoom && (
        <Modal title={zoom.label} wide onClose={() => setZoom(null)}>
          {zoom.url ? <img className="gs-zoom" src={zoom.url} alt={zoom.label} /> : <IdPhoto url={null} label={`${zoom.label} (sample)`} />}
        </Modal>
      )}
      {editing && (
        <CheckInDetails bookingId={g.detailsBookingId} onClose={() => setEditing(false)}
          onSaved={(msg) => { setEditing(false); load(); onChanged(msg); }} />
      )}
      {askDelete && (
        <ConfirmDialog title="Delete guest record?" danger confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setAskDelete(false)}>
          <p>This removes <b>{g.name}</b> together with the ID details. It cannot be undone.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
