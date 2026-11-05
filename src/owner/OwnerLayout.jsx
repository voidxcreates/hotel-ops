import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import ConfirmDialog from '../components/ConfirmDialog';
import './owner.css';

const LINKS = [
  ['front-desk', 'Front desk'],
  ['dashboard', 'Dashboard'],
  ['guests', 'Guests'],
  ['reports', 'Reports'],
  ['settings', 'Settings'],
];

export default function OwnerLayout() {
  const { user, logout } = useAuth();
  const [askOut, setAskOut] = useState(false);

  return (
    <div className="ow-shell">
      <aside className="ow-side">
        <div className="ow-brand">
          <b>Hotel Ops</b>
          <span>{user?.hotelName || 'Your hotel'}</span>
        </div>
        <nav className="ow-nav" aria-label="Owner menu">
          {LINKS.map(([path, label]) => (
            <NavLink key={path} to={`/owner/${path}`} className={({ isActive }) => 'ow-link' + (isActive ? ' active' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="ow-out" onClick={() => setAskOut(true)}>Sign out</button>
      </aside>

      <main className="ow-main"><Outlet /></main>

      {askOut && (
        <ConfirmDialog title="Sign out?" confirmLabel="Sign out" onConfirm={logout} onCancel={() => setAskOut(false)}>
          <p>You will need to sign in again to see your hotel.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
