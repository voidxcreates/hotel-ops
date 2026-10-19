import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ownerApi } from '../ownerApi';
import { useOwner } from '../ownerContext';

const ITEMS = [
  ['viewHistory', 'View guest history', 'See past guests and their stays'],
  ['editCheckins', 'Create and edit check-ins', 'Record arrivals, departures, and payments'],
  ['deleteRecords', 'Delete guest records', 'Remove a guest record for good'],
  ['seeRevenue', 'See revenue and payments', 'Show money totals to receptionists'],
  ['exportData', 'Export data', 'Download guest lists'],
];

export default function Staff() {
  const { hotel, access, setAccess } = useOwner();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function toggle(key) {
    const before = access;
    const next = { ...access, [key]: !access[key] };
    setAccess(next); // show the change straight away, undo it if saving fails
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await ownerApi.setAccess(next);
      setNotice('Saved.');
    } catch (e) {
      setAccess(before);
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <div className="pagehead"><h1>Staff and access</h1></div>
      <div className="two">
        <div className="card">
          <h2>Receptionists</h2>
          {hotel.receptionists.length === 0 && <p className="k">No receptionist added. Small hotels can run without one.</p>}
          <ul className="reclist">
            {hotel.receptionists.map((r, i) => (
              <li key={i}><b>{r.name}</b><span>{r.phone}</span></li>
            ))}
          </ul>
          <p><Link to="/hotel">Change receptionists</Link></p>
        </div>

        <div className="card">
          <h2>What receptionists can do</h2>
          <p className="k">These settings apply to every receptionist of your hotel.</p>
          {ITEMS.map(([key, label, hint]) => (
            <label className="prow" key={key}>
              <input type="checkbox" checked={!!access[key]} disabled={busy === key} onChange={() => toggle(key)} />
              <span><b>{label}</b><small>{hint}</small></span>
            </label>
          ))}
          <div aria-live="polite">
            {notice && <p className="notice">{notice}</p>}
            {error && <p className="error" role="alert">{error}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
