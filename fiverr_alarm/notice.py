from dataclasses import dataclass


@dataclass(frozen=True)
class Notice:
    id: int
    app: str
    title: str
    body: str
