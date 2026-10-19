import { useState } from 'react';
import Countdown from '../../components/Countdown';
import { day, inr } from '../../util';
import { useOwner } from '../ownerContext';

// Set these in your .env file. They are shown to owners on this page.
const UPI = import.meta.env.VITE_PAY_UPI || '';
const CONTACT = import.meta.env.VITE_SUPPORT_PHONE || '';

export default function Subscription() {
  const { hotel: h } = useOwner();
  const [copied, setCopied] = useState('');

  const trial = h.plan.code === 'TRIAL';
  const ended = new Date(h.planEndsAt) <= new Date();
  const standardMonthly = h.standardPricePerRoom != null ? h.roomCount * h.standardPricePerRoom : null;
  const toPay = trial ? standardMonthly : h.monthlyAmount;
  const month = new Date(h.planEndsAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const note = `${h.name} ${month}`;

  async function copy(text, which) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(''), 2000);
    } catch { /* the owner can still select and copy by hand */ }
  }

  let message;
  if (h.status === 'SUSPENDED') message = 'Your hotel is suspended. Please contact your account manager.';
  else if (ended) message = `Your plan ended on ${day(h.planEndsAt)}. Pay below to keep using the app.`;
  else if (trial) message = `Your free trial ends on ${day(h.planEndsAt)}.${standardMonthly != null ? ` To continue, pay ${inr(standardMonthly)} a month on the Standard plan.` : ''}`;
  else message = `Your plan runs until ${day(h.planEndsAt)}. Pay before that date so your team is not interrupted.`;

  return (
    <>
      <div className="pagehead"><h1>Subscription</h1></div>
      <div className="two">
        <div className="card">
          <p>
            <span className="chip">{h.plan.name} plan</span>{' '}
            <span className={`chip${h.status === 'ACTIVE' ? '' : ' warn'}`}>{h.status === 'ACTIVE' ? 'Active' : 'Suspended'}</span>
          </p>
          <dl className="dl">
            <div><dt>Monthly amount</dt><dd>{trial ? 'Free during the trial' : inr(h.monthlyAmount)}</dd></div>
            {!trial && <div><dt>How it is worked out</dt><dd>{h.roomCount} rooms x {inr(h.plan.pricePerRoom)}</dd></div>}
            <div><dt>Joined on</dt><dd>{day(h.joinedAt)}</dd></div>
            <div><dt>Plan ends on</dt><dd>{day(h.planEndsAt)}</dd></div>
            <div><dt>Time left</dt><dd><Countdown endsAt={h.planEndsAt} seconds /></dd></div>
          </dl>
          <p>{message}</p>
        </div>

        <div className="card">
          <h2>How to pay</h2>
          {toPay != null && <p>Amount: <b>{inr(toPay)}</b></p>}
          <ol className="steps">
            <li>
              Pay by UPI or bank transfer{UPI ? ' to ' : '.'}
              {UPI && (
                <span className="copyrow">
                  <code>{UPI}</code>
                  <button className="btn alt sm" onClick={() => copy(UPI, 'upi')}>{copied === 'upi' ? 'Copied' : 'Copy'}</button>
                </span>
              )}
              {!UPI && <span className="k"> Ask your account manager for the payment details.</span>}
            </li>
            <li>
              Write this in the payment note, so we can find your payment:{' '}
              <span className="copyrow">
                <code>{note}</code>
                <button className="btn alt sm" onClick={() => copy(note, 'note')}>{copied === 'note' ? 'Copied' : 'Copy'}</button>
              </span>
            </li>
            <li>Your account manager confirms the payment and your plan end date moves forward.</li>
          </ol>
          {CONTACT && <p className="k">Questions? Call {CONTACT}.</p>}
        </div>
      </div>
    </>
  );
}
