import json
import os
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv

load_dotenv()

_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_CACHE = _REPO_ROOT / "data" / "college_cache.json"
_CACHE_PATH = Path(os.getenv("COLLEGE_CACHE_PATH", _DEFAULT_CACHE))


def _ensure_parent():
    """Create the parent directory so cache saves do not fail."""
    _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)


def load_cache() -> Dict[str, Any]:
    if not _CACHE_PATH.exists():
        return {}

    try:
        with _CACHE_PATH.open("r", encoding="utf-8") as cache_file:
            return json.load(cache_file)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to load cache from {_CACHE_PATH}: {exc}")
        return {}


def save_cache(cache: Dict[str, Any]) -> None:
    _ensure_parent()
    try:
        with _CACHE_PATH.open("w", encoding="utf-8") as cache_file:
            json.dump(cache, cache_file, ensure_ascii=False, indent=2)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to save cache to {_CACHE_PATH}: {exc}")

