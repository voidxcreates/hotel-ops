import { makeZip } from './zip';

export const TYPE_LABEL = { ADVANCE: 'Advance', BALANCE: 'Balance', PAYMENT: 'Payment', REFUND: 'Refund' };
export const MODE_LABEL = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', BANK: 'Bank transfer' };

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Records go back 90 days, and one report can cover at most 31 days.
export const MAX_HISTORY_DAYS = 90;
export const MAX_SPAN_DAYS = 31;

// Dates are plain 'YYYY-MM-DD' text in the owner's own time zone.
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const spanDays = (from, to) => Math.round((parseYmd(to) - parseYmd(from)) / 864e5) + 1;

// A ready-made period: 1 = today, 7 = last 7 days, 30 = last 30 days.
export const presetRange = (days) => ({ from: ymd(addDays(new Date(), -(days - 1))), to: ymd(new Date()) });

// Returns a short message when a chosen period is not allowed, or '' when it is fine.
export function rangeError({ from, to }) {
  if (!from || !to) return 'Pick both dates.';
  const today = parseYmd(ymd(new Date()));
  if (parseYmd(to) < parseYmd(from)) return 'The end date is before the start date.';
  if (parseYmd(to) > today) return 'The end date cannot be in the future.';
  if (parseYmd(from) < addDays(today, -(MAX_HISTORY_DAYS - 1))) return `Records go back ${MAX_HISTORY_DAYS} days.`;
  if (spanDays(from, to) > MAX_SPAN_DAYS) return `Choose at most ${MAX_SPAN_DAYS} days at a time.`;
  return '';
}

export const inRange = (iso, r) => { const k = ymd(new Date(iso)); return k >= r.from && k <= r.to; };

// Money amounts are always positive in the data. A refund counts against the total.
export const netAmount = (t) => (t.type === 'REFUND' ? -t.amount : t.amount);

// One row per day, newest first.
export function dayRows(bookings, transactions, range) {
  const rows = [];
  const n = spanDays(range.from, range.to);
  for (let i = 0; i < n; i++) {
    const d = addDays(parseYmd(range.to), -i);
    const key = ymd(d);
    const tx = transactions.filter((t) => ymd(new Date(t.at)) === key);
    const modes = {};
    tx.forEach((t) => { modes[t.mode] = (modes[t.mode] || 0) + netAmount(t); });
    rows.push({
      key,
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      checkIns: bookings.filter((b) => ymd(new Date(b.checkIn)) === key).length,
      checkOuts: bookings.filter((b) => b.checkOut && ymd(new Date(b.checkOut)) === key).length,
      collected: tx.reduce((s, t) => s + netAmount(t), 0),
      modes,
    });
  }
  return rows;
}

// ---------- CSV ----------
// Text that starts with = + - @ is prefixed with ' so Excel never runs it as a formula.
const cell = (v) => {
  if (typeof v === 'number') return String(v);
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// The leading \uFEFF lets Excel read rupee signs and Bengali or Hindi names correctly.
const csv = (rows) => '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';

const when = (iso) => { const d = new Date(iso); return [ymd(d), hm(d)]; };

export function buildReport({ hotelName, range, bookings, transactions }) {
  const today = new Date();
  const checkIns = bookings.filter((b) => inRange(b.checkIn, range))
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  const checkOuts = bookings.filter((b) => b.checkOut && inRange(b.checkOut, range))
    .sort((a, b) => new Date(a.checkOut) - new Date(b.checkOut));
  const tx = transactions.filter((t) => inRange(t.at, range))
    .sort((a, b) => new Date(a.at) - new Date(b.at));
  const rows = dayRows(bookings, transactions, range).reverse(); // oldest first

  const modeKeys = [...new Set([...Object.keys(MODE_LABEL), ...tx.map((t) => t.mode)])];
  const typeKeys = [...new Set([...Object.keys(TYPE_LABEL), ...tx.map((t) => t.type)])];
  const modeName = (m) => MODE_LABEL[m] || m;
  const typeName = (t) => TYPE_LABEL[t] || t;

  const files = [];

  files.push({
    name: 'summary-by-day.csv',
    content: csv([
      ['Date', 'Check-ins', 'Check-outs', 'Total collected', ...modeKeys.map(modeName)],
      ...rows.map((r) => [r.key, r.checkIns, r.checkOuts, r.collected, ...modeKeys.map((m) => r.modes[m] || 0)]),
      ['Total', rows.reduce((s, r) => s + r.checkIns, 0), rows.reduce((s, r) => s + r.checkOuts, 0),
        rows.reduce((s, r) => s + r.collected, 0), ...modeKeys.map((m) => rows.reduce((s, r) => s + (r.modes[m] || 0), 0))],
    ]),
  });

  files.push({
    name: 'check-ins.csv',
    content: csv([
      ['Booking ID', 'Guest', 'Phone', 'Room', 'Check-in date', 'Check-in time', 'Nights', 'Guests', 'Source', 'Total amount', 'Paid so far', 'Balance due'],
      ...checkIns.map((b) => { const [d, t] = when(b.checkIn); return [b.id, b.guest, b.phone, b.room, d, t, b.nights, b.guests, b.source, b.total, b.paid, b.total - b.paid]; }),
    ]),
  });

  files.push({
    name: 'check-outs.csv',
    content: csv([
      ['Booking ID', 'Guest', 'Phone', 'Room', 'Check-in date', 'Check-out date', 'Check-out time', 'Nights', 'Total amount', 'Paid', 'Balance due'],
      ...checkOuts.map((b) => { const [d, t] = when(b.checkOut); return [b.id, b.guest, b.phone, b.room, ymd(new Date(b.checkIn)), d, t, b.nights, b.total, b.paid, b.total - b.paid]; }),
    ]),
  });

  files.push({
    name: 'transactions.csv',
    content: csv([
      ['Transaction ID', 'Date', 'Time', 'Booking ID', 'Guest', 'Room', 'Type', 'Payment mode', 'Amount', 'Recorded by'],
      ...tx.map((t) => { const [d, h] = when(t.at); return [t.id, d, h, t.bookingId, t.guest, t.room, typeName(t.type), modeName(t.mode), netAmount(t), t.recordedBy]; }),
    ]),
  });

  const sum = (type, mode) => tx.filter((t) => t.type === type && t.mode === mode).reduce((s, t) => s + netAmount(t), 0);
  files.push({
    name: 'totals-by-type-and-mode.csv',
    content: csv([
      ['Type of transaction', ...modeKeys.map(modeName), 'Total'],
      ...typeKeys.map((ty) => [typeName(ty), ...modeKeys.map((m) => sum(ty, m)), modeKeys.reduce((s, m) => s + sum(ty, m), 0)]),
      ['Total', ...modeKeys.map((m) => typeKeys.reduce((s, ty) => s + sum(ty, m), 0)), tx.reduce((s, t) => s + netAmount(t), 0)],
    ]),
  });

  files.push({
    name: 'README.txt',
    content: [
      `${hotelName} - report`,
      `Period: ${range.from} to ${range.to}`,
      `Created: ${ymd(today)} ${hm(today)}`,
      '',
      'Files',
      '  summary-by-day.csv           check-ins, check-outs and money collected for each day',
      '  check-ins.csv                every booking that arrived in the period',
      '  check-outs.csv               every booking that left in the period',
      '  transactions.csv             every payment, with its type and payment mode',
      '  totals-by-type-and-mode.csv  money totals by type (advance, balance, refund) and mode (cash, UPI, card)',
      '',
      'Amounts are in rupees. A refund is shown as a negative amount.',
      'Open the .csv files with Excel, Google Sheets, or any spreadsheet app.',
      '',
    ].join('\r\n'),
  });

  const slug = hotelName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'hotel';
  return { files, fileName: `${slug}-report-${range.from}-to-${range.to}.zip` };
}

export function downloadReport(input) {
  const { files, fileName } = buildReport(input);
  const blob = new Blob([makeZip(files)], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
