import { request } from '../api';

const MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ---------- real server calls (used when VITE_USE_MOCK=false) ----------
const real = {
  hotel: () => request('/api/owner/hotel'),
  updateHotel: (body) => request('/api/owner/hotel', { method: 'PUT', body }),
  access: () => request('/api/owner/access'),
  setAccess: (body) => request('/api/owner/access', { method: 'PUT', body }),
  summary: () => request('/api/owner/summary'), // may answer 404 until check-ins are recorded
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
const SUMMARY = {
  roomsFree: 4, roomsOccupied: 6, roomsCleaning: 2, checkInsToday: 3, collectedToday: 8500, balanceDue: 4500,
  weekCheckIns: [3, 5, 2, 6, 4, 7, 3], // last 7 days, today is the last one
};

const mock = {
  hotel: () => wait(HOTEL),
  access: () => wait(ACCESS, 100),
  summary: () => wait(SUMMARY),
  setAccess: (a) => { ACCESS = { ...ACCESS, ...a }; return wait(null, 150); },
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
