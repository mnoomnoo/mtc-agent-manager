import json
import subprocess
from pathlib import Path

from app.models import DockerResult, ConfigSetStatus, ContainerInfo


def run_compose(cwd: Path, *args: str) -> DockerResult:
    result = subprocess.run(
        ["docker", "compose", *args],
        cwd=str(cwd),
        capture_output=True,
        text=True,
    )
    return DockerResult(
        success=result.returncode == 0,
        stdout=result.stdout,
        stderr=result.stderr,
    )


def get_status(set_path: Path, name: str) -> ConfigSetStatus:
    result = subprocess.run(
        ["docker", "compose", "ps", "--format", "json"],
        cwd=str(set_path),
        capture_output=True,
        text=True,
    )
    running = False
    services: list[str] = []
    containers: list[ContainerInfo] = []
    if result.returncode == 0 and result.stdout.strip():
        raw_containers: list[dict] = []
        try:
            data = json.loads(result.stdout.strip())
            raw_containers = data if isinstance(data, list) else [data]
        except json.JSONDecodeError:
            for line in result.stdout.strip().splitlines():
                if line.strip():
                    try:
                        raw_containers.append(json.loads(line.strip()))
                    except json.JSONDecodeError:
                        pass

        for c in raw_containers:
            svc = c.get("Name", c.get("Service", ""))
            services.append(svc)
            state = c.get("State", c.get("Status", "")).lower()
            if "running" in state:
                running = True

            publishers = c.get("Publishers", [])
            if isinstance(publishers, list) and publishers:
                parts = []
                for p in publishers:
                    pub = p.get("PublishedPort", 0)
                    tgt = p.get("TargetPort", "")
                    proto = p.get("Protocol", "tcp")
                    url = p.get("URL", "")
                    if pub:
                        host = f"{url}:{pub}" if url and url not in ("0.0.0.0", "::") else str(pub)
                        parts.append(f"{host}->{tgt}/{proto}")
                    elif tgt:
                        parts.append(f"{tgt}/{proto}")
                ports = ", ".join(parts)
            else:
                ports = str(c.get("Ports", ""))

            containers.append(ContainerInfo(
                name=svc,
                service=c.get("Service", svc),
                image=c.get("Image", ""),
                state=c.get("State", ""),
                status=c.get("Status", ""),
                ports=ports,
                networks=c.get("Networks", ""),
            ))

    description: str | None = None
    metadata_path = set_path / "metadata.json"
    if metadata_path.exists():
        try:
            meta = json.loads(metadata_path.read_text())
            description = meta.get("description") or None
        except (json.JSONDecodeError, OSError):
            pass

    return ConfigSetStatus(
        name=name,
        path=str(set_path),
        running=running,
        services=[s for s in services if s],
        containers=containers,
        description=description,
    )
