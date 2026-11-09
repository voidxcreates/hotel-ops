import { dayFull, diffDays, todayYmd } from './dates';

// What the chip says, from the end date the server sends.
function chip(sub) {
  const days = diffDays(sub.endsOn, todayYmd());
  const trial = sub.status === 'TRIAL' ? 'Trial: ' : '';
  if (sub.status === 'SUSPENDED') return ['err', 'Suspended'];
  if (sub.status === 'EXPIRED' || days < 0) return ['err', 'Expired'];
  if (days === 0) return ['warn', `${trial}Ends today`];
  if (days <= 7) return ['warn', `${trial}Ends in ${days} ${days === 1 ? 'day' : 'days'}`];
  return ['ok', `${trial}Active until ${dayFull(sub.endsOn)}`];
}

export default function SettingsSubscription({ hotel }) {
  const [tone, text] = chip(hotel.subscription);
  const lines = hotel.paymentLines || [];
  return (
    <div className="ow-panel st-card wide">
      <div className="k">Plan</div>
      <div className="st-plan">{hotel.plan.name}, up to {hotel.plan.roomLimit} rooms</div>
      <p><span className={`ow-chip ${tone}`}>{text}</span></p>
      <p>To renew, pay by UPI or bank transfer and send the payment screenshot.{lines.length === 0 && ' The payment details appear here once your account manager adds them.'}</p>
      {lines.length > 0 && <ul className="st-pay">{lines.map((l) => <li key={l}>{l}</li>)}</ul>}
    </div>
  );
}
