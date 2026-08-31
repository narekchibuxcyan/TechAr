import { useEffect, useState } from "react";
import { api, ApiError } from "../../../api/httpClient";
import type { Device, DeviceStatus, User } from "../../../types";
import { ConnectionLogTable } from "./ConnectionLogTable";
import { Drawer, DrawerClose } from "../../ui/Drawer";
import { Badge, deviceStatusTone } from "../../ui/Badge";
import { UserPicker } from "../../ui/UserPicker";
import { errorTextClass, secondaryButtonClass } from "../../ui/formStyles";

interface Props {
  deviceId: string;
  onClose: () => void;
  onChanged: () => void;
}

export function DeviceDetailPanel({ deviceId, onClose, onChanged }: Props) {
  const [device, setDevice] = useState<Device | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api
      .get<{ device: Device }>(`/admin/devices/${deviceId}`)
      .then((data) => {
        setDevice(data.device);
        setSelectedOwnerId(data.device.ownerId ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load device."));
  }

  useEffect(load, [deviceId]);

  useEffect(() => {
    api
      .get<{ users: User[] }>("/admin/users?pageSize=100")
      .then((data) => setUsers(data.users))
      .catch(() => setUsers([]));
  }, []);

  async function reassign() {
    setBusy(true);
    setError(null);
    try {
      const data = await api.patch<{ device: Device }>(`/admin/devices/${deviceId}/assign`, {
        ownerId: selectedOwnerId,
      });
      setDevice(data.device);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reassign device.");
    } finally {
      setBusy(false);
    }
  }

  async function forceState(status: DeviceStatus) {
    if (!confirm(`Force this device's state to ${status}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api.patch<{ device: Device }>(`/admin/devices/${deviceId}/state`, { status });
      setDevice(data.device);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change device state.");
    } finally {
      setBusy(false);
    }
  }

  const ownerChanged = device && selectedOwnerId !== (device.ownerId ?? null);

  return (
    <Drawer onClose={onClose} widthClassName="w-full max-w-lg">
      <DrawerClose onClose={onClose} />

      {!device && !error && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className={errorTextClass}>{error}</p>}

      {device && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-white">{device.name}</h2>
            <p className="font-mono text-sm text-gray-500">{device.serialNumber}</p>
          </div>

          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-gray-500">Model</dt>
            <dd className="text-gray-300">{device.model}</dd>
            <dt className="text-gray-500">Hardware revision</dt>
            <dd className="text-gray-300">{device.hardwareRevision ?? "—"}</dd>
            <dt className="text-gray-500">Status</dt>
            <dd>
              <Badge tone={deviceStatusTone(device.status)}>{device.status}</Badge>
            </dd>
            <dt className="text-gray-500">Firmware</dt>
            <dd className="text-gray-300">{device.firmwareVersion ?? "—"}</dd>
            <dt className="text-gray-500">Last seen</dt>
            <dd className="text-gray-300">{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Never"}</dd>
          </dl>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Change owner</h3>
            <p className="mb-2 text-sm text-gray-400">
              Current owner:{" "}
              <span className="font-medium text-gray-200">
                {device.owner ? `${device.owner.fullName} <${device.owner.email}>` : "Unassigned"}
              </span>
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <UserPicker users={users} value={selectedOwnerId} onChange={setSelectedOwnerId} placeholder="Search users…" />
              </div>
              <button disabled={busy || !ownerChanged} onClick={reassign} className={secondaryButtonClass}>
                Save
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Force device state</h3>
            <div className="flex flex-wrap gap-2">
              {(["ONLINE", "OFFLINE", "DISABLED"] as DeviceStatus[]).map((s) => (
                <button key={s} disabled={busy || device.status === s} onClick={() => forceState(s)} className={secondaryButtonClass}>
                  Force {s}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Connection log</h3>
            <ConnectionLogTable deviceId={device.id} />
          </section>
        </div>
      )}
    </Drawer>
  );
}
