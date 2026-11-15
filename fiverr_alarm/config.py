import os
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping


@dataclass
class Config:
    port: int = 8765
    keyword: str = "fiverr"
    dedupe_s: float = 60
    resend_window_s: float = 600


def load_config(env: Mapping[str, str] | None = None) -> Config:
    if env is None:
        from dotenv import load_dotenv

        load_dotenv(Path(__file__).resolve().parent.parent / ".env")
        env = os.environ
    try:
        port = int(env.get("ALARM_PORT", 8765))
    except ValueError:
        port = 8765
    return Config(port=port)
