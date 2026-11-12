import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { inr } from '../util';
import GuestModal from './GuestModal';
import { dayFull } from './dates';
import { idText } from './idTypes';
import './guests.css';

function lastStay(s) {
  if (s.kind === 'IN_HOUSE') return 'Staying now';
  return s.kind === 'UPCOMING' ? `Arrives ${dayFull(s.date)}` : dayFull(s.date);
}

export default function Guests() {
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    try { setList(await api.ownerGuests(q.trim())); setError(''); }
    catch (e) { setError(e.message); }
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  return (
    <>
      <div className="fd-top">
        <h1 className="ow-h1">Guests</h1>
        <input className="gs-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone" aria-label="Search guests" />
      </div>
      <div aria-live="polite">
        {notice && <p className="notice">{notice}</p>}
        {error && <p className="error" role="alert">{error} <button className="link" onClick={load}>Try again</button></p>}
      </div>
      <div className="tablewrap gs-card">
        <table className="gs-table">
          <thead>
            <tr><th>Guest</th><th>Phone</th><th>ID</th><th>Last stay</th><th>Stays</th><th>Total spent</th><th>Balance due</th></tr>
          </thead>
          <tbody>
            {!list && !error && <tr><td colSpan="7" className="ow-empty">Loading...</td></tr>}
            {list && list.length === 0 && <tr><td colSpan="7" className="ow-empty">No guests found.</td></tr>}
            {(list || []).map((g) => (
              <tr key={g.id} className="gs-row" onClick={() => setOpenId(g.id)}>
                <td><button className="linkbtn" onClick={(e) => { e.stopPropagation(); setOpenId(g.id); }}>{g.name}</button></td>
                <td>{g.phone.replace(/^(\d{5})(\d+)$/, '$1 $2')}</td>
                <td>{g.identity ? <span className="ow-chip ok">{idText(g.identity)}</span> : <span className="ow-chip err">Missing</span>}</td>
                <td>{lastStay(g.lastStay)}</td>
                <td>{g.stays}</td>
                <td>{inr(g.totalSpent)}</td>
                <td>{g.balanceDue > 0 ? <span className="ow-chip err">{inr(g.balanceDue)}</span> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openId && <GuestModal key={openId} guestId={openId} onClose={() => setOpenId(null)} onChanged={(m) => { setNotice(m); load(); }} />}
    </>
  );
}
