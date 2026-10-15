import { useEffect, useId, useRef } from 'react';

// Uses the browser's built-in <dialog>: focus stays inside, and Escape closes it.
export default function Modal({ title, onClose, wide = false, children }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d.open) d.showModal();
    return () => { if (d.open) d.close(); };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button className="icon" onClick={onClose} aria-label="Close">&times;</button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
