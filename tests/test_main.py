import pytest

from fiverr_alarm import main as main_mod
from fiverr_alarm.alarm_server import AlarmServer
from fiverr_alarm.config import Config
from fiverr_alarm.listener import AccessDenied
from fiverr_alarm.main import process_batch, run
from fiverr_alarm.matcher import Deduper
from fiverr_alarm.notice import Notice

CFG = Config()


class FakeServer:
    def __init__(self):
        self.sent = []

    async def broadcast(self, title, body):
        self.sent.append(body)
        return "id"


async def _nosleep(_):
    pass


async def test_same_id_fires_once():
    seen, d, sent = set(), Deduper(), []

    async def send(t, b):
        sent.append(b)

    n = Notice(1, "Phone Link", "Fiverr", "a")
    await process_batch([n], seen, d, CFG, 0, send)
    await process_batch([n], seen, d, CFG, 3, send)
    assert sent == ["a"]


async def test_non_fiverr_ignored():
    sent = []

    async def send(t, b):
        sent.append(b)

    n = await process_batch([Notice(2, "Phone Link", "WhatsApp", "x")], set(), Deduper(), CFG, 0, send)
    assert n == 0 and sent == []


async def test_existing_toasts_ignored_on_start():
    srv = FakeServer()

    async def fetch():
        return [Notice(1, "Phone Link", "Fiverr", "old")]

    await run(CFG, srv, fetch=fetch, sleep=_nosleep, max_polls=1)
    assert srv.sent == []


async def test_new_toast_after_start_rings():
    srv, polls = FakeServer(), [[], [Notice(5, "Phone Link", "Fiverr", "new")]]

    async def fetch():
        return polls.pop(0)

    await run(CFG, srv, fetch=fetch, sleep=_nosleep, max_polls=2)
    assert srv.sent == ["new"]


async def test_fetch_error_keeps_running():
    calls = []

    async def fetch():
        calls.append(1)
        if len(calls) == 2:
            raise RuntimeError("boom")
        return []

    await run(CFG, FakeServer(), fetch=fetch, sleep=_nosleep, max_polls=4)
    assert len(calls) == 4


def test_access_denied_exits_2(monkeypatch, capsys):
    async def deny():
        raise AccessDenied()

    monkeypatch.setattr(main_mod, "request_access", deny)
    assert main_mod.main([]) == 2
    assert "Allow notification access" in capsys.readouterr().out


def test_port_busy_exits_2(monkeypatch, capsys):
    async def ok():
        pass

    async def busy(self, *a, **k):
        raise OSError()

    monkeypatch.setattr(main_mod, "request_access", ok)
    monkeypatch.setattr(AlarmServer, "start", busy)
    assert main_mod.main([]) == 2
    assert "Port 8765 is in use" in capsys.readouterr().out
