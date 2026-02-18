import socketio

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


async def emit_new_place_added(city: str, payload: dict) -> None:
    await sio.emit("new_place_added", payload, room=f"city:{city}")


async def emit_live_status_changed(city: str, payload: dict) -> None:
    await sio.emit("live_status_changed", payload, room=f"city:{city}")


@sio.event
async def connect(sid, _environ, _auth):
    return True


@sio.event
async def subscribe_city(sid, data):
    city = (data or {}).get("city")
    if city:
        await sio.enter_room(sid, f"city:{city}")


@sio.event
async def disconnect(_sid):
    return
