import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Countdown from '../../components/Countdown';
import { day, inr } from '../../util';
import DetailsModal from '../DetailsModal';
import { ownerApi } from '../ownerApi';
import { useOwner } from '../ownerContext';

const Stat = ({ label, value, sub }) => (
  <div className="card">
    <div className="k">{label}</div>
    <div className="v">{value}</div>
    {sub && <div className="k">{sub}</div>}
  </div>
);

const weekday = (i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
};

export default function Dashboard() {
  const { hotel } = useOwner();
  const [s, setS] = useState(null);
  const [state, setState] = useState('loading'); // loading, ready, empty, error
  const [error, setError] = useState('');
  const [details, setDetails] = useState(false);

  useEffect(() => {
    let alive = true;
    ownerApi.summary()
      .then((d) => { if (alive) { setS(d); setState('ready'); } })
      .catch((e) => {
        if (!alive) return;
        if (e.status === 404) setState('empty');
        else { setError(e.message); setState('error'); }
      });
    return () => { alive = false; };
  }, []);

  const occupancy = s ? Math.round((s.roomsOccupied / hotel.roomCount) * 100) : 0;
  const max = s ? Math.max(1, ...s.weekCheckIns) : 1;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Dashboard</h1>
          <div className="k">{day(new Date().toISOString())}</div>
        </div>
      </div>

      {state === 'loading' && <p className="k">Loading...</p>}
      {state === 'error' && <p className="error" role="alert">{error}</p>}
      {state === 'empty' && (
        <div className="card">
          <b>Your numbers will appear here.</b>
          <p className="k">Once your receptionist starts recording check-ins, you will see rooms, collections, and balances for today.</p>
        </div>
      )}

      {state === 'ready' && (
        <>
          <div className="cards">
            <Stat label="Rooms free" value={s.roomsFree} sub={`of ${hotel.roomCount}`} />
            <Stat label="Occupied" value={s.roomsOccupied} sub={`${occupancy}% occupancy`} />
            <Stat label="Needs cleaning" value={s.roomsCleaning} />
            <Stat label="Check-ins today" value={s.checkInsToday} />
            <Stat label="Collected today" value={inr(s.collectedToday)} />
            <Stat label="Balance due" value={inr(s.balanceDue)} />
          </div>
          <div className="card">
            <div className="pagehead">
              <b>Check-ins in the last 7 days</b>
              <button className="btn alt sm" onClick={() => setDetails(true)}>Details</button>
            </div>
            <div className="bars" role="img" aria-label={`Check-ins in the last 7 days: ${s.weekCheckIns.join(', ')}`}>
              {s.weekCheckIns.map((n, i) => (
                <div className="bar" key={i}>
                  <b>{n}</b>
                  <div className="fill" style={{ height: `${(n / max) * 100}%` }} />
                  <span className="k">{weekday(i)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="card">
        <div className="pagehead">
          <b>Your plan</b>
          <Link to="/subscription">Details</Link>
        </div>
        <p>
          <span className="chip">{hotel.plan.name}</span>{' '}
          <Countdown endsAt={hotel.planEndsAt} />
        </p>
        <div className="k">Ends on {day(hotel.planEndsAt)}</div>
      </div>

      {details && <DetailsModal onClose={() => setDetails(false)} />}
    </>
  );
}
