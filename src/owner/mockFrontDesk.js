// Sample data for the owner Front desk and the owner Dashboard, so the UI works before the backend exists.
// Dashboard numbers are worked out from the SAME bookings, so what you do on the Front desk shows up there.
import { addDays, diffDays, todayYmd } from './dates';
import { MODES } from './payModes';
import { ID_TYPES, PURPOSES, cleanId } from './idTypes';

const wait = (v, ms = 250) => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));
const fail = (message, status = 400) =>
  new Promise((_, j) => setTimeout(() => j(Object.assign(new Error(message), { status })), 250));
const inr = (n) => '\u20B9' + Number(n).toLocaleString('en-IN');

const ROOMS = [
  ['101', 'Deluxe AC', 1500], ['102', 'Deluxe AC', 1500], ['103', 'Deluxe AC', 1500], ['107', 'Deluxe AC', 1500],
  ['104', 'Standard', 900], ['105', 'Standard', 900], ['106', 'Standard', 900], ['109', 'Standard', 900], ['110', 'Standard', 900],
  ['108', 'Family', 2000], ['111', 'Family', 2000], ['112', 'Family', 2000],
].map(([number, type, rate]) => ({ number, type, rate }));
const rateOf = (room) => ROOMS.find((r) => r.number === room)?.rate ?? 0;
const LABEL = { PAYMENT: 'Payment received', DEPOSIT: 'Deposit received', DISCOUNT: 'Discount', REFUND: 'Refund' };

let nextId = 1;
let nextPay = 1;
const MODE_KEYS = MODES.map(([k]) => k);
const nowHm = () => new Date().toTimeString().slice(0, 5);
// Every payment remembers its day, time, how it was paid and who took it (the Reports screen reads these).
function pay(b, kind, category, amount, date, time, mode, by = 'Priya') {
  b.payments.push({ id: nextPay++, kind, category, amount, mode, date, time, recordedBy: by });
}
const notFuture = (d) => (d > todayYmd() ? addDays(todayYmd(), -1) : d);
const BOOKINGS = [];
function seed(guestName, room, offset, nights, paid, status, phone = '9830012345') {
  const b = { id: nextId++, guestName, phone, room, checkIn: addDays(todayYmd(), offset), nights, status, payments: [] };
  if (paid >= 1000 && status === 'CHECKED_IN') {
    const adv = Math.floor(paid / 2 / 100) * 100; // half as advance, the rest when they arrived
    pay(b, 'DEPOSIT', 'Advance received', adv, notFuture(addDays(b.checkIn, -2)), '11:20', 'UPI');
    pay(b, 'PAYMENT', 'Payment received', paid - adv, b.checkIn, '14:05', b.id % 2 ? 'CASH' : 'UPI');
  } else if (paid) {
    pay(b, 'DEPOSIT', 'Advance received', paid, notFuture(addDays(b.checkIn, -2)), '16:40', 'UPI');
  }
  BOOKINGS.push(b);
}
seed('R. Das', '101', -2, 4, 4500, 'CHECKED_IN', '9830012345');
seed('A. Khan', '106', -3, 3, 2700, 'CHECKED_IN', '9733041120');
seed('S. Roy', '108', -1, 4, 7500, 'CHECKED_IN', '9681055091');
seed('P. Dey', '111', -2, 3, 6000, 'CHECKED_IN', '9804067712');
seed('Sen', '103', -1, 1, 0, 'CHECKED_IN', '9831122334');
seed('Paul', '109', -1, 1, 900, 'CHECKED_IN', '9007012988');
seed('Mitra', '102', 0, 2, 1000, 'RESERVED', '9830033333');
seed('Gupta', '104', 0, 2, 0, 'RESERVED', '9830044444');
seed('Bose', '107', 0, 3, 4500, 'RESERVED', '9830055555');
seed('Sharma', '110', 1, 4, 1000, 'RESERVED', '9830066666');
seed('D. Roy', '106', 2, 3, 0, 'RESERVED', '9830077777');
seed('Ghosh', '105', 2, 2, 500, 'RESERVED', '9830088888');
seed('Iyer', '102', 3, 3, 0, 'RESERVED', '9830099999');
seed('Nandi', '107', 4, 2, 1000, 'RESERVED', '9831011111');
seed('Jain', '103', 5, 2, 1500, 'RESERVED', '9831022222');


// ---- Check-in details (one set per booking) and guests from earlier stays ----
// Aadhaar: only the type and last 4 digits are kept, never a photo or the full number.
const blank = { email: '', pin: '', children: 0, goingTo: '', vehicle: '', foreign: false, idFront: false, idBack: false };
const DETAILS = {
  1: { ...blank, address: '12 Park Road', city: 'Kolkata', state: 'West Bengal', pin: '713301', idType: 'AADHAAR', idLast4: '1234', adults: 2, comingFrom: 'Kolkata', purpose: 'Tourism' },
  2: { ...blank, address: '4 Lake View', city: 'Siliguri', state: 'West Bengal', idType: 'VOTER', idLast4: '4567', idFront: true, idBack: true, adults: 1, comingFrom: 'Siliguri', purpose: 'Business' },
  3: { ...blank, address: '9 Market Lane', city: 'Durgapur', state: 'West Bengal', idType: 'DL', idLast4: '2345', idFront: true, idBack: true, adults: 2, children: 1, comingFrom: 'Durgapur', goingTo: 'Digha', purpose: 'Family visit', vehicle: 'WB 38 AB 1234' },
  4: { ...blank, address: '21 Station Road', city: 'Asansol', state: 'West Bengal', idType: 'AADHAAR', idLast4: '5678', adults: 3, comingFrom: 'Asansol', purpose: 'Pilgrimage' },
  5: { ...blank, address: '7 Green Park', city: 'Kolkata', state: 'West Bengal', idType: 'AADHAAR', idLast4: '3333', adults: 1, comingFrom: 'Kolkata', purpose: 'Business' },
  6: { ...blank, address: '3 Orchard Street', city: 'Patna', state: 'Bihar', idType: 'PASSPORT', idLast4: '4567', idFront: true, idBack: true, adults: 1, comingFrom: 'Patna', purpose: 'Medical' },
};
const PAST = [
  { id: 'past-1', name: 'Anita Verma', phone: '9831055501', stays: 3, last: -20, spent: 9200, idType: 'AADHAAR', idLast4: '7777', address: '15 Rose Avenue', city: 'Kolkata', state: 'West Bengal', purpose: 'Tourism', comingFrom: 'Kolkata' },
  { id: 'past-2', name: 'Rakesh Jha', phone: '9733041121', stays: 1, last: -38, spent: 1800, idType: 'VOTER', idLast4: '8821', address: '2 Canal Road', city: 'Ranchi', state: 'Jharkhand', purpose: 'Business', comingFrom: 'Ranchi', idFront: true, idBack: true },
  { id: 'past-3', name: 'M. Banerjee', phone: '9007022119', stays: 5, last: -12, spent: 14500, idType: 'AADHAAR', idLast4: '4410', address: '88 Hill Cart Road', city: 'Siliguri', state: 'West Bengal', purpose: 'Family visit', comingFrom: 'Siliguri' },
  { id: 'past-4', name: 'Pooja Shah', phone: '9875066320', stays: 2, last: -30, spent: 4200, idType: 'DL', idLast4: '9017', address: '5 Ring Road', city: 'Ahmedabad', state: 'Gujarat', purpose: 'Tourism', comingFrom: 'Ahmedabad', idFront: true, idBack: true },
].map((p) => ({ ...p, details: { ...blank, address: p.address, city: p.city, state: p.state, idType: p.idType, idLast4: p.idLast4, idFront: !!p.idFront, idBack: !!p.idBack, adults: 1, comingFrom: p.comingFrom, purpose: p.purpose } }));
const idOk = (d) => !!d?.idType && (!ID_TYPES[d.idType].photos || (d.idFront && d.idBack));

// Older stays that already checked out. Used only by the Reports screen (a real server has them all in the same table).
const HISTORY = ['Verma', 'Jha', 'Banerjee', 'Shah', 'Kapoor', 'Dutta', 'Mehta', 'Nair', 'Pillai', 'Saha', 'Ghosal', 'Lal', 'Reddy', 'Basu'].map((name, i) => {
  const rooms = ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112'];
  const nights = 1 + (i % 3);
  const room = rooms[(i * 5) % 12];
  const b = { id: 1000 + i, guestName: name, phone: `98310${String(10000 + i * 37).slice(-5)}`, room, checkIn: addDays(todayYmd(), -(2 + i * 2) - nights), nights, status: 'CHECKED_OUT', payments: [] };
  const total = nights * rateOf(room);
  const adv = Math.round((total * 0.4) / 100) * 100;
  pay(b, 'DEPOSIT', 'Advance received', adv, addDays(b.checkIn, -1), '12:10', MODE_KEYS[i % 4]);
  pay(b, 'PAYMENT', 'Payment received', total - adv, addDays(b.checkIn, nights), '10:45', MODE_KEYS[(i + 1) % 4]);
  return b;
});

// The money is always worked out from the payment list, never stored twice.
function view(b) {
  const total = b.nights * rateOf(b.room);
  const sum = (f) => b.payments.filter(f).reduce((s, p) => s + p.amount, 0);
  const paid = sum((p) => p.kind !== 'DISCOUNT');
  const discount = sum((p) => p.kind === 'DISCOUNT');
  const balance = Math.max(total - discount - paid, 0);
  return {
    ...b, checkOut: addDays(b.checkIn, b.nights), total, paid, discount, balance, idOnFile: idOk(DETAILS[b.id]),
    payment: balance <= 0 ? 'PAID' : paid > 0 ? 'PART_PAID' : 'UNPAID',
  };
}
const find = (id) => BOOKINGS.find((b) => b.id === Number(id));

function ownerFrontDesk(from, days = 14) {
  const today = todayYmd();
  const to = addDays(from, days);
  const all = BOOKINGS.map(view);
  return wait({
    today,
    rooms: ROOMS,
    bookings: all.filter((b) => b.status !== 'CANCELLED' && b.checkIn < to && b.checkOut >= from),
    counts: {
      checkedIn: all.filter((b) => b.status === 'CHECKED_IN').length,
      arrivingLeavingToday:
        all.filter((b) => b.status === 'RESERVED' && b.checkIn === today).length +
        all.filter((b) => b.status === 'CHECKED_IN' && b.checkOut === today).length,
      reserved: all.filter((b) => b.status === 'RESERVED' && b.checkIn > today).length,
    },
  });
}

function ownerAddBooking(body) {
  const guestName = (body.guestName || '').trim();
  const nights = Number(body.nights);
  const advance = Number(body.advance) || 0;
  if (!guestName) return fail('Guest name is required');
  if (!ROOMS.some((r) => r.number === body.room)) return fail('Choose a room');
  if (!Number.isInteger(nights) || nights < 1 || nights > 60) return fail('Nights must be 1 to 60');
  if (!body.checkIn || body.checkIn < todayYmd()) return fail('Check-in cannot be in the past');
  const end = addDays(body.checkIn, nights);
  const clash = BOOKINGS.some((b) => b.room === body.room && ['RESERVED', 'CHECKED_IN'].includes(b.status) && body.checkIn < addDays(b.checkIn, b.nights) && b.checkIn < end);
  if (clash) return fail(`Room ${body.room} is already booked on those dates. Choose another room or date.`, 409);
  if (advance < 0 || advance > nights * rateOf(body.room)) return fail('Advance cannot be more than the room charge');
  if (advance > 0 && !MODE_KEYS.includes(body.mode)) return fail('Choose how the advance was paid');
  const b = { id: nextId++, guestName, phone: body.phone || '', room: body.room, checkIn: body.checkIn, nights, status: 'RESERVED', payments: [] };
  if (advance) pay(b, 'DEPOSIT', 'Advance received', advance, todayYmd(), nowHm(), body.mode, 'Owner');
  BOOKINGS.push(b);
  return wait(null);
}

function ownerAddPayment(id, { kind, amount, mode }) {
  const b = find(id);
  if (!b) return fail('Booking not found', 404);
  const v = view(b);
  const n = Number(amount);
  if (!LABEL[kind]) return fail('Unknown payment type');
  if (!(n > 0)) return fail('Type an amount first');
  if (kind !== 'DISCOUNT' && !MODE_KEYS.includes(mode)) return fail('Choose how it was paid');
  if (kind === 'REFUND' && n > v.paid) return fail('You cannot refund more than was paid');
  if ((kind === 'DISCOUNT' || kind === 'PAYMENT') && n > v.balance) return fail(`That is more than the balance due (${inr(v.balance)})`);
  pay(b, kind, LABEL[kind], kind === 'REFUND' ? -n : n, todayYmd(), nowHm(), kind === 'DISCOUNT' ? null : mode, 'Owner');
  return wait(null);
}

function ownerBookingAction(id, action) {
  const b = find(id);
  if (!b) return fail('Booking not found', 404);
  if (action === 'check-in') {
    if (b.status !== 'RESERVED') return fail('Only a reserved booking can be checked in', 409);
    b.status = 'CHECKED_IN';
  } else if (action === 'check-out') {
    if (b.status !== 'CHECKED_IN') return fail('Only a checked-in guest can be checked out', 409);
    const { balance } = view(b);
    if (balance > 0) return fail(`${inr(balance)} is still due. Collect payment first.`, 409);
    b.status = 'CHECKED_OUT';
  } else if (action === 'cancel') {
    if (b.status !== 'RESERVED') return fail('Only a reserved booking can be cancelled', 409);
    b.status = 'CANCELLED';
  } else return fail('Unknown action');
  return wait(null);
}

function ownerDashboard() {
  const today = todayYmd();
  const all = BOOKINGS.map(view);
  const inHouse = all.filter((b) => b.status === 'CHECKED_IN');
  const upcoming = all.filter((b) => b.status === 'RESERVED').sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const night = (i) => {
    const d = addDays(today, i);
    const n = all.filter((b) => ['RESERVED', 'CHECKED_IN'].includes(b.status) && b.checkIn <= d && d < b.checkOut).length;
    return Math.round((n / ROOMS.length) * 100);
  };
  const occupancyNext7 = Array.from({ length: 7 }, (_, i) => ({ date: addDays(today, i), percent: night(i) }));
  return wait({
    occupancyToday: occupancyNext7[0].percent,
    arrivingToday: upcoming.filter((b) => b.checkIn === today).length,
    leavingToday: inHouse.filter((b) => b.checkOut === today).length,
    balanceDue: inHouse.reduce((s, b) => s + b.balance, 0),
    occupancyNext7,
    balances: inHouse.filter((b) => b.balance > 0).map((b) => ({ id: b.id, guestName: b.guestName, room: b.room, amount: b.balance })),
    arrivals: upcoming.slice(0, 6).map((b) => ({ id: b.id, guestName: b.guestName, room: b.room, nights: b.nights, arrivalDate: b.checkIn, payment: b.payment })),
  });
}



// ---------------- Reports ----------------
function ownerReport(from, to) {
  const today = todayYmd();
  if (!from || !to) return fail('Choose both dates.');
  if (to < from) return fail('The end date is before the start date.');
  if (diffDays(to, from) + 1 > 31) return fail('Choose at most 31 days at a time.');
  if (from < addDays(today, -89)) return fail('Records go back 90 days only.');
  if (to > today) return fail('Future dates cannot be reported.');
  const inR = (d) => d >= from && d <= to;
  const all = [...BOOKINGS, ...HISTORY];
  const bookings = all.filter((b) => ['CHECKED_IN', 'CHECKED_OUT'].includes(b.status)).map(view)
    .filter((b) => inR(b.checkIn) || (b.status === 'CHECKED_OUT' && inR(b.checkOut)))
    .map((b) => ({ id: b.id, guestName: b.guestName, phone: b.phone, room: b.room, checkIn: b.checkIn, checkOut: b.checkOut, nights: b.nights, status: b.status, total: b.total, discount: b.discount, paid: b.paid, balance: b.balance }));
  const payments = all.filter((b) => b.status !== 'CANCELLED').flatMap((b) => b.payments
    .filter((p) => p.kind !== 'DISCOUNT' && inR(p.date))
    .map((p) => ({ id: p.id, bookingId: b.id, guestName: b.guestName, room: b.room, kind: p.kind, mode: p.mode, amount: p.amount, date: p.date, time: p.time, recordedBy: p.recordedBy })));
  return wait({ from, to, bookings, payments });
}

// ---------------- Guests ----------------
const gkey = (b) => `${b.guestName}|${b.phone}`.toLowerCase();
function groups() {
  const map = new Map();
  BOOKINGS.map(view).filter((b) => b.status !== 'CANCELLED').forEach((b) => {
    const g = map.get(gkey(b)) || { id: gkey(b), name: b.guestName, phone: b.phone, bookings: [] };
    g.bookings.push(b);
    map.set(g.id, g);
  });
  return [...map.values()];
}
const identityOf = (d) => (d?.idType ? { type: d.idType, last4: d.idLast4, hasFront: !!d.idFront, hasBack: !!d.idBack } : null);

function summarize(g) {
  const live = g.bookings;
  const inHouse = live.find((b) => b.status === 'CHECKED_IN');
  const up = live.filter((b) => b.status === 'RESERVED').sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
  const last = live.filter((b) => b.status === 'CHECKED_OUT').sort((a, b) => b.checkOut.localeCompare(a.checkOut))[0];
  const withId = live.find((b) => DETAILS[b.id]?.idType);
  return {
    id: g.id, name: g.name, phone: g.phone, identity: identityOf(withId && DETAILS[withId.id]),
    lastStay: inHouse ? { kind: 'IN_HOUSE' } : up ? { kind: 'UPCOMING', date: up.checkIn } : { kind: 'PAST', date: last.checkOut },
    stays: live.length, totalSpent: live.reduce((s, b) => s + b.paid, 0),
    balanceDue: live.filter((b) => b.status !== 'CHECKED_OUT').reduce((s, b) => s + b.balance, 0),
  };
}
const summarizePast = (p) => ({
  id: p.id, name: p.name, phone: p.phone, identity: identityOf(p.details), lastStay: { kind: 'PAST', date: addDays(todayYmd(), p.last) },
  stays: p.stays, totalSpent: p.spent, balanceDue: 0,
});

function ownerGuests(q = '') {
  const t = q.trim().toLowerCase().replace(/\s+/g, '');
  const all = [...groups().map(summarize), ...PAST.map(summarizePast)];
  return wait(all.filter((g) => !t || (g.name + g.phone).toLowerCase().replace(/\s+/g, '').includes(t)));
}

function ownerGuest(id) {
  const g = groups().find((x) => x.id === id);
  if (g) {
    const s = summarize(g);
    const current = g.bookings.filter((b) => b.status !== 'CHECKED_OUT');
    const pick = g.bookings.find((b) => b.status === 'CHECKED_IN' && DETAILS[b.id]) || g.bookings.find((b) => DETAILS[b.id]) || current[0] || null;
    const d = pick && DETAILS[pick.id];
    return wait({
      ...s, details: d ? stripId(d) : null, detailsBookingId: pick ? pick.id : null,
      current: current.map((b) => ({ bookingId: b.id, room: b.room, checkIn: b.checkIn, checkOut: b.checkOut, status: b.status })),
      canDelete: current.length === 0,
    });
  }
  const p = PAST.find((x) => x.id === id);
  if (!p) return fail('Guest not found', 404);
  return wait({ ...summarizePast(p), details: stripId(p.details), detailsBookingId: null, current: [], canDelete: true });
}
const stripId = ({ idType, idLast4, idFront, idBack, ...rest }) => rest;

function ownerDeleteGuest(id) {
  const g = groups().find((x) => x.id === id);
  if (g) {
    if (g.bookings.some((b) => b.status !== 'CHECKED_OUT')) return fail('This guest has a current or upcoming booking', 409);
    const ids = g.bookings.map((b) => b.id);
    for (let i = BOOKINGS.length - 1; i >= 0; i--) if (ids.includes(BOOKINGS[i].id)) BOOKINGS.splice(i, 1);
    ids.forEach((x) => delete DETAILS[x]);
    return wait(null);
  }
  const i = PAST.findIndex((x) => x.id === id);
  if (i < 0) return fail('Guest not found', 404);
  PAST.splice(i, 1);
  return wait(null);
}

function ownerCheckInDetails(id) {
  const b = find(id);
  if (!b) return fail('Booking not found', 404);
  const v = view(b);
  const d = DETAILS[b.id];
  return wait({
    booking: { id: b.id, guestName: b.guestName, phone: b.phone, room: b.room, checkIn: b.checkIn, checkOut: v.checkOut, nights: b.nights },
    details: d ? stripId(d) : null,
    identity: identityOf(d),
  });
}

function ownerSaveCheckInDetails(id, x) {
  const b = find(id);
  if (!b) return fail('Booking not found', 404);
  const prev = DETAILS[b.id];
  const type = ID_TYPES[x.idType];
  const num = cleanId(x.idNumber || '');
  if (!(x.fullName || '').trim()) return fail('Enter the full name');
  if (!/^\d{10}$/.test(x.phone || '')) return fail('Phone must be exactly 10 digits');
  if (x.email && !/^\S+@\S+\.\S+$/.test(x.email)) return fail('Email does not look right');
  if (!(x.address || '').trim() || !(x.city || '').trim() || !(x.state || '').trim()) return fail('Address, city and state are required');
  if (x.pin && !/^\d{6}$/.test(x.pin)) return fail('PIN code must be 6 digits');
  if (!type) return fail('Choose an ID type');
  if (num ? !type.test(num) : prev?.idType !== x.idType) return fail(num ? `${type.label} number is not valid` : `Enter the ${type.label} number`);
  if (!(Number(x.adults) >= 1) || Number(x.children) < 0) return fail('Check the number of adults and children');
  if (!(x.comingFrom || '').trim()) return fail('Enter where the guest is coming from');
  if (!PURPOSES.includes(x.purpose)) return fail('Choose a purpose of visit');
  const same = prev?.idType === x.idType;
  b.guestName = x.fullName.trim();
  b.phone = x.phone;
  DETAILS[b.id] = {
    email: x.email || '', address: x.address, city: x.city, state: x.state, pin: x.pin || '', adults: Number(x.adults), children: Number(x.children),
    comingFrom: x.comingFrom, goingTo: x.goingTo || '', purpose: x.purpose, vehicle: x.vehicle || '', foreign: !!x.foreign,
    idType: x.idType, idLast4: num ? num.slice(-4) : prev.idLast4, idFront: same && !!prev.idFront, idBack: same && !!prev.idBack,
  };
  return wait(null);
}

function ownerUploadIdPhoto(id, side) {
  const d = DETAILS[Number(id)];
  if (!d) return fail('Save the check-in details first', 409);
  if (!ID_TYPES[d.idType].photos) return fail('Photos are not kept for this ID type', 400);
  d[side === 'front' ? 'idFront' : 'idBack'] = true;
  return wait(null);
}
const ownerIdPhoto = () => wait(null, 100); // sample data has no real image: the screen draws a placeholder

export const frontDeskMock = {
  ownerReport,
  ownerGuests, ownerGuest, ownerDeleteGuest, ownerCheckInDetails, ownerSaveCheckInDetails, ownerUploadIdPhoto, ownerIdPhoto, ownerFrontDesk, ownerAddBooking, ownerAddPayment, ownerBookingAction, ownerDashboard };
