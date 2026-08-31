import { config } from "./config";

export class DeviceApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function authHeaders(): Record<string, string> {
  return { "X-Device-Id": config.deviceId, "X-Device-Key": config.deviceKey };
}

async function parseErrorBody(res: Response): Promise<string> {
  const body = await res.json().catch(() => undefined);
  return (body as { error?: string } | undefined)?.error ?? res.statusText;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  for (const [key, value] of Object.entries(authHeaders())) headers.set(key, value);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${config.serverUrl}/api/device-agent${path}`, { ...options, headers });

  if (!res.ok) {
    throw new DeviceApiError(res.status, await parseErrorBody(res));
  }
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? ((await res.json()) as T) : (undefined as T);
}

export interface BinaryDownload {
  buffer: Buffer;
  checksum: string | null;
}

export const deviceApi = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),

  async getBinary(path: string): Promise<BinaryDownload> {
    const res = await fetch(`${config.serverUrl}/api/device-agent${path}`, { headers: authHeaders() });
    if (!res.ok) {
      throw new DeviceApiError(res.status, await parseErrorBody(res));
    }
    const arrayBuffer = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), checksum: res.headers.get("x-firmware-checksum-sha256") };
  },
};
