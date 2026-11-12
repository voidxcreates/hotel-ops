// One ID photo. With no real image (sample data) it draws a placeholder card.
export default function IdPhoto({ url, label, onOpen }) {
  const body = url
    ? <img src={url} alt={label} />
    : <div className="gs-sample" aria-hidden="true"><i /><span /><span /><span /></div>;
  if (!onOpen) return <div className="gs-photo">{body}<small>{label}</small></div>;
  return (
    <button type="button" className="gs-photo" onClick={() => onOpen(url)} aria-label={`Open ${label} larger`}>
      {body}<small>{label}</small>
    </button>
  );
}
