export const inr = (n) => '\u20B9' + Number(n).toLocaleString('en-IN');
export const day = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const dayTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Keep only digits and cut to max length (used by the phone and pincode inputs).
export const digits = (v, max) => String(v).replace(/\D/g, '').slice(0, max);
export const isPhone = (v) => /^\d{10}$/.test(v);

// Today as YYYY-MM-DD in the user's own time zone (for <input type="date">).
export const todayInput = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// Add n calendar months. Jan 31 + 1 month gives Feb 28/29, like Java's plusMonths.
export function addMonths(iso, n) {
  const d = new Date(iso);
  const dayOfMonth = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dayOfMonth, last));
  return d.toISOString();
}
