import { request } from '../api';
import { netAmount, ymd } from './report';

const MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ---------- real server calls (used when VITE_USE_MOCK=false) ----------
const real = {
  hotel: () => request('/api/owner/hotel'),
  updateHotel: (body) => request('/api/owner/hotel', { method: 'PUT', body }),
  access: () => request('/api/owner/access'),
  setAccess: (body) => request('/api/owner/access', { method: 'PUT', body }),
  summary: () => request('/api/owner/summary'), // may answer 404 until check-ins are recorded
  // from and to are 'YYYY-MM-DD' dates, both days included.
  bookings: ({ from, to }) => request(`/api/owner/bookings?from=${from}&to=${to}`),
  transactions: ({ from, to }) => request(`/api/owner/transactions?from=${from}&to=${to}`),
};

// ---------- sample data (used when VITE_USE_MOCK=true) ----------
const wait = (v, ms = 250) => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));
const fail = (message, status = 400) =>
  new Promise((_, j) => setTimeout(() => j(Object.assign(new Error(message), { status })), 250));
const inDays = (d) => new Date(Date.now() + d * 864e5).toISOString();
const ago = (d) => new Date(Date.now() - d * 864e5).toISOString();
const phone = (v) => /^\d{10}$/.test(v || '');

let HOTEL = {
  id: 1, name: 'Hotel Sunrise', addressLine: '11, Station Road', city: 'Kolkata', state: 'West Bengal', pincode: '700011',
  roomCount: 12, plan: { code: 'STANDARD', name: 'Standard', pricePerRoom: 100 }, monthlyAmount: 1200,
  standardPricePerRoom: 100, status: 'ACTIVE', joinedAt: ago(75), planEndsAt: inDays(5),
  owner: { name: 'Rahul Das', phone: '9830012345', email: 'rahul@sunrise.example' },
  receptionists: [{ name: 'Priya Sen', phone: '9830022222' }, { name: 'Meena Paul', phone: '9830033333' }],
};
let ACCESS = { viewHistory: true, editCheckins: true, deleteRecords: false, seeRevenue: false, exportData: false };

// 90 days of made-up bookings and payments, always ending today.
function makeData() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const now = new Date();
  const week = [3, 5, 2, 6, 4, 7, 3]; // check-ins on each of the last 7 days, today last
  const names = ['Rahul Das', 'Priya Sen', 'Amit Ghosh', 'Meena Paul', 'Imran Ali', 'Sonia Khan', 'Pradip Dey', 'Neha Gupta', 'Anil Roy', 'Raju Das', 'Kavita Singh', 'Joydeep Bose'];
  const sources = ['Walk-in', 'Phone', 'WhatsApp', 'Booking.com', 'MakeMyTrip'];
  const modes = ['CASH', 'UPI', 'UPI', 'CARD'];
  const bookings = [];
  const tx = [];
  let b = 1000;
  let t = 5000;

  for (let off = 89; off >= 0; off--) {
    const n = off <= 6 ? week[6 - off] : 2 + Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) {
      const at = new Date(now);
      at.setDate(at.getDate() - off);
      at.setHours(off === 0 ? 6 + Math.floor(rnd() * 4) : 11 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0);
      if (at > now) at.setTime(now.getTime() - (i + 1) * 60000);

      const nights = 1 + Math.floor(rnd() * 3);
      const rate = pick([900, 1500, 2000]);
      const total = rate * nights;
      const advance = Math.round((total * (0.3 + rnd() * 0.3)) / 100) * 100;
      const planned = new Date(at);
      planned.setDate(planned.getDate() + nights);
      planned.setHours(11, Math.floor(rnd() * 30), 0, 0);
      const out = planned <= now ? planned : null;
      const id = 'B' + b++;
      const guest = names[(b + i) % names.length];
      const room = String(101 + Math.floor(rnd() * 12));

      bookings.push({
        id, guest, phone: '98' + Math.floor(10000000 + rnd() * 89999999), room,
        checkIn: at.toISOString(), checkOut: out ? out.toISOString() : null,
        nights, guests: 1 + Math.floor(rnd() * 3), source: pick(sources), total, paid: out ? total : advance,
      });
      tx.push({ id: 'T' + t++, at: at.toISOString(), bookingId: id, guest, room, type: 'ADVANCE', mode: pick(modes), amount: advance, recordedBy: 'Priya Sen' });
      if (out) {
        tx.push({ id: 'T' + t++, at: out.toISOString(), bookingId: id, guest, room, type: 'BALANCE', mode: pick(modes), amount: total - advance, recordedBy: 'Meena Paul' });
        if (rnd() < 0.05) tx.push({ id: 'T' + t++, at: out.toISOString(), bookingId: id, guest, room, type: 'REFUND', mode: 'CASH', amount: 200, recordedBy: 'Meena Paul' });
      }
    }
  }
  tx.sort((x, y) => new Date(x.at) - new Date(y.at));
  return { bookings, tx };
}
const { bookings: BOOKINGS, tx: TX } = makeData();

const mock = {
  hotel: () => wait(HOTEL),
  access: () => wait(ACCESS, 100),
  setAccess: (a) => { ACCESS = { ...ACCESS, ...a }; return wait(null, 150); },
  summary: () => {
    const todayKey = ymd(new Date());
    const weekCheckIns = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = ymd(d);
      weekCheckIns.push(BOOKINGS.filter((x) => ymd(new Date(x.checkIn)) === key).length);
    }
    const inHouse = BOOKINGS.filter((x) => !x.checkOut);
    const occupied = Math.min(inHouse.length, 7);
    return wait({
      roomsFree: Math.max(0, HOTEL.roomCount - occupied - 2),
      roomsOccupied: occupied,
      roomsCleaning: 2,
      checkInsToday: weekCheckIns[6],
      collectedToday: TX.filter((x) => ymd(new Date(x.at)) === todayKey).reduce((s, x) => s + netAmount(x), 0),
      balanceDue: inHouse.reduce((s, x) => s + (x.total - x.paid), 0),
      weekCheckIns,
    });
  },
  // Bookings whose check-in OR check-out falls between from and to (both days included).
  bookings: ({ from, to }) => {
    const key = (iso) => ymd(new Date(iso));
    return wait(BOOKINGS.filter((x) => {
      const a = key(x.checkIn);
      const o = x.checkOut && key(x.checkOut);
      return (a >= from && a <= to) || (o && o >= from && o <= to);
    }));
  },
  transactions: ({ from, to }) => wait(TX.filter((x) => { const k = ymd(new Date(x.at)); return k >= from && k <= to; })),
  updateHotel: (b) => {
    if (!b.name?.trim()) return fail('Hotel name is required');
    if (!b.addressLine?.trim()) return fail('Address is required');
    if (!phone(b.owner?.phone)) return fail('Owner phone must be exactly 10 digits');
    const recs = b.receptionists || [];
    if (recs.length > 5) return fail('You can add at most 5 receptionists');
    if (recs.some((r) => !r.name?.trim() || !phone(r.phone))) return fail('Each receptionist needs a name and a 10-digit phone');
    HOTEL = {
      ...HOTEL, name: b.name.trim(), addressLine: b.addressLine.trim(), city: b.city.trim(),
      state: b.state?.trim() || '', pincode: b.pincode || '', owner: b.owner, receptionists: recs,
    };
    return wait(null);
  },
};

export const ownerApi = MOCK ? mock : real;
