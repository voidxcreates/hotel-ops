import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import NotificationBell from './components/NotificationBell';
import SignOut from './components/SignOut';
import OwnerApp from './owner/OwnerApp';
import Hotels from './pages/Hotels';
import Login from './pages/Login';

// Lets ADMIN and OWNER accounts in. Anyone else sees a short message.
function Guard({ children }) {
  const { user, ready, logout } = useAuth();
  if (!ready) return <p className="center">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
    return (
      <div className="center">
        <h1>No access</h1>
        <p>This account cannot use this app yet.</p>
        <button className="btn" onClick={logout}>Sign out</button>
      </div>
    );
  }
  return children;
}

function AdminShell({ children }) {
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
        <SignOut />
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}

// One app, two areas: the role in the login response decides which one opens.
function Home() {
  const { user } = useAuth();
  return user.role === 'OWNER' ? <OwnerApp /> : <AdminShell><Hotels /></AdminShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<Guard><Home /></Guard>} />
    </Routes>
  );
}
