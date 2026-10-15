# Hotel Ops Admin UI (React + Vite)

## Run it
    npm install
    npm run dev          # http://localhost:5173
    npm run dev -- --host   # also reachable from your phone on the same WiFi

It runs on built-in sample data by default (`VITE_USE_MOCK=true` in `.env`). Sign in with any email and the password `admin123`.
In sample-data mode a "Simulate owner edit" button appears in the header so you can see the owner-edit popup.

## Connect the real backend
Set `VITE_USE_MOCK=false` in `.env`, start Spring Boot on port 8080, restart `npm run dev`.
The dev server forwards `/api` to `http://localhost:8080`, so no CORS setup is needed while developing.

## Business rules the backend must enforce (the UI only mirrors them)
- Plans: only `TRIAL` and `STANDARD`.
- Monthly amount = `room_count x price_per_room`. Standard is Rs 100 per room. Trial is free.
- Joining date: set when the hotel is added. A new hotel's plan ends 1 calendar month later (Java: `plusMonths(1)`).
- Trial to Standard: plan end becomes now + 1 month. A Standard hotel can never go back to Trial.
- Renew: new end = max(now, current end) + 1 month. Standard only.
- Owner phone is exactly 10 digits (required). Receptionist phone is 10 digits if given. Pincode is 6 digits if given.
- Expired plans: the UI only shows "Plan ended". Decide on the server whether to suspend automatically or after a grace period.
- Every `/api/admin/*` route allows the ADMIN role only.

## Endpoints
| Method and path | Request | Response |
|---|---|---|
| POST /api/auth/login | `{ email, password }` | `{ accessToken, user: { id, fullName, email, role } }` + httpOnly refresh cookie |
| POST /api/auth/refresh | cookie | `{ accessToken }` |
| POST /api/auth/logout | cookie | 204 |
| GET /api/auth/me | Bearer token | `{ id, fullName, email, role }` |
| GET /api/admin/plans | | `[{ code, name, pricePerRoom, durationMonths }]` |
| GET /api/admin/summary | | `{ totalHotels, activeHotels, trialHotels, endingSoon, monthlyRevenue }` |
| GET /api/admin/hotels?search=&status=&plan=&page=&size= | page starts at 0. Search matches hotel, city, owner name, owner phone | `{ items: [hotel], total }` |
| GET /api/admin/hotels/{id} | | hotel |
| POST /api/admin/hotels | see below, with `planCode` and `joinedAt` ("YYYY-MM-DD") | 201 |
| PUT /api/admin/hotels/{id} | same as POST without `planCode` and `joinedAt` | 204 |
| PATCH /api/admin/hotels/{id}/plan | `{ planCode }` | 204 |
| PATCH /api/admin/hotels/{id}/status | `{ status: "ACTIVE" or "SUSPENDED", reason }` | 204 |
| POST /api/admin/hotels/{id}/renew | | 204 |
| GET /api/admin/notifications | unacknowledged owner edits | `[{ id, hotelId, hotelName, changedBy, changedAt, changes: [{ field, from, to }] }]` |
| POST /api/admin/notifications/ack | `{ ids: [1, 2] }` | 204 |

Hotel request body:
`{ name, addressLine, city, state, pincode, roomCount, planCode, joinedAt, owner: { name, phone, email }, receptionist: { name, phone } }`

Hotel response:
`{ id, name, addressLine, city, state, pincode, roomCount, plan: { code, name, pricePerRoom }, monthlyAmount, status, joinedAt, planEndsAt, owner: { name, phone, email }, receptionist: { name, phone } }`
Dates in responses are ISO timestamps with time zone.

Errors: JSON like `{ "message": "Owner phone must be exactly 10 digits" }` with a matching HTTP status. The UI shows that message.

## Owner-edit popup
When an owner edits their hotel (owner dashboard, later), the backend saves the update and inserts a row in `hotel_change_notifications` in the same transaction. The admin UI checks `GET /api/admin/notifications` every 20 seconds and shows a popup. "Got it" and "Open hotel" call the ack endpoint.

## Where things are
- `src/api.js` the only file that talks to the server (swaps in `src/mock.js` in sample mode)
- `src/pages/Hotels.jsx` dashboard, table, confirmation popups
- `src/components/HotelModal.jsx` details and Edit tabs; `HotelForm.jsx` add/edit form
- `src/components/Countdown.jsx` live plan timer; `OwnerEditAlert.jsx` owner-edit popup
