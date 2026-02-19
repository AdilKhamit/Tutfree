from pathlib import Path

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from app.api.routes import auth, business, client, companies
from app.core.config import settings
from app.core.sockets import sio
from app.db.base import Base
from app.db import models  # noqa: F401
from app.db.session import async_engine

app = FastAPI(title=settings.APP_NAME)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(business.router, prefix=settings.API_PREFIX)
app.include_router(client.router, prefix=settings.API_PREFIX)
app.include_router(companies.router)
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.on_event("startup")
async def on_startup() -> None:
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "service": "tutfree-fastapi"}


@app.get("/")
async def root() -> dict:
    return {
        "service": "TutFree FastAPI",
        "health": "/health",
        "docs": "/docs",
        "api_prefix": settings.API_PREFIX,
    }


def _html(path: str) -> HTMLResponse:
    text = Path(path).read_text(encoding="utf-8")
    return HTMLResponse(content=text, media_type="text/html; charset=utf-8")


@app.get("/company")
async def company_page():
    return _html("app/static/company/index.html")


@app.get("/company/dashboard")
async def company_dashboard_page():
    return _html("app/static/company/dashboard.html")


socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
