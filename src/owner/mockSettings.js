// Sample data for the owner Settings: hotel details and the subscription. (Rooms and rates live in mockFrontDesk.js
// because the Front desk reads the same rooms.)
import { addDays, todayYmd } from './dates';

const wait = (v, ms = 250) => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));
const fail = (message, status = 400) =>
  new Promise((_, j) => setTimeout(() => j(Object.assign(new Error(message), { status })), 250));

export const PLAN = { name: 'Standard', roomLimit: 12 };
const HOTEL = { name: 'Hotel Sunrise', address: 'Station Road, Asansol', phone: '9830000000', checkInTime: '12:00', checkOutTime: '11:00' };
const SUB = { status: 'ACTIVE', endsInDays: 5, paymentLines: [] };
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function ownerHotel() {
  return wait({ ...HOTEL, plan: PLAN, subscription: { status: SUB.status, endsOn: addDays(todayYmd(), SUB.endsInDays) }, paymentLines: SUB.paymentLines });
}

function ownerUpdateHotel(b) {
  const name = (b.name || '').trim();
  const address = (b.address || '').trim();
  if (name.length < 2 || name.length > 60) return fail('Enter the hotel name');
  if (!address || address.length > 200) return fail('Enter the address');
  if (!/^\d{10}$/.test(b.phone || '')) return fail('Phone must be exactly 10 digits');
  if (!TIME.test(b.checkInTime || '')) return fail('Enter the check-in time');
  if (!TIME.test(b.checkOutTime || '')) return fail('Enter the check-out time');
  Object.assign(HOTEL, { name, address, phone: b.phone, checkInTime: b.checkInTime, checkOutTime: b.checkOutTime });
  return wait(null);
}

export const settingsMock = { ownerHotel, ownerUpdateHotel };
