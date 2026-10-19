import Modal from './Modal';

export default function ConfirmDialog({
  title, children, confirmLabel = 'Confirm', danger = false, busy = false, error = '', onConfirm, onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel} locked={busy}>
      <div>{children}</div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions end">
        <button className="btn alt sm" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={`btn sm${danger ? ' danger' : ''}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Please wait...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
