import { mock } from './mock';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// The access token lives in memory only. The refresh token should be an httpOnly
// cookie set by the backend, so JavaScript on the page can never read it.
let accessToken = null;
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

function raw(path, { method = 'GET', body } = {}) {
  return fetch(path, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function toError(res) {
  let message = res.statusText || 'Request failed';
  try { message = (await res.json()).message || message; } catch { /* no JSON body */ }
  return Object.assign(new Error(message), { status: res.status });
}

async function refresh() {
  const res = await raw('/api/auth/refresh', { method: 'POST' });
  if (!res.ok) return false;
  accessToken = (await res.json()).accessToken;
  return true;
}

// One automatic retry: if the access token expired, refresh it and try again.
async function request(path, opts) {
  let res = await raw(path, opts);
  if (res.status === 401 && (await refresh())) res = await raw(path, opts);
  if (res.status === 401) { accessToken = null; onUnauthorized(); }
  if (!res.ok) throw await toError(res);
  return res.status === 204 ? null : res.json();
}

const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString();

const real = {
  async login(email, password) {
    const res = await raw('/api/auth/login', { method: 'POST', body: { email, password } });
    if (!res.ok) throw await toError(res);
    const data = await res.json();
    accessToken = data.accessToken;
    return data.user;
  },
  me: () => request('/api/auth/me'),
  async logout() {
    try { await raw('/api/auth/logout', { method: 'POST' }); } finally { accessToken = null; }
  },
  plans: () => request('/api/admin/plans'),
  summary: () => request('/api/admin/summary'),
  hotels: (params) => request('/api/admin/hotels?' + qs(params)),
  hotel: (id) => request(`/api/admin/hotels/${id}`),
  addHotel: (body) => request('/api/admin/hotels', { method: 'POST', body }),
  updateHotel: (id, body) => request(`/api/admin/hotels/${id}`, { method: 'PUT', body }),
  renew: (id) => request(`/api/admin/hotels/${id}/renew`, { method: 'POST' }),
  notifications: () => request('/api/admin/notifications'),
  ackNotifications: (ids) => request('/api/admin/notifications/ack', { method: 'POST', body: { ids } }),
  setPlan: (id, planCode) => request(`/api/admin/hotels/${id}/plan`, { method: 'PATCH', body: { planCode } }),
  setStatus: (id, status, reason) =>
    request(`/api/admin/hotels/${id}/status`, { method: 'PATCH', body: { status, reason } }),
};

export const api = USE_MOCK ? mock : real;
