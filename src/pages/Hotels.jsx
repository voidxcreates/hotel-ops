import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import Countdown from '../components/Countdown';
import HotelForm from '../components/HotelForm';
import HotelModal from '../components/HotelModal';
import Modal from '../components/Modal';
import { addMonths, day, inr } from '../util';
import { useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 10;

function Stat({ label, value }) {
  return (
    <div className="card">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}

export default function Hotels() {
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({ items: [], total: 0 });
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [version, setVersion] = useState(0); // bump to make the open popup reload
  const [ask, setAsk] = useState(null); // confirmation popup: { kind, hotel, code }
  const [askBusy, setAskBusy] = useState(false);
  const [askError, setAskError] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState([]); // owner edits waiting for the admin to see
  const [params, setParams] = useSearchParams();
useEffect(() => {
  const id = params.get('hotel');
  if (id) { setOpenId(Number(id)); setParams({}, { replace: true }); }
}, [params, setParams]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, h] = await Promise.all([api.summary(), api.hotels({ search, status, plan, page, size: PAGE_SIZE })]);
      setSummary(s);
      setData(h);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, plan, page]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => { api.plans().then(setPlans).catch((e) => setError(e.message)); }, []);
  useEffect(() => { load(); }, [load]);

  // Check for owner edits every 20 seconds (a real backend could push these instead).
  const seen = useRef('');
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const n = await api.notifications();
        if (!alive) return;
        setNotes(n);
        const key = n.map((x) => x.id).join(',');
        if (key !== seen.current) { seen.current = key; if (n.length) { loadRef.current(); setVersion((v) => v + 1); } }
      } catch { /* try again on the next tick */ }
    };
    poll();
    const t = setInterval(poll, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  

  const standard = plans.find((p) => p.code === 'STANDARD');

  async function confirm() {
    const { kind, hotel: h, code } = ask;
if (kind === 'status' && !reason.trim()) {
  setAskError('Please write a reason.');
  return;
}
setAskBusy(true);

    setAskError('');
    try {
      let msg;
      if (kind === 'status') {
        const next = h.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        await api.setStatus(h.id, next, reason.trim());
        msg = `${h.name} is now ${next === 'ACTIVE' ? 'active' : 'suspended'}.`;
      } else if (kind === 'plan') {
        await api.setPlan(h.id, code);
        msg = `${h.name} moved to the ${plans.find((p) => p.code === code).name} plan.`;
      } else {
        await api.renew(h.id);
        msg = `${h.name} renewed for 1 month.`;
      }
      setAsk(null);
      setVersion((v) => v + 1);
      await load();
      setNotice(msg);
    } catch (e) {
      setAskError(e.message);
    } finally {
      setAskBusy(false);
    }
  }
  const reasonField = (placeholder) => (
  <label>
    Reason (required)
    <textarea
      className="reason"
      data-autofocus
      rows={3}
      maxLength={300}
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      placeholder={placeholder}
    />
    <span className="k">{reason.length}/300</span>
  </label>
);

  function renderAsk() {
    const { kind, hotel: h, code } = ask;
    const rate = standard ? standard.pricePerRoom : 0;
    const ended = new Date(h.planEndsAt) <= new Date();
    if (kind === 'status' && h.status === 'ACTIVE') {
      return (
        <ConfirmDialog title="Suspend this hotel?" confirmLabel="Suspend" danger busy={askBusy} error={askError} onConfirm={confirm} onCancel={() => setAsk(null)}>
          <p><b>{h.name}</b> will be suspended. Its staff will not be able to sign in until you activate it again.</p>
            {reasonField('For example: payment not received')}
        </ConfirmDialog>
      );
    }
    if (kind === 'status') {
      return (
        <ConfirmDialog title="Activate this hotel?" confirmLabel="Activate" busy={askBusy} error={askError} onConfirm={confirm} onCancel={() => setAsk(null)}>
          <p>Do you want to activate <b>{h.name}</b>? Its staff will be able to sign in again.</p>
          {ended && <p className="k">Its plan ended on {day(h.planEndsAt)}. Renew it too once payment is received.</p>}
            {reasonField('For example: payment received')}
        </ConfirmDialog>
      );
    }
    if (kind === 'plan') {
      const ends = addMonths(new Date().toISOString(), 1);
      return (
        <ConfirmDialog title="Change plan?" confirmLabel="Move to Standard" busy={askBusy} error={askError} onConfirm={confirm} onCancel={() => setAsk(null)}>
          <p>Move <b>{h.name}</b> to the {plans.find((p) => p.code === code).name} plan?</p>
          <p>{h.roomCount} rooms x {inr(rate)} = <b>{inr(h.roomCount * rate)}</b> a month. The subscription starts today and ends on <b>{day(ends)}</b>. Confirm once payment is received.</p>
        </ConfirmDialog>
      );
    }
    const base = Math.max(Date.now(), new Date(h.planEndsAt).getTime());
    return (
      <ConfirmDialog title="Renew for 1 month?" confirmLabel="Renew" busy={askBusy} error={askError} onConfirm={confirm} onCancel={() => setAsk(null)}>
        <p>The plan for <b>{h.name}</b> will end on <b>{day(addMonths(new Date(base).toISOString(), 1))}</b>.</p>
        <p>Confirm only after you have received <b>{inr(h.monthlyAmount)}</b>.</p>
      </ConfirmDialog>
    );
  }

const ask_ = (a) => { setAskError(''); setReason(''); setAsk(a); };  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <>
      <h1>Hotels</h1>
      <div className="cards">
        <Stat label="Hotels" value={summary ? summary.totalHotels : '-'} />
        <Stat label="Active" value={summary ? summary.activeHotels : '-'} />
        <Stat label="On trial" value={summary ? summary.trialHotels : '-'} />
        <Stat label="Ending in 7 days" value={summary ? summary.endingSoon : '-'} />
        <Stat label="Monthly revenue" value={summary ? inr(summary.monthlyRevenue) : '-'} />
      </div>

      <div className="toolbar">
        <label className="grow">Search
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hotel, city or owner" />
        </label>
        <label>Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </label>
        <label>Plan
          <select value={plan} onChange={(e) => { setPlan(e.target.value); setPage(0); }}>
            <option value="">All</option>
            {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </label>
        <button className="btn sm" onClick={() => setShowAdd(true)}>Add hotel</button>
      </div>

      <div aria-live="polite">
        {notice && <p className="notice">{notice}</p>}
        {error && <p className="error" role="alert">{error} <button className="link" onClick={load}>Try again</button></p>}
      </div>

      <div className="card tablewrap">
        <table>
          <thead>
            <tr><th>Hotel</th><th>Rooms</th><th>Plan</th><th>Monthly</th><th>Plan ends</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {data.items.map((h) => (
              <tr key={h.id}>
                <td>
                  <button className="linkbtn" onClick={() => setOpenId(h.id)}>{h.name}</button>
                  <div className="k">{h.city}, joined {day(h.joinedAt)}</div>
                </td>
                <td>{h.roomCount}</td>
                <td>
                  <select value={h.plan.code} onChange={(e) => ask_({ kind: 'plan', hotel: h, code: e.target.value })} aria-label={`Plan for ${h.name}`}>
                    {plans.map((p) => (
                      <option key={p.code} value={p.code} disabled={p.code === 'TRIAL' && h.plan.code === 'STANDARD'}>{p.name}</option>
                    ))}
                  </select>
                </td>
                <td>{h.plan.code === 'TRIAL' ? 'Free' : inr(h.monthlyAmount)}</td>
                <td>
                  <Countdown endsAt={h.planEndsAt} />
                  <div className="k">{day(h.planEndsAt)}</div>
                </td>
                <td><span className={`chip${h.status === 'ACTIVE' ? '' : ' warn'}`}>{h.status === 'ACTIVE' ? 'Active' : 'Suspended'}</span></td>
                <td>
                  <button className="btn alt sm" onClick={() => ask_({ kind: 'status', hotel: h })}>
                    {h.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && data.items.length === 0 && <tr><td colSpan="7" className="k">No hotels match these filters.</td></tr>}
          </tbody>
        </table>
        {loading && <p className="k">Loading...</p>}
      </div>

      <div className="pager">
        <button className="btn alt sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="k">Page {page + 1} of {pages}</span>
        <button className="btn alt sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>

      {showAdd && (
        <Modal title="Add a hotel" onClose={() => setShowAdd(false)} wide>
          <HotelForm
            mode="add"
            plans={plans}
            submitLabel="Add hotel"
            onCancel={() => setShowAdd(false)}
            onSubmit={async (body) => {
              await api.addHotel(body);
              setShowAdd(false);
              setNotice(`${body.name} added.`);
              load();
            }}
          />
        </Modal>
      )}

      {openId && (
        <HotelModal
          id={openId}
          version={version}
          plans={plans}
          onClose={() => setOpenId(null)}
          onSaved={(msg) => { setNotice(msg); setVersion((v) => v + 1); load(); }}
          onStatus={(h) => ask_({ kind: 'status', hotel: h })}
          onRenew={(h) => ask_({ kind: 'renew', hotel: h })}
        />
      )}

      {ask && renderAsk()}

      
    </>
  );
}
