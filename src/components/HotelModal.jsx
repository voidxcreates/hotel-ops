import { useEffect, useState } from 'react';
import { api } from '../api';
import { day, inr } from '../util';
import Modal from './Modal';
import Countdown from './Countdown';
import HotelForm from './HotelForm';

function Item({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children || '-'}</dd>
    </div>
  );
}

// Popup with two tabs: Details (read only) and Edit.
export default function HotelModal({ id, version, plans, onClose, onSaved, onStatus, onRenew }) {
  const [hotel, setHotel] = useState(null);
  const [tab, setTab] = useState('details');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.hotel(id).then((h) => alive && setHotel(h)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [id, version]);

  const h = hotel;
  return (
    <Modal title={h ? h.name : 'Hotel'} onClose={onClose} wide>
      {error && <p className="error" role="alert">{error}</p>}
      {!h && !error && <p className="k">Loading...</p>}
      {h && (
        <>
          <div className="tabs" role="tablist">
            {[['details', 'Details'], ['edit', 'Edit']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} className="tab" onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {tab === 'details' ? (
            <>
              <p>
                <span className={`chip${h.status === 'ACTIVE' ? '' : ' warn'}`}>{h.status === 'ACTIVE' ? 'Active' : 'Suspended'}</span>
                {' '}<span className="chip mut">{h.plan.name} plan</span>
              </p>
              <div className="sec">Hotel</div>
              <dl className="dl">
                <Item label="Address">{[h.addressLine, h.city, [h.state, h.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</Item>
                <Item label="Rooms">{h.roomCount}</Item>
                <Item label="Monthly amount">{h.plan.code === 'TRIAL' ? 'Free during the trial' : `${inr(h.monthlyAmount)} (${h.roomCount} rooms x ${inr(h.plan.pricePerRoom)})`}</Item>
              </dl>
              <div className="sec">Subscription</div>
              <dl className="dl">
                <Item label="Joined on">{day(h.joinedAt)}</Item>
                <Item label="Plan ends on">{day(h.planEndsAt)}</Item>
                <Item label="Time left"><Countdown endsAt={h.planEndsAt} seconds /></Item>
              </dl>
              <div className="sec">Owner</div>
              <dl className="dl">
                <Item label="Name">{h.owner?.name}</Item>
                <Item label="Phone">{h.owner?.phone}</Item>
                <Item label="Email">{h.owner?.email}</Item>
              </dl>
              <div className="sec">Receptionist</div>
              <dl className="dl">
                <Item label="Name">{h.receptionist?.name}</Item>
                <Item label="Phone">{h.receptionist?.phone}</Item>
              </dl>
              <div className="actions end">
                {h.plan.code === 'STANDARD' && <button className="btn alt sm" onClick={() => onRenew(h)}>Renew 1 month</button>}
                <button className="btn alt sm" onClick={() => onStatus(h)}>{h.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</button>
                <button className="btn sm" onClick={onClose}>Close</button>
              </div>
            </>
          ) : (
            <HotelForm
              mode="edit"
              plans={plans}
              initial={h}
              submitLabel="Save changes"
              onCancel={() => setTab('details')}
              onSubmit={async (body) => {
                await api.updateHotel(id, body);
                onSaved(`${body.name} updated.`);
                setTab('details');
              }}
            />
          )}
        </>
      )}
    </Modal>
  );
}
