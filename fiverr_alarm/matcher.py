from .notice import Notice


def is_fiverr(n: Notice, keyword: str = "fiverr", source_app: str = "phone link") -> bool:
    # shortcut: field choice is a guess until NOTES.md from the spike confirms the real shape
    if source_app not in n.app.lower():
        return False
    return keyword in f"{n.app} {n.title} {n.body}".lower()


class Deduper:
    def __init__(self, window_s: float = 60):
        self.window_s = window_s
        self._last: dict[tuple[str, str], float] = {}

    def should_fire(self, n: Notice, now: float) -> bool:
        self._last = {k: t for k, t in self._last.items() if now - t <= self.window_s}
        key = (n.title, n.body)
        if key in self._last:
            return False
        self._last[key] = now
        return True
