import json
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.config import get_configs_root
from app.docker_utils import get_status, run_compose
from app.models import (
    ConfigSetStatus,
    CopyRequest,
    CreateRequest,
    DockerResult,
    FileContent,
    MoveRequest,
    UpdateDescriptionRequest,
)
from app.templates import (
    DEFAULT_AGENT_JSON,
    DEFAULT_DEVICES_XML,
    DEFAULT_DOCKER_COMPOSE,
    DEFAULT_ENV,
    DEFAULT_MOSQUITTO_CONF,
)

router = APIRouter(prefix="/config-sets", tags=["config-sets"])

EDITABLE_FILES = [
    "docker-compose.yml",
    ".env",
    "volumes/agent/agent.json",
    "volumes/agent/devices.xml",
    "volumes/mosquitto/config/mosquitto.conf",
]


def _read_metadata(set_path: Path) -> dict:
    meta_path = set_path / "metadata.json"
    if meta_path.exists():
        try:
            return json.loads(meta_path.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def _write_metadata(set_path: Path, data: dict) -> None:
    (set_path / "metadata.json").write_text(json.dumps(data, indent=2))


def _resolve_set(name: str) -> Path:
    root = get_configs_root()
    set_path = (root / name).resolve()
    if not str(set_path).startswith(str(root.resolve())):
        raise HTTPException(status_code=400, detail="Invalid config set name")
    return set_path


def _scaffold_new_set(set_path: Path) -> None:
    (set_path / "volumes" / "agent").mkdir(parents=True, exist_ok=True)
    (set_path / "volumes" / "mosquitto" / "config").mkdir(parents=True, exist_ok=True)
    (set_path / "volumes" / "mosquitto" / "data").mkdir(parents=True, exist_ok=True)
    (set_path / "volumes" / "mosquitto" / "log").mkdir(parents=True, exist_ok=True)
    (set_path / "docker-compose.yml").write_text(DEFAULT_DOCKER_COMPOSE)
    (set_path / ".env").write_text(DEFAULT_ENV)
    (set_path / "volumes" / "agent" / "agent.json").write_text(DEFAULT_AGENT_JSON)
    (set_path / "volumes" / "agent" / "devices.xml").write_text(DEFAULT_DEVICES_XML)
    (set_path / "volumes" / "mosquitto" / "config" / "mosquitto.conf").write_text(DEFAULT_MOSQUITTO_CONF)
    _write_metadata(set_path, {"description": ""})


@router.get("", response_model=list[ConfigSetStatus])
def list_config_sets():
    root = get_configs_root()
    root.mkdir(parents=True, exist_ok=True)
    sets = []
    for d in sorted(root.iterdir()):
        if d.is_dir() and not d.name.startswith("."):
            sets.append(get_status(d, d.name))
    return sets


@router.post("", response_model=ConfigSetStatus)
def create_config_set(req: CreateRequest):
    root = get_configs_root()
    set_path = _resolve_set(req.name)
    if set_path.exists():
        raise HTTPException(status_code=409, detail=f"Config set '{req.name}' already exists")
    _scaffold_new_set(set_path)
    return get_status(set_path, req.name)


@router.delete("/{name}")
def delete_config_set(name: str):
    set_path = _resolve_set(name)
    if not set_path.exists():
        raise HTTPException(status_code=404, detail="Config set not found")
    status = get_status(set_path, name)
    if status.running:
        raise HTTPException(status_code=409, detail="Cannot delete a running config set. Stop it first.")
    shutil.rmtree(set_path)
    return {"message": f"Deleted '{name}'"}


@router.post("/{name}/copy", response_model=ConfigSetStatus)
def copy_config_set(name: str, req: CopyRequest):
    src = _resolve_set(name)
    dst = _resolve_set(req.new_name)
    if not src.exists():
        raise HTTPException(status_code=404, detail="Source config set not found")
    if dst.exists():
        raise HTTPException(status_code=409, detail=f"Config set '{req.new_name}' already exists")
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns("data", "log"))
    return get_status(dst, req.new_name)


@router.get("/{name}/files")
def list_files(name: str):
    set_path = _resolve_set(name)
    if not set_path.exists():
        raise HTTPException(status_code=404, detail="Config set not found")
    present = []
    for f in EDITABLE_FILES:
        file_path = set_path / f
        if file_path.exists():
            present.append(f)
    return {"files": present}


@router.get("/{name}/files/{file_path:path}")
def read_file(name: str, file_path: str):
    set_path = _resolve_set(name)
    full_path = (set_path / file_path).resolve()
    if not str(full_path).startswith(str(set_path.resolve())):
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return {"content": full_path.read_text()}


@router.put("/{name}/files/{file_path:path}")
def write_file(name: str, file_path: str, body: FileContent):
    set_path = _resolve_set(name)
    full_path = (set_path / file_path).resolve()
    if not str(full_path).startswith(str(set_path.resolve())):
        raise HTTPException(status_code=400, detail="Invalid file path")
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_text(body.content)
    return {"message": "Saved"}


@router.get("/{name}/status", response_model=ConfigSetStatus)
def config_set_status(name: str):
    set_path = _resolve_set(name)
    if not set_path.exists():
        raise HTTPException(status_code=404, detail="Config set not found")
    return get_status(set_path, name)


@router.put("/{name}/description")
def update_description(name: str, req: UpdateDescriptionRequest):
    set_path = _resolve_set(name)
    if not set_path.exists():
        raise HTTPException(status_code=404, detail="Config set not found")
    meta = _read_metadata(set_path)
    meta["description"] = req.description
    _write_metadata(set_path, meta)
    return {"message": "Description updated"}


@router.post("/{name}/up", response_model=DockerResult)
def compose_up(name: str):
    set_path = _resolve_set(name)
    if not set_path.exists():
        raise HTTPException(status_code=404, detail="Config set not found")
    return run_compose(set_path, "up", "-d")


@router.post("/{name}/down", response_model=DockerResult)
def compose_down(name: str):
    set_path = _resolve_set(name)
    if not set_path.exists():
        raise HTTPException(status_code=404, detail="Config set not found")
    return run_compose(set_path, "down")


@router.post("/move", response_model=DockerResult)
def move_config_set(req: MoveRequest):
    root = get_configs_root()
    root.mkdir(parents=True, exist_ok=True)
    combined_stdout = ""
    combined_stderr = ""

    # Down all currently running sets
    for d in sorted(root.iterdir()):
        if d.is_dir() and not d.name.startswith("."):
            status = get_status(d, d.name)
            if status.running:
                result = run_compose(d, "down")
                combined_stdout += f"[{d.name}] DOWN\n{result.stdout}\n"
                combined_stderr += result.stderr

    # Up the target
    target_path = _resolve_set(req.target)
    if not target_path.exists():
        raise HTTPException(status_code=404, detail=f"Target config set '{req.target}' not found")
    result = run_compose(target_path, "up", "-d")
    combined_stdout += f"[{req.target}] UP\n{result.stdout}\n"
    combined_stderr += result.stderr

    return DockerResult(
        success=result.success,
        stdout=combined_stdout,
        stderr=combined_stderr,
    )
