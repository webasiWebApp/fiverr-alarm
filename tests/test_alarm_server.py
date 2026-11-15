import asyncio
import json

import websockets

from fiverr_alarm.alarm_server import AlarmServer


async def test_broadcast_reaches_client(server, client):
    await asyncio.sleep(0.05)  # let the server register the connection
    aid = await server.broadcast("Fiverr", "hi")
    msg = json.loads(await client.recv())
    assert msg["type"] == "alarm" and msg["id"] == aid and msg["body"] == "hi"


async def test_ack_clears_pending(server, client):
    await asyncio.sleep(0.05)
    aid = await server.broadcast("Fiverr", "hi")
    await client.recv()
    await client.send(json.dumps({"type": "ack", "id": aid}))
    await asyncio.sleep(0.05)
    assert server.pending() == []


async def test_unacked_resent_on_reconnect(server, port):
    aid = await server.broadcast("Fiverr", "missed")  # no client connected
    async with websockets.connect(f"ws://127.0.0.1:{port}") as c:
        assert json.loads(await c.recv())["id"] == aid


async def test_old_pending_expires():
    t = [0.0]
    s = AlarmServer(resend_window_s=600, clock=lambda: t[0])
    await s.broadcast("Fiverr", "x")
    t[0] = 601
    assert s.pending() == []


async def test_ping_pong(server, client):
    await client.send('{"type":"ping"}')
    assert json.loads(await client.recv()) == {"type": "pong"}


async def test_bad_json_ignored(server, client):
    await client.send("not json")
    await client.send('{"type":"ping"}')
    assert json.loads(await client.recv())["type"] == "pong"
