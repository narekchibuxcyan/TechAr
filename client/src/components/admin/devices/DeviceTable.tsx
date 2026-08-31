import { useEffect, useState } from "react";
import { api } from "../../../api/httpClient";
import type { Device, DeviceStatus } from "../../../types";
import { DeviceDetailPanel } from "./DeviceDetailPanel";
import { DeviceRegisterModal } from "./DeviceRegisterModal";
import { Badge, deviceStatusTone } from "../../ui/Badge";
import { errorTextClass, inputClass, primaryButtonClass } from "../../ui/formStyles";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, toolbarClass, trClass } from "../../ui/tableStyles";

const STATUS_OPTIONS: (DeviceStatus | "")[] = ["", "ONLINE", "OFFLINE", "DISABLED"];

export function DeviceTable() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<DeviceStatus | "">("");
  const [search, setSearch] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const data = await api.get<{ devices: Device[]; total: number }>(`/admin/devices?${params}`);
      setDevices(data.devices);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <div className={toolbarClass}>
        <input
          className={`${inputClass} w-64`}
          placeholder="Search serial, name, or model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as DeviceStatus | "")}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="rounded-lg border border-gray-800/80 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-700 hover:bg-white/5"
        >
          Search
        </button>
        <button className={`${primaryButtonClass} ml-auto`} onClick={() => setShowRegister(true)}>
          + Register device
        </button>
      </div>

      {error && <p className={`${errorTextClass} mb-4`}>{error}</p>}

      <div className={tableWrapperClass}>
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Serial</th>
              <th className={thClass}>Name</th>
              <th className={thClass}>Model</th>
              <th className={thClass}>Owner</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Firmware</th>
              <th className={thClass}>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id} className={trClass} onClick={() => setSelectedDeviceId(d.id)}>
                <td className={`${tdClass} font-mono text-xs`}>{d.serialNumber}</td>
                <td className={`${tdClass} font-medium text-gray-100`}>{d.name}</td>
                <td className={tdClass}>{d.model}</td>
                <td className={tdClass}>{d.owner ? `${d.owner.fullName} <${d.owner.email}>` : "Unassigned"}</td>
                <td className={tdClass}>
                  <Badge tone={deviceStatusTone(d.status)}>{d.status}</Badge>
                </td>
                <td className={tdClass}>{d.firmwareVersion ?? "—"}</td>
                <td className={tdClass}>{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-600">{total} device(s)</p>

      {selectedDeviceId && (
        <DeviceDetailPanel deviceId={selectedDeviceId} onClose={() => setSelectedDeviceId(null)} onChanged={load} />
      )}

      {showRegister && (
        <DeviceRegisterModal
          onClose={() => setShowRegister(false)}
          onRegistered={() => {
            setShowRegister(false);
            load();
          }}
        />
      )}
    </div>
  );
}
