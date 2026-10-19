import { useEffect, useId, useRef } from 'react';

// Uses the browser's built-in <dialog>: focus stays inside, and Escape closes it.
// locked: while true (for example when saving), the popup cannot be closed.
export default function Modal({ title, onClose, wide = false, locked = false, children }) {
  const ref = useRef(null);
  const pressedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d.open) d.showModal();
    // Put the cursor in the first box marked data-autofocus (for example the reason box).
    d.querySelector('[data-autofocus]')?.focus();
    return () => { if (d.open) d.close(); };
  }, []);

  const close = () => { if (!locked) onClose(); };

  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); close(); }}
      // Close on a backdrop click only if the mouse was pressed AND released there,
      // so dragging a text selection out of a box does not close the popup.
      onMouseDown={(e) => { pressedOnBackdrop.current = e.target === ref.current; }}
      onClick={(e) => { if (pressedOnBackdrop.current && e.target === ref.current) close(); }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button className="icon" onClick={close} disabled={locked} aria-label="Close">&times;</button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}