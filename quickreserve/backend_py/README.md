# TutFree Python Backend

FastAPI backend for TutFree with PostgreSQL/PostGIS, Redis, Socket.IO, and Celery.

## Stack
- Python 3.10+
- FastAPI (async)
- PostgreSQL + PostGIS
- Redis
- python-socketio
- Celery + Redis beat

## Run (Docker)
```bash
docker compose up --build
```

API: `http://localhost:8000`
Socket.IO endpoint is mounted in the same ASGI app.

## Auth bootstrap
Use mock token endpoint for development:
- `POST /v1/auth/mock-token?phone=...&name=...&role=business|client`

## Required endpoints implemented
- `POST /v1/business/register`
- `PATCH /v1/business/status`
- `GET /v1/business/my-bookings`
- `GET /v1/client/map/nearby`
- `GET /v1/client/place/{id}/slots`
- `POST /v1/client/booking/reserve`

## Core algorithms
1. Instant appearance after business register:
- insert org in PostgreSQL
- set live status in Redis
- broadcast `new_place_added` to `city:{city}` room

2. Aggregator search flow:
- query 2GIS by location/category
- read live statuses from Redis by `gis_id`
- return merged JSON

3. Conflict prevention on booking:
- atomic `UPDATE slots ... WHERE status='available'`
- set `pending_until = now + 5 minutes`
- create booking row only if update succeeded

## Worker tasks
- every 10 min: release expired `pending` slots back to `available`
- every 2h: reset stale `free` live statuses to `unknown`
