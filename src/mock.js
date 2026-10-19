// Sample data so the UI runs before the backend exists.
// Every function mirrors one real endpoint in api.js and returns the same shape.
import { addMonths, isPhone } from './util';

const wait = (v, ms = 250) => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));
const fail = (message, status = 400) =>
  new Promise((_, j) => setTimeout(() => j(Object.assign(new Error(message), { status })), 250));

const USER = { id: 1, fullName: 'Admin', email: 'admin@example.com', role: 'ADMIN' };
const OWNER = { id: 2, fullName: 'Rahul Das', email: 'owner@example.com', role: 'OWNER', hotelId: 1 };
const PLANS = [
  { code: 'TRIAL', name: 'Trial', pricePerRoom: 0, durationMonths: 1 },
  { code: 'STANDARD', name: 'Standard', pricePerRoom: 100, durationMonths: 1 },
];
const ago = (days) => new Date(Date.now() - days * 864e5).toISOString();
const inDays = (days) => new Date(Date.now() + days * 864e5).toISOString();

const mk = (id, name, city, roomCount, planCode, status, joined, ends, owner, rec) => ({
  id, name, city, state: 'West Bengal', addressLine: `${10 + id}, Station Road`, pincode: '7000' + (10 + id),
  roomCount, planCode, status, joinedAt: joined, planEndsAt: ends,
  owner: { name: owner[0], phone: owner[1], email: owner[2] },
  receptionists: rec[0] ? [{ name: rec[0], phone: rec[1] }] : [],
});
let nextId = 7;
let HOTELS = [
  mk(1, 'Hotel Sunrise', 'Kolkata', 12, 'STANDARD', 'ACTIVE', ago(75), inDays(12), ['Rahul Das', '9830012345', 'rahul@sunrise.example'], ['Priya Sen', '9830022222']),
  mk(2, 'Lake View Lodge', 'Durgapur', 18, 'STANDARD', 'ACTIVE', ago(40), inDays(3), ['Anil Roy', '9733044120', ''], ['Meena Paul', '9733055555']),
  mk(3, 'Shanti Guest House', 'Asansol', 8, 'TRIAL', 'ACTIVE', ago(20), inDays(10), ['Sonia Khan', '9681055091', ''], ['', '']),
  mk(4, 'Rail Side Inn', 'Howrah', 22, 'STANDARD', 'ACTIVE', ago(100), inDays(25), ['Pradip Dey', '9804067712', 'pradip@railside.example'], ['Amit Ghosh', '9804011111']),
  mk(5, 'City Stay', 'Siliguri', 14, 'STANDARD', 'SUSPENDED', ago(120), ago(9), ['Neha Gupta', '9007012988', ''], ['', '']),
  mk(6, 'Green Leaf Lodge', 'Bardhaman', 10, 'TRIAL', 'ACTIVE', ago(2), inDays(28), ['Imran Ali', '9091033300', ''], ['Raju Das', '9091044400']),
];
let NOTES = [];
let nextNote = 1;
let simN = 0;

const planOf = (code) => PLANS.find((p) => p.code === code);
const view = ({ planCode, ...rest }) => {
  const plan = planOf(planCode);
  return { ...rest, plan, monthlyAmount: plan.pricePerRoom * rest.roomCount };
};
const clean = (b) => ({
  name: b.name?.trim(), addressLine: b.addressLine?.trim(), city: b.city?.trim(), state: b.state?.trim() || '',
  pincode: b.pincode || '', roomCount: Number(b.roomCount),
  owner: { name: b.owner?.name?.trim(), phone: b.owner?.phone || '', email: b.owner?.email?.trim() || '' },
  receptionists: (b.receptionists || []).map((r) => ({ name: (r.name || '').trim(), phone: r.phone || '' })),
});
function problem(b) {
  if (!b.name) return 'Hotel name is required';
  if (!b.addressLine) return 'Address is required';
  if (!b.owner.name) return 'Owner name is required';
  if (!isPhone(b.owner.phone)) return 'Owner phone must be exactly 10 digits';
  if (b.receptionists.length > 5) return 'You can add at most 5 receptionists';
  for (const r of b.receptionists) {
    if (!r.name) return 'Each receptionist needs a name';
    if (!isPhone(r.phone)) return 'Each receptionist phone must be exactly 10 digits';
  }
  if (!(b.roomCount >= 1 && b.roomCount <= 500)) return 'Rooms must be between 1 and 500';
  return '';
}
const LABELS = [
  ['name', 'Hotel name'], ['addressLine', 'Address'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode'],
  ['roomCount', 'Rooms'], ['owner.name', 'Owner name'], ['owner.phone', 'Owner phone'], ['owner.email', 'Owner email'],
['receptionists', 'Receptionists'],
];
const get = (o, path) =>
  path === 'receptionists'
    ? o.receptionists.map((r) => `${r.name} ${r.phone}`).join(', ')
    : path.split('.').reduce((a, k) => a?.[k], o);
export const mock = {
  login: (email, password) => {
    if (password !== 'admin123') return fail('Wrong email or password', 401);
    const user = email.trim().toLowerCase().startsWith('owner') ? OWNER : USER;
    sessionStorage.setItem('mockAdmin', user.role);
    return wait(user);
  },
  me: () => {
    const role = sessionStorage.getItem('mockAdmin');
    if (!role) return fail('Not signed in', 401);
    return wait(role === 'OWNER' ? OWNER : USER, 100);
  },
   logout: () => { sessionStorage.removeItem('mockAdmin'); return wait(null, 100); },
  plans: () => wait(PLANS, 100),
  summary: () => {
    const live = HOTELS.filter((x) => x.status !== 'ARCHIVED');
    const active = live.filter((x) => x.status === 'ACTIVE');
    const soon = active.filter((x) => { const left = new Date(x.planEndsAt) - Date.now(); return left > 0 && left <= 7 * 864e5; });
    return wait({
      totalHotels: live.length,
      activeHotels: active.length,
      trialHotels: live.filter((x) => x.planCode === 'TRIAL').length,
      endingSoon: soon.length,
      monthlyRevenue: active.reduce((s, x) => s + view(x).monthlyAmount, 0),
    });
  },
  hotels: ({ search = '', status = '', plan = '', page = 0, size = 10 }) => {
    const t = search.toLowerCase();
    const rows = HOTELS.filter((x) => x.status !== 'ARCHIVED')
      .filter((x) => !t || `${x.name} ${x.city} ${x.owner.name} ${x.owner.phone}`.toLowerCase().includes(t))
      .filter((x) => !status || x.status === status)
      .filter((x) => !plan || x.planCode === plan);
    return wait({ items: rows.slice(page * size, page * size + size).map(view), total: rows.length });
  },
  hotel: (id) => {
    const h = HOTELS.find((x) => x.id === id);
    return h ? wait(view(h)) : fail('Hotel not found', 404);
  },
  addHotel: (body) => {
    const b = clean(body);
    const err = problem(b);
    if (err) return fail(err);
    const joinedAt = body.joinedAt ? new Date(body.joinedAt + 'T00:00:00').toISOString() : new Date().toISOString();
    HOTELS = [...HOTELS, { ...b, id: nextId++, planCode: body.planCode, status: 'ACTIVE', joinedAt, planEndsAt: addMonths(joinedAt, 1) }];
    return wait(null);
  },
  updateHotel: (id, body) => {
    const b = clean(body);
    const err = problem(b);
    if (err) return fail(err);
    HOTELS = HOTELS.map((x) => (x.id === id ? { ...x, ...b } : x));
    return wait(null);
  },
  setPlan: (id, planCode) => {
    const h = HOTELS.find((x) => x.id === id);
    if (h.planCode === 'STANDARD' && planCode === 'TRIAL') return fail('A hotel cannot go back to the trial');
    HOTELS = HOTELS.map((x) => (x.id === id ? { ...x, planCode, planEndsAt: planCode === 'STANDARD' && x.planCode === 'TRIAL' ? addMonths(new Date().toISOString(), 1) : x.planEndsAt } : x));
    return wait(null);
  },
  setStatus: (id, status) => {
    HOTELS = HOTELS.map((x) => (x.id === id ? { ...x, status } : x));
    return wait(null);
  },
  renew: (id) => {
    const h = HOTELS.find((x) => x.id === id);
    if (h.planCode !== 'STANDARD') return fail('Only Standard plans can be renewed');
    const from = Math.max(Date.now(), new Date(h.planEndsAt).getTime());
    HOTELS = HOTELS.map((x) => (x.id === id ? { ...x, planEndsAt: addMonths(new Date(from).toISOString(), 1) } : x));
    return wait(null);
  },
  notifications: () => wait(NOTES, 100),
  ackNotifications: (ids) => { NOTES = NOTES.filter((n) => !ids.includes(n.id)); return wait(null, 100); },
  // Demo only: pretends the owner of Hotel Sunrise edited their details.
  simulateOwnerEdit: () => {
    const names = ['Meena Paul', 'Amit Ghosh', 'Priya Sen'];
    const before = HOTELS[0];
    const nextName = names[simN++ % names.length];
    const after = {
  ...before,
  receptionists: [{ name: nextName, phone: before.receptionists[0]?.phone || '9830099999' }, ...before.receptionists.slice(1)],
  addressLine: `${10 + simN}, Park Street`,
};
    const changes = LABELS.map(([p, label]) => ({ field: label, from: get(before, p), to: get(after, p) }))
      .filter((c) => String(c.from) !== String(c.to));
    NOTES = [...NOTES, { id: nextNote++, hotelId: before.id, hotelName: before.name, changedBy: before.owner.name, changedAt: new Date().toISOString(), changes }];
    return wait(null, 100);
  },
};
