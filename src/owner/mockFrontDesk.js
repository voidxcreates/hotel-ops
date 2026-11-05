// Sample data for the owner Front desk and the owner Dashboard, so the UI works before the backend exists.
// Dashboard numbers are worked out from the SAME bookings, so what you do on the Front desk shows up there.
import { addDays, todayYmd } from './dates';

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
const BOOKINGS = [];
function seed(guestName, room, offset, nights, paid, status, phone = '9830012345') {
  const b = { id: nextId++, guestName, phone, room, checkIn: addDays(todayYmd(), offset), nights, status, payments: [] };
  if (paid) b.payments.push({ id: nextPay++, kind: 'DEPOSIT', category: 'Advance received', amount: paid });
  BOOKINGS.push(b);
}
seed('R. Das', '101', -2, 4, 4500, 'CHECKED_IN');
seed('A. Khan', '106', -3, 3, 2700, 'CHECKED_IN');
seed('S. Roy', '108', -1, 4, 7500, 'CHECKED_IN');
seed('P. Dey', '111', -2, 3, 6000, 'CHECKED_IN');
seed('Sen', '103', -1, 1, 0, 'CHECKED_IN');
seed('Paul', '109', -1, 1, 900, 'CHECKED_IN');
seed('Mitra', '102', 0, 2, 1000, 'RESERVED');
seed('Gupta', '104', 0, 2, 0, 'RESERVED');
seed('Bose', '107', 0, 3, 4500, 'RESERVED');
seed('Sharma', '110', 1, 4, 1000, 'RESERVED');
seed('D. Roy', '106', 2, 3, 0, 'RESERVED');
seed('Ghosh', '105', 2, 2, 500, 'RESERVED');
seed('Iyer', '102', 3, 3, 0, 'RESERVED');
seed('Nandi', '107', 4, 2, 1000, 'RESERVED');
seed('Jain', '103', 5, 2, 1500, 'RESERVED');

// The money is always worked out from the payment list, never stored twice.
function view(b) {
  const total = b.nights * rateOf(b.room);
  const sum = (f) => b.payments.filter(f).reduce((s, p) => s + p.amount, 0);
  const paid = sum((p) => p.kind !== 'DISCOUNT');
  const discount = sum((p) => p.kind === 'DISCOUNT');
  const balance = Math.max(total - discount - paid, 0);
  return {
    ...b, checkOut: addDays(b.checkIn, b.nights), total, paid, discount, balance,
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
  const b = { id: nextId++, guestName, phone: body.phone || '', room: body.room, checkIn: body.checkIn, nights, status: 'RESERVED', payments: [] };
  if (advance) b.payments.push({ id: nextPay++, kind: 'DEPOSIT', category: 'Advance received', amount: advance });
  BOOKINGS.push(b);
  return wait(null);
}

function ownerAddPayment(id, { kind, amount }) {
  const b = find(id);
  if (!b) return fail('Booking not found', 404);
  const v = view(b);
  const n = Number(amount);
  if (!LABEL[kind]) return fail('Unknown payment type');
  if (!(n > 0)) return fail('Type an amount first');
  if (kind === 'REFUND' && n > v.paid) return fail('You cannot refund more than was paid');
  if ((kind === 'DISCOUNT' || kind === 'PAYMENT') && n > v.balance) return fail(`That is more than the balance due (${inr(v.balance)})`);
  b.payments.push({ id: nextPay++, kind, category: LABEL[kind], amount: kind === 'REFUND' ? -n : n });
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

export const frontDeskMock = { ownerFrontDesk, ownerAddBooking, ownerAddPayment, ownerBookingAction, ownerDashboard };
