const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api"

export interface ContainerInfo {
  name: string
  service: string
  image: string
  state: string
  status: string
  ports: string
  networks: string
}

export interface ConfigSetStatus {
  name: string
  path: string
  running: boolean
  services: string[]
  containers: ContainerInfo[]
  description?: string
}

export interface FileContent {
  content: string
}

export interface DockerResult {
  success: boolean
  stdout: string
  stderr: string
}

export interface Settings {
  configs_root: string
  locked?: boolean
}

export interface BrowseResult {
  path: string
  parent: string | null
  dirs: string[]
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  return res.json()
}

export const api = {
  listConfigSets: () => request<ConfigSetStatus[]>("/config-sets"),
  createConfigSet: (name: string) =>
    request<ConfigSetStatus>("/config-sets", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deleteConfigSet: (name: string) =>
    request<{ message: string }>(`/config-sets/${encodeURIComponent(name)}`, { method: "DELETE" }),
  copyConfigSet: (name: string, new_name: string) =>
    request<ConfigSetStatus>(`/config-sets/${encodeURIComponent(name)}/copy`, {
      method: "POST",
      body: JSON.stringify({ new_name }),
    }),
  getStatus: (name: string) =>
    request<ConfigSetStatus>(`/config-sets/${encodeURIComponent(name)}/status`),
  listFiles: (name: string) =>
    request<{ files: string[] }>(`/config-sets/${encodeURIComponent(name)}/files`),
  readFile: (name: string, filePath: string) =>
    request<FileContent>(`/config-sets/${encodeURIComponent(name)}/files/${filePath}`),
  writeFile: (name: string, filePath: string, content: string) =>
    request<{ message: string }>(`/config-sets/${encodeURIComponent(name)}/files/${filePath}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  composeUp: (name: string) =>
    request<DockerResult>(`/config-sets/${encodeURIComponent(name)}/up`, { method: "POST" }),
  composeDown: (name: string) =>
    request<DockerResult>(`/config-sets/${encodeURIComponent(name)}/down`, { method: "POST" }),
  move: (target: string) =>
    request<DockerResult>("/config-sets/move", {
      method: "POST",
      body: JSON.stringify({ target }),
    }),
  getSettings: () => request<Settings>("/settings"),
  updateSettings: (data: Settings) =>
    request<Settings>("/settings", { method: "PUT", body: JSON.stringify(data) }),
  moveRoot: (new_root: string) =>
    request<Settings>("/settings/move-root", { method: "POST", body: JSON.stringify({ new_root }) }),
  browseDir: (path: string) =>
    request<BrowseResult>(`/settings/browse?path=${encodeURIComponent(path)}`),
  updateDescription: (name: string, description: string) =>
    request<{ message: string }>(`/config-sets/${encodeURIComponent(name)}/description`, {
      method: "PUT",
      body: JSON.stringify({ description }),
    }),
}
