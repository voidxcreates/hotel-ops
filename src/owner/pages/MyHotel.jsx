import { useState } from 'react';
import HotelForm from '../../components/HotelForm';
import Modal from '../../components/Modal';
import { day } from '../../util';
import { ownerApi } from '../ownerApi';
import { useOwner } from '../ownerContext';

function Item({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children || '-'}</dd>
    </div>
  );
}

export default function MyHotel() {
  const { hotel: h, reload } = useOwner();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');

  return (
    <>
      <div className="pagehead">
        <h1>My hotel</h1>
        <button className="btn sm" onClick={() => { setNotice(''); setEditing(true); }}>Edit details</button>
      </div>
      <div aria-live="polite">{notice && <p className="notice">{notice}</p>}</div>

      <div className="card">
        <div className="sec">Hotel</div>
        <dl className="dl">
          <Item label="Name">{h.name}</Item>
          <Item label="Address">{[h.addressLine, h.city, [h.state, h.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</Item>
          <Item label="Rooms">{h.roomCount}</Item>
          <Item label="Joined on">{day(h.joinedAt)}</Item>
        </dl>
        <div className="sec">Owner</div>
        <dl className="dl">
          <Item label="Name">{h.owner?.name}</Item>
          <Item label="Phone">{h.owner?.phone}</Item>
          <Item label="Email">{h.owner?.email}</Item>
        </dl>
        <div className="sec">Receptionists</div>
        {h.receptionists.length === 0 && <p className="k">None added.</p>}
        {h.receptionists.map((r, i) => (
          <dl className="dl" key={i}>
            <Item label={`Receptionist ${i + 1}`}>{r.name}</Item>
            <Item label="Phone">{r.phone}</Item>
          </dl>
        ))}
        <p className="k">The number of rooms and your plan are managed by your account manager.</p>
      </div>

      {editing && (
        <Modal title="Edit hotel details" wide onClose={() => setEditing(false)}>
          <p className="k">Your account manager is told when you change these details.</p>
          <HotelForm
            mode="edit"
            lockRooms
            plans={[]}
            initial={h}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSubmit={async (body) => {
              const { roomCount, ...allowed } = body; // owners cannot change the room count
              await ownerApi.updateHotel(allowed);
              setEditing(false);
              setNotice('Saved. Your account manager has been notified.');
              await reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
