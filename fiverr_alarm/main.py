import asyncio
import logging
import logging.handlers
import sys
import time
from pathlib import Path

from .alarm_server import AlarmServer
from .config import Config, load_config
from .listener import AccessDenied, fetch_toasts, request_access
from .matcher import Deduper, is_fiverr
from .notice import Notice

log = logging.getLogger("fiverr_alarm")
POLL_S = 2


async def process_batch(notices: list[Notice], seen: set[int], deduper: Deduper,
                        cfg: Config, now: float, send) -> int:
    sent = 0
    for n in notices:
        if n.id in seen:
            continue
        seen.add(n.id)
        if is_fiverr(n, cfg.keyword) and deduper.should_fire(n, now):
            await send(n.title or "Fiverr", n.body)
            sent += 1
            log.info("alarm: %s | %s", n.title, n.body)
    return sent


async def run(cfg: Config, server: AlarmServer, fetch=fetch_toasts, sleep=asyncio.sleep,
              clock=time.time, max_polls: int | None = None) -> None:
    seen: set[int] | None = None
    deduper = Deduper(cfg.dedupe_s)
    polls = 0
    while max_polls is None or polls < max_polls:
        polls += 1
        try:
            notices = await fetch()
            if seen is None:  # first poll: whatever is already on screen must not ring
                seen = {n.id for n in notices}
            else:
                await process_batch(notices, seen, deduper, cfg, clock(), server.broadcast)
                seen &= {n.id for n in notices}  # forget dismissed ones
        except Exception:
            log.exception("poll failed")
        await sleep(POLL_S)


async def _amain(cfg: Config, test: bool) -> int:
    await request_access()
    server = AlarmServer(cfg.resend_window_s)
    await server.start(port=cfg.port)
    try:
        if test:
            for _ in range(60):
                if server.client_count:
                    break
                await asyncio.sleep(1)
            else:
                print("No phone connected within 60 s.")
                return 1
            await server.broadcast("Test alarm", "From your laptop")
            await asyncio.sleep(1)
            return 0
        await run(cfg, server)
        return 0
    finally:
        await server.stop()


def main(argv: list[str]) -> int:
    handler = logging.handlers.RotatingFileHandler(
        Path(__file__).resolve().parent.parent / "alarm.log", maxBytes=1_000_000, backupCount=3)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logging.basicConfig(level=logging.INFO, handlers=[handler])
    cfg = load_config()
    try:
        return asyncio.run(_amain(cfg, "--test" in argv))
    except AccessDenied:
        print("Allow notification access: Settings > Privacy & security > Notifications, then rerun.")
        return 2
    except OSError:
        print(f"Port {cfg.port} is in use. Close the other copy or set ALARM_PORT.")
        return 2
