import os
import time
from pathlib import Path
from typing import Optional


def get_temp_audio_dir() -> str:
    configured = os.getenv("TEMP_AUDIO_DIR", "").strip()
    if configured:
        if configured.startswith("TEMP_AUDIO_DIR="):
            configured = configured.split("=", 1)[1].strip()
        if configured.startswith(("'", '"')) and configured.endswith(("'", '"')) and len(configured) >= 2:
            configured = configured[1:-1].strip()
        path = Path(configured)
    else:
        path = Path(__file__).resolve().parents[1] / "tmp_audio"
    path.mkdir(parents=True, exist_ok=True)
    return str(path)


def cleanup_temp_audio_dir(ttl_seconds: int, now: Optional[float] = None) -> int:
    directory = Path(get_temp_audio_dir())
    if now is None:
        now = time.time()
    deleted = 0
    for child in directory.iterdir():
        try:
            if not child.is_file():
                continue
            age = now - child.stat().st_mtime
            if age >= ttl_seconds:
                child.unlink(missing_ok=True)
                deleted += 1
        except Exception:
            continue
    return deleted
