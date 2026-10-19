import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import SignOut from '../components/SignOut';
import { day } from '../util';
import { ownerApi } from './ownerApi';
import { OwnerContext } from './ownerContext';
import Dashboard from './pages/Dashboard';
import MyHotel from './pages/MyHotel';
import Staff from './pages/Staff';
import Subscription from './pages/Subscription';
import './owner.css';

const LINKS = [
  ['/', 'Dashboard', true],
  ['/hotel', 'My hotel', false],
  ['/subscription', 'Subscription', false],
  ['/staff', 'Staff and access', false],
];

// Shown on every page when the plan is about to end, has ended, or the hotel is suspended.
function PlanBanner({ hotel }) {
  const left = new Date(hotel.planEndsAt) - Date.now();
  if (hotel.status === 'SUSPENDED') {
    return <div className="banner bad" role="alert">Your hotel is suspended. Please contact your account manager.</div>;
  }
  if (left <= 0) {
    return <div className="banner bad" role="alert">Your plan ended on {day(hotel.planEndsAt)}. Please renew so your team can keep working.</div>;
  }
  if (left <= 7 * 864e5) {
    return (
      <div className="banner warn">
        Your plan ends in {Math.ceil(left / 864e5)} day{Math.ceil(left / 864e5) > 1 ? 's' : ''}, on {day(hotel.planEndsAt)}.{' '}
        <NavLink to="/subscription">See how to renew</NavLink>
      </div>
    );
  }
  return null;
}

export default function OwnerApp() {
  const [hotel, setHotel] = useState(null);
  const [access, setAccess] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const [h, a] = await Promise.all([ownerApi.hotel(), ownerApi.access()]);
      setHotel(h);
      setAccess(a);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <>
      <header className="top">
        <div className="brand">
          <b>Hotel Ops</b>
          {hotel && <span className="k">{hotel.name}</span>}
        </div>
        <SignOut />
      </header>
      <nav className="onav" aria-label="Owner sections">
        {LINKS.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
      </nav>
      <main className="wrap">
        {error && <p className="error" role="alert">{error} <button className="link" onClick={reload}>Try again</button></p>}
        {!hotel && !error && <p className="k">Loading...</p>}
        {hotel && access && (
          <OwnerContext.Provider value={{ hotel, access, setAccess, reload }}>
            <PlanBanner hotel={hotel} />
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="hotel" element={<MyHotel />} />
              <Route path="subscription" element={<Subscription />} />
              <Route path="staff" element={<Staff />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </OwnerContext.Provider>
        )}
      </main>
    </>
  );
}
