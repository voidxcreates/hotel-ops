import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import ConfirmDialog from './components/ConfirmDialog';
import Hotels from './pages/Hotels';
import Login from './pages/Login';
import NotificationBell from './components/NotificationBell';
import OwnerLayout from './owner/OwnerLayout';
import OwnerDashboard from './owner/OwnerDashboard';
import OwnerPlaceholder from './owner/OwnerPlaceholder';

function Guard({ children }) {
  const { user, ready, logout } = useAuth();
  if (!ready) return <p className="center">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'OWNER') return <Navigate to="/owner" replace />;
  if (user.role !== 'ADMIN') {
    return (
      <div className="center">
        <h1>Admins only</h1>
        <p>This console is for platform admins.</p>
        <button className="btn" onClick={logout}>Sign out</button>
      </div>
    );
  }
  return children;
}

function Shell({ children }) {
  const { logout } = useAuth();
  const [askOut, setAskOut] = useState(false);
  return (
    <>
      <header className="top">
        <b className="brand">Hotel Ops Admin</b>
        {import.meta.env.VITE_USE_MOCK === 'true' && (
  <button
    className="ghost"
    onClick={async () => { await api.simulateOwnerEdit(); window.dispatchEvent(new Event('owner-edit')); }}
  >
    Simulate owner edit
  </button>
)}
<NotificationBell />
        <button className="icon" onClick={() => setAskOut(true)} aria-label="Sign out" title="Sign out">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>
      <main className="wrap">{children}</main>
      {askOut && (
        <ConfirmDialog title="Sign out?" confirmLabel="Sign out" onConfirm={logout} onCancel={() => setAskOut(false)}>
          <p>You will need to sign in again to use the admin console.</p>
        </ConfirmDialog>
      )}
    </>
  );
}

function OwnerGuard({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="center">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'OWNER') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Guard><Shell><Hotels /></Shell></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/owner" element={<OwnerGuard><OwnerLayout /></OwnerGuard>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<OwnerDashboard />} />
        <Route path="front-desk" element={<OwnerPlaceholder title="Front desk" />} />
        <Route path="guests" element={<OwnerPlaceholder title="Guests" />} />
        <Route path="reports" element={<OwnerPlaceholder title="Reports" />} />
        <Route path="settings" element={<OwnerPlaceholder title="Settings" />} />
      </Route>
    </Routes>
  );
}
