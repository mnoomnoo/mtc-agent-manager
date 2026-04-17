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

- **Node.js** 18+ and **npm**
- **Python** 3.11+
- **Docker** with the Compose plugin (`docker compose`)

---

## Setup

### 1. Clone / navigate to the project

```bash
cd /path/to/mtc-agent-manager
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Create a Python virtual environment and install backend dependencies

```bash
cd backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt
cd ..
```

---

## Running

Use the included start script to launch both servers at once:

```bash
./start.sh
```

Then open **http://localhost:5173** in your browser.

| Service     | URL                        |
|-------------|----------------------------|
| Frontend    | http://localhost:5173      |
| Backend API | http://localhost:8000      |
| API docs    | http://localhost:8000/docs |

Press `Ctrl+C` to stop both servers.

### Running servers individually

**Backend:**
```bash
cd backend
venv/bin/uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

---

## Configuration

### Config sets root directory

By default, the app looks for config sets in:

```
~/Documents/mtc-configs/
```

Each subdirectory inside that path is treated as a config set. Change this path any time via the **Settings** page in the UI.

An example config set (`MTC-Agent-Config-stats`) is included at the default root so the dashboard is populated on first launch.

### Migrating the library to a new location

From the Settings page, click **Change** to browse to a new directory. You are then offered two choices:

- **Yes, move contents** — physically moves all config set subdirectories to the new path and updates the setting. The backend detects conflicts (a directory with the same name already exists at the destination) and aborts before moving anything.
- **No, just update path** — updates the stored path without moving any files. Use this if you have already moved the directory manually or want to point the app at a pre-existing library.

### Backend settings file

The root directory path is persisted to `backend/settings.json`. You can edit it directly if needed (restart the backend to pick up manual changes):

```json
{
  "configs_root": "/home/youruser/Documents/mtc-configs"
}
```

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

## Project Structure

```
mtc-agent-manager/
├── start.sh                    # Convenience script to run both servers
│
├── backend/
│   ├── requirements.txt
│   ├── settings.json           # Created on first run (configurable root path)
│   └── app/
│       ├── main.py             # FastAPI app + CORS
│       ├── config.py           # Settings load/save
│       ├── models.py           # Pydantic models
│       ├── docker_utils.py     # docker compose subprocess helpers
│       ├── templates.py        # Default file content for new config sets
│       └── api/routes/
│           ├── config_sets.py  # Config set endpoints
│           └── settings_route.py
│
└── frontend/
    └── src/
        ├── api.ts              # Typed fetch wrapper for the backend
        ├── toaster.tsx         # Chakra UI toast setup
        ├── App.tsx             # Router shell
        ├── components/
        │   ├── Navbar.tsx
        │   ├── ConfigSetCard.tsx
        │   ├── NewConfigSetModal.tsx
        │   ├── CopyModal.tsx
        │   ├── DeleteDialog.tsx
        │   └── MoveDialog.tsx  # Switch confirmation with compose log output
        └── pages/
            ├── Dashboard.tsx   # Config set card grid
            ├── EditorPage.tsx  # File tree + CodeMirror editor
            └── SettingsPage.tsx
```

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

The frontend targets `http://localhost:8000` as the API base URL. The backend CORS policy allows `localhost:5173` and `localhost:4173`. Both servers must be running on those exact ports.

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
