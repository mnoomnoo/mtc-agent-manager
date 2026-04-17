import json
import os
from pathlib import Path

SETTINGS_FILE = Path(__file__).parent.parent / "settings.json"
DEFAULT_ROOT = os.getenv("CONFIGS_ROOT", str(Path.home() / "Documents" / "mtc-configs"))


def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        return json.loads(SETTINGS_FILE.read_text())
    return {"configs_root": DEFAULT_ROOT}


def save_settings(data: dict) -> None:
    SETTINGS_FILE.write_text(json.dumps(data, indent=2))


def get_configs_root() -> Path:
    return Path(load_settings()["configs_root"])
