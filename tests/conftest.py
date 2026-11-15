import pytest
import websockets

from fiverr_alarm.alarm_server import AlarmServer


@pytest.fixture
async def server():
    s = AlarmServer()
    await s.start("127.0.0.1", 0)
    yield s
    await s.stop()


@pytest.fixture
def port(server):
    return server.port


@pytest.fixture
async def client(server, port):
    async with websockets.connect(f"ws://127.0.0.1:{port}") as c:
        yield c
