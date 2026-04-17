from pydantic import BaseModel
from typing import Optional


class ContainerInfo(BaseModel):
    name: str
    service: str
    image: str
    state: str
    status: str
    ports: str
    networks: str


class ConfigSetStatus(BaseModel):
    name: str
    path: str
    running: bool
    services: list[str]
    containers: list[ContainerInfo]
    description: Optional[str] = None


class FileContent(BaseModel):
    content: str


class CopyRequest(BaseModel):
    new_name: str


class CreateRequest(BaseModel):
    name: str


class MoveRequest(BaseModel):
    target: str


class UpdateDescriptionRequest(BaseModel):
    description: str


class SettingsModel(BaseModel):
    configs_root: str


class MoveRootRequest(BaseModel):
    new_root: str


class BrowseResult(BaseModel):
    path: str
    parent: str | None
    dirs: list[str]


class DockerResult(BaseModel):
    success: bool
    stdout: str
    stderr: str
