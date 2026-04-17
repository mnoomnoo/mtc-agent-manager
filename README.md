# MTConnect Agent Config Manager

A web-based tool for managing multiple [MTConnect Agent](https://github.com/mtconnect/cppagent) deployment configurations. Switch between Agent configurations with a single click. The app stops the currently running Agent then starts a new one with a different configuration automatically.

---

## What It Does

An MTConnect deployment is a directory (a "config set") containing everything needed to run an agent:

```
my-config-set/
├── docker-compose.yml          # Service definitions (agent + mosquitto)
├── .env                        # Environment variables
├── metadata.json               # Description (managed by the app)
└── volumes/
    ├── agent/
    │   ├── agent.json          # MTConnect agent configuration
    │   └── devices.xml         # Device & data item definitions
    └── mosquitto/
        └── config/
            └── mosquitto.conf  # MQTT broker settings
```

This app lets you maintain a library of these config sets and:

- **Switch** between them with one click — stops ALL running sets, then starts the target (atomic)
- **Edit** any config file in a browser-based code editor with syntax highlighting
- **Add** new config sets from a built-in template
- **Copy** an existing config set as a starting point (excludes runtime data directories)
- **Delete** config sets (requires typing the name to confirm; blocked if running)
- **Describe** config sets — add a short description via inline editing on each card
- **Monitor** running status — the dashboard polls every 10 seconds
- **Migrate** your entire config library to a new directory from the Settings page

---

## Requirements

- **Docker** with the Compose plugin (`docker compose`)

---

## Running with Docker (recommended)

```bash
docker compose up --build
```

Then open **http://localhost** in your browser.

To stop:
```bash
docker compose down
```

### Config sets directory

By default, the app looks for config sets in `~/Documents/mtc-configs` on the host. To use a different directory, set `CONFIGS_ROOT` before running:

```bash
CONFIGS_ROOT=/path/to/your/configs docker compose up --build
```

When `CONFIGS_ROOT` is set, the Settings page shows the path as read-only — change it by updating `docker-compose.yml` or the environment variable.

---

## Running locally (development)

**Requirements:** Node.js 18+, Python 3.11+

### 1. Install dependencies

```bash
cd frontend && npm install && cd ..
cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt && cd ..
```

### 2. Start both servers

```bash
./start.sh
```

Then open **http://localhost:5173** in your browser.

| Service     | URL                        |
|-------------|----------------------------|
| Frontend    | http://localhost:5173      |
| Backend API | http://localhost:8000      |
| API docs    | http://localhost:8000/docs |

### Config sets root directory

By default the app uses `~/Documents/mtc-configs`. Change this any time via the **Settings** page in the UI.

### Migrating the library to a new location

From the Settings page, click **Change** to browse to a new directory:

- **Yes, move contents** — moves all config set subdirectories to the new path. Aborts if a name conflict is detected.
- **No, just update path** — updates the stored path without moving files. Use this if you already moved the directory manually.

---

## Usage Notes

### Switching config sets (Switch To)

The **Switch To** button performs an atomic switch: it calls `docker compose down` on every currently running config set, then calls `docker compose up -d` on the target. The full docker-compose output is shown in the confirmation dialog.

### Copying a config set

The copy operation excludes any `data` and `log` subdirectories so that runtime state (broker persistence, logs) is not carried over into the new set.

### Deleting a config set

The Delete button is disabled for running sets. After clicking Delete, you must type the exact config set name before the confirm button becomes active. Deletion is permanent — there is no undo.

### Descriptions

Each card has an inline **Edit** link next to the description. The text is saved to `metadata.json` inside the config set directory. Descriptions survive copy operations and appear on the dashboard card.

### Auto-refresh

The dashboard and the editor page both poll for status every 10 seconds. Running/stopped badges update automatically without a manual refresh.

---

## API Reference

The FastAPI backend serves a fully documented REST API. Visit **http://localhost:8000/docs** for the interactive Swagger UI.

All file path parameters are validated server-side to prevent path traversal outside the config set directory.

| Method   | Path                                    | Description                                           |
|----------|-----------------------------------------|-------------------------------------------------------|
| `GET`    | `/api/health`                           | Health check                                          |
| `GET`    | `/api/config-sets`                      | List all config sets with docker status               |
| `POST`   | `/api/config-sets`                      | Create a new config set from template                 |
| `DELETE` | `/api/config-sets/{name}`               | Delete a config set (blocked if running)              |
| `POST`   | `/api/config-sets/{name}/copy`          | Copy a config set to a new name                       |
| `GET`    | `/api/config-sets/{name}/status`        | Get docker compose status for one set                 |
| `PUT`    | `/api/config-sets/{name}/description`   | Update the description stored in metadata.json        |
| `GET`    | `/api/config-sets/{name}/files`         | List editable files in a config set                   |
| `GET`    | `/api/config-sets/{name}/files/{path}`  | Read a file's content                                 |
| `PUT`    | `/api/config-sets/{name}/files/{path}`  | Write/save a file                                     |
| `POST`   | `/api/config-sets/{name}/up`            | `docker compose up -d`                                |
| `POST`   | `/api/config-sets/{name}/down`          | `docker compose down`                                 |
| `POST`   | `/api/config-sets/move`                 | Stop all running sets, start the target               |
| `GET`    | `/api/settings`                         | Get current settings                                  |
| `PUT`    | `/api/settings`                         | Update settings (path only, no file migration)        |
| `GET`    | `/api/settings/browse`                  | Browse the filesystem for directory selection         |
| `POST`   | `/api/settings/move-root`               | Migrate config library to a new directory             |

---

## Troubleshooting

### Docker not running or not found

The app calls `docker compose` as a subprocess. If Docker is not running or not on the system PATH, compose operations will fail.

- Verify Docker is running: `docker info`
- Verify the Compose plugin is available: `docker compose version`
- On Linux, ensure your user is in the `docker` group: `sudo usermod -aG docker $USER` (log out and back in to apply)

### Permission errors on the config directory

If the backend cannot read or write `~/Documents/mtc-configs/`, check directory ownership:

```bash
sudo chown -R $USER:$USER ~/Documents/mtc-configs
```

### Port conflicts

The default template binds the MTConnect agent to host port `5000` and mosquitto to ports `1883` and `9001`. If another process is using those ports, `docker compose up` will fail. Edit `docker-compose.yml` in the affected config set to remap the host-side ports.

To find what is using a port:
```bash
sudo ss -tlnp | grep 5000
```

### Backend fails to start

Ensure the virtual environment is activated and dependencies are installed:

```bash
cd backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt
venv/bin/uvicorn app.main:app --reload --port 8000
```

### Frontend can't reach the backend

**Docker:** Nginx proxies `/api/*` to the backend container internally. If the backend is failing, check `docker compose logs backend`.

**Local dev:** The frontend targets `http://localhost:8000`. The backend CORS policy allows `localhost:5173` and `localhost:4173`. Both servers must be running on those exact ports.

---

## Tech Stack

| Layer              | Technology                               |
|--------------------|------------------------------------------|
| Frontend framework | React 18 + TypeScript (Vite)             |
| UI components      | Chakra UI v3                             |
| Code editor        | CodeMirror 6 via `@uiw/react-codemirror` |
| Server state       | TanStack Query (React Query)             |
| Routing            | React Router v6                          |
| Backend            | Python FastAPI                           |
| ASGI server        | Uvicorn                                  |
| Container management | Docker Compose (via subprocess)        |
