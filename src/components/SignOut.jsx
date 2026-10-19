import { useState } from 'react';
import { useAuth } from '../auth';
import ConfirmDialog from './ConfirmDialog';

// Sign-out icon with a confirmation popup. Used by both the admin and owner headers.
export default function SignOut() {
  const { logout } = useAuth();
  const [ask, setAsk] = useState(false);
  return (
    <>
      <button className="icon" onClick={() => setAsk(true)} aria-label="Sign out" title="Sign out">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
      {ask && (
        <ConfirmDialog title="Sign out?" confirmLabel="Sign out" onConfirm={logout} onCancel={() => setAsk(false)}>
          <p>You will need to sign in again.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
