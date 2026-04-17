import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from app.config import get_configs_root, load_settings, save_settings
from app.models import BrowseResult, MoveRootRequest, SettingsModel

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsModel)
def get_settings():
    return SettingsModel(**load_settings())


@router.put("", response_model=SettingsModel)
def update_settings(body: SettingsModel):
    save_settings(body.model_dump())
    return body


@router.get("/browse", response_model=BrowseResult)
def browse_directory(path: str = Query(default=None)):
    p = Path(path) if path else Path.home()
    if not p.exists() or not p.is_dir():
        p = Path.home()
    p = p.resolve()

    try:
        dirs = sorted(
            item.name for item in p.iterdir()
            if item.is_dir() and not item.name.startswith(".")
        )
    except PermissionError:
        dirs = []

    parent = str(p.parent) if p.parent != p else None
    return BrowseResult(path=str(p), parent=parent, dirs=dirs)


@router.post("/move-root", response_model=SettingsModel)
def move_root(body: MoveRootRequest):
    new_root = Path(body.new_root.strip())
    if not body.new_root.strip():
        raise HTTPException(status_code=400, detail="New root path is required")

    old_root = get_configs_root()
    if old_root.resolve() == new_root.resolve():
        raise HTTPException(status_code=400, detail="New root is the same as the current root")

    new_root.mkdir(parents=True, exist_ok=True)

    if old_root.exists():
        for item in old_root.iterdir():
            if item.is_dir() and not item.name.startswith("."):
                dest = new_root / item.name
                if dest.exists():
                    raise HTTPException(
                        status_code=409,
                        detail=f"'{item.name}' already exists in the destination",
                    )
                shutil.move(str(item), str(dest))

    save_settings({"configs_root": str(new_root)})
    return SettingsModel(configs_root=str(new_root))
