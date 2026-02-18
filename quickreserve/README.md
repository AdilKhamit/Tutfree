# TutFree Platform (MVP v2)

TutFree is a real-time service marketplace for finding free auto services, barbershops, car washes, and similar businesses on top of 2GIS data.

## Implemented in this update
- `TutFree Client` web panel:
  - map with color coding: green/yellow/red;
  - category + "only free now" filter;
  - instant booking.
- `TutFree Business` web panel:
  - mock onboarding account;
  - search venues and claim by 2GIS id;
  - toggle live status: `free_now | next_window | busy`;
  - incoming booking queue with confirm/reject actions.
- Real-time layer (`Socket.IO`):
  - live map status update events;
  - booking events for business subscribers.
- Unified API model:
  - merge static venue data + dynamic TutFree status.

## Run
1. Install dependencies:
```bash
npm install
```
2. Copy env and set values:
```bash
cp .env.example .env
```
3. Start server:
```bash
npm run dev
```
4. Open:
- `http://localhost:8080`

## Key API endpoints
- Client:
  - `GET /api/client/map`
  - `GET /api/client/bookings/:bookingId`
- Business:
  - `POST /api/business/auth/mock`
  - `GET /api/business/search-2gis?q=...`
  - `POST /api/business/claim-point`
  - `PUT /api/business/:twoGisId/live-status`
  - `GET /api/business/:twoGisId/bookings`
  - `POST /api/business/bookings/:bookingId/decision`
- Shared:
  - `POST /api/bookings`
  - `POST /api/sync/2gis`

## Current storage
For speed of development this version keeps data in JSON files:
- `server/data/seed.json`
- `server/data/live-statuses.json`
- `server/data/bookings.json`
- `server/data/claims.json`
- `server/data/business-accounts.json`

## Planned next phase (from this baseline)
- Move repositories to PostgreSQL.
- Move live statuses to Redis with TTL.
- Split backend modules into NestJS bounded contexts.
- Add JWT auth and point ownership verification workflow.

## Python backend (new)
A new backend implementation is available in `backend_py/`:
- FastAPI + PostgreSQL/PostGIS + Redis
- Socket.IO real-time events
- Celery workers for pending slot cleanup and stale status reset

See `backend_py/README.md` for startup and API details.
