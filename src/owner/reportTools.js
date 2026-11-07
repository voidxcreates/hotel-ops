// Everything the Reports screen needs apart from drawing it: date limits, day-by-day numbers, and the ZIP file.
import { addDays, diffDays, todayYmd } from './dates';
import { MODES, MODE_LABEL } from './payModes';
import { makeZip } from './zip';

export const MAX_HISTORY_DAYS = 90; // records older than this are not reported
export const MAX_SPAN_DAYS = 31; // one report covers at most this many days (the server must enforce both)
export const KIND_LABEL = { DEPOSIT: 'Deposit / advance', PAYMENT: 'Payment', REFUND: 'Refund' };

export const presetRange = (days) => ({ from: addDays(todayYmd(), -(days - 1)), to: todayYmd() });

export function rangeError({ from, to }) {
  const ok = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  if (!ok(from) || !ok(to)) return 'Choose both dates.';
  if (to < from) return 'The end date is before the start date.';
  if (diffDays(to, from) + 1 > MAX_SPAN_DAYS) return `Choose at most ${MAX_SPAN_DAYS} days at a time.`;
  if (from < addDays(todayYmd(), -(MAX_HISTORY_DAYS - 1))) return `Records go back ${MAX_HISTORY_DAYS} days only.`;
  if (to > todayYmd()) return 'Future dates cannot be reported.';
  return '';
}

// One row per day, oldest first: { date, checkIns, checkOuts, collected, byMode }.
export function dayRows(report) {
  const rows = [];
  for (let d = report.from; d <= report.to; d = addDays(d, 1)) {
    const pays = report.payments.filter((p) => p.date === d);
    rows.push({
      date: d,
      checkIns: report.bookings.filter((b) => b.checkIn === d).length,
      checkOuts: report.bookings.filter((b) => b.status === 'CHECKED_OUT' && b.checkOut === d).length,
      collected: pays.reduce((s, p) => s + p.amount, 0),
      byMode: Object.fromEntries(MODES.map(([k]) => [k, pays.filter((p) => p.mode === k).reduce((s, p) => s + p.amount, 0)])),
    });
  }
  return rows;
}

export function totalsOf(rows) {
  return rows.reduce((t, r) => ({
    checkIns: t.checkIns + r.checkIns,
    checkOuts: t.checkOuts + r.checkOuts,
    collected: t.collected + r.collected,
    byMode: Object.fromEntries(MODES.map(([k]) => [k, t.byMode[k] + r.byMode[k]])),
  }), { checkIns: 0, checkOuts: 0, collected: 0, byMode: Object.fromEntries(MODES.map(([k]) => [k, 0])) });
}

// ---------- CSV ----------
// Text that starts with = + - @ is prefixed with ' so Excel never runs it as a formula (guest names are typed by people).
const cell = (v) => {
  if (typeof v === 'number') return String(v);
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// The leading \uFEFF lets Excel read rupee signs and Bengali or Hindi names correctly.
const csv = (rows) => `\uFEFF${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;

export function buildReport({ hotelName, report }) {
  const rows = dayRows(report);
  const tot = totalsOf(rows);
  const bookingRow = (b, date) => [date, b.room, b.guestName, b.phone, b.nights, b.total, b.discount, b.paid, b.balance, b.status === 'CHECKED_OUT' ? 'Checked out' : 'Checked in'];
  const head = (first) => [first, 'Room', 'Guest', 'Phone', 'Nights', 'Room charge', 'Discount', 'Paid so far', 'Balance due', 'Status'];
  const byDate = (key) => (a, b) => a[key].localeCompare(b[key]);
  const kinds = Object.keys(KIND_LABEL);

  const files = [
    {
      name: 'summary-by-day.csv',
      content: csv([
        ['Date', 'Check-ins', 'Check-outs', 'Collected', ...MODES.map(([, v]) => v)],
        ...rows.map((r) => [r.date, r.checkIns, r.checkOuts, r.collected, ...MODES.map(([k]) => r.byMode[k])]),
        ['Total', tot.checkIns, tot.checkOuts, tot.collected, ...MODES.map(([k]) => tot.byMode[k])],
      ]),
    },
    {
      name: 'check-ins.csv',
      content: csv([head('Check-in date'), ...report.bookings.filter((b) => b.checkIn >= report.from && b.checkIn <= report.to).sort(byDate('checkIn')).map((b) => bookingRow(b, b.checkIn))]),
    },
    {
      name: 'check-outs.csv',
      content: csv([head('Check-out date'), ...report.bookings.filter((b) => b.status === 'CHECKED_OUT' && b.checkOut >= report.from && b.checkOut <= report.to).sort(byDate('checkOut')).map((b) => bookingRow(b, b.checkOut))]),
    },
    {
      name: 'payments.csv',
      content: csv([
        ['Date', 'Time', 'Guest', 'Room', 'Type', 'Mode', 'Amount', 'Recorded by'],
        ...[...report.payments].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
          .map((p) => [p.date, p.time, p.guestName, p.room, KIND_LABEL[p.kind] || p.kind, MODE_LABEL[p.mode] || p.mode, p.amount, p.recordedBy]),
      ]),
    },
    {
      name: 'totals-by-type-and-mode.csv',
      content: csv([
        ['Type', ...MODES.map(([, v]) => v), 'Total'],
        ...kinds.map((k) => {
          const ps = report.payments.filter((p) => p.kind === k);
          const per = MODES.map(([m]) => ps.filter((p) => p.mode === m).reduce((s, p) => s + p.amount, 0));
          return [KIND_LABEL[k], ...per, per.reduce((s, n) => s + n, 0)];
        }),
        ['All', ...MODES.map(([k]) => tot.byMode[k]), tot.collected],
      ]),
    },
    {
      name: 'README.txt',
      content: [
        `${hotelName}: report for ${report.from} to ${report.to}`,
        '',
        '  summary-by-day.csv           check-ins, check-outs and money collected for each day',
        '  check-ins.csv                every guest who checked in during the period',
        '  check-outs.csv               every guest who checked out during the period',
        '  payments.csv                 every payment, with its type and how it was paid',
        '  totals-by-type-and-mode.csv  money totals by type and by cash / UPI / card / bank',
        '',
        'Amounts are in rupees. A refund is shown as a negative amount, and discounts are not money collected.',
        'These files hold guest names and phone numbers. Keep them private and delete them when you are done.',
        'ID numbers and ID photos are never included.',
        '',
      ].join('\r\n'),
    },
  ];
  const slug = hotelName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'hotel';
  return { files, fileName: `${slug}-report-${report.from}-to-${report.to}.zip` };
}

export function downloadReport(input) {
  const { files, fileName } = buildReport(input);
  const url = URL.createObjectURL(new Blob([makeZip(files)], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
