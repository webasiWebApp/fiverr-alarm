import asyncio
import json
import logging
import time
import uuid

import websockets

log = logging.getLogger("fiverr_alarm")


class AlarmServer:
    def __init__(self, resend_window_s: float = 600, clock=time.time):
        self.resend_window_s = resend_window_s
        self.clock = clock
        self._clients: set = set()
        self._pending: dict[str, dict] = {}
        self._server = None

    @property
    def port(self) -> int:
        return self._server.sockets[0].getsockname()[1]

    @property
    def client_count(self) -> int:
        return len(self._clients)

    async def start(self, host: str = "0.0.0.0", port: int = 8765) -> None:
        self._server = await websockets.serve(self._handle, host, port)  # raises OSError if busy

    async def stop(self) -> None:
        if self._server:
            self._server.close()
            await self._server.wait_closed()

    def pending(self) -> list[dict]:
        now = self.clock()
        self._pending = {i: m for i, m in self._pending.items() if now - m["ts"] <= self.resend_window_s}
        return list(self._pending.values())

    def ack(self, alarm_id: str) -> None:
        self._pending.pop(alarm_id, None)

    async def broadcast(self, title: str, body: str) -> str:
        alarm_id = uuid.uuid4().hex
        msg = {"type": "alarm", "id": alarm_id, "title": title, "body": body, "ts": self.clock()}
        self._pending[alarm_id] = msg
        for ws in list(self._clients):
            await self._send(ws, msg)
        return alarm_id

    async def _send(self, ws, msg: dict) -> None:
        try:
            await ws.send(json.dumps(msg))
        except Exception:
            self._clients.discard(ws)

    async def _handle(self, ws) -> None:
        self._clients.add(ws)
        try:
            for msg in self.pending():  # re-send alarms the phone missed
                await self._send(ws, msg)
            async for raw in ws:
                try:
                    data = json.loads(raw)
                except (TypeError, ValueError):
                    continue
                kind = data.get("type") if isinstance(data, dict) else None
                if kind == "ping":
                    await self._send(ws, {"type": "pong"})
                elif kind == "ack":
                    self.ack(str(data.get("id", "")))
        except websockets.ConnectionClosed:
            pass
        finally:
            self._clients.discard(ws)
