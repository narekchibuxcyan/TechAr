import { useEffect, useState } from "react";
import { api } from "../../../api/httpClient";
import type { DeviceConnectionLog } from "../../../types";
import { errorTextClass } from "../../ui/formStyles";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass } from "../../ui/tableStyles";

const EVENT_DOT: Record<DeviceConnectionLog["event"], string> = {
  CONNECTED: "bg-emerald-400",
  DISCONNECTED: "bg-gray-600",
  ERROR: "bg-red-500",
  FORCED_STATE_CHANGE: "bg-amber-400",
};

export function ConnectionLogTable({ deviceId }: { deviceId: string }) {
  const [logs, setLogs] = useState<DeviceConnectionLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ logs: DeviceConnectionLog[] }>(`/admin/devices/${deviceId}/logs`)
      .then((data) => setLogs(data.logs))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load logs."));
  }, [deviceId]);

  if (error) return <p className={errorTextClass}>{error}</p>;

  return (
    <div className={`${tableWrapperClass} max-h-64 overflow-y-auto`}>
      <table className={tableClass}>
        <thead className={theadClass}>
          <tr>
            <th className={thClass}>Event</th>
            <th className={thClass}>IP</th>
            <th className={thClass}>Detail</th>
            <th className={thClass}>When</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b border-gray-800/40 last:border-0">
              <td className={tdClass}>
                <span className="inline-flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${EVENT_DOT[l.event]}`} />
                  {l.event}
                </span>
              </td>
              <td className={`${tdClass} font-mono text-xs`}>{l.ipAddress ?? "—"}</td>
              <td className={`${tdClass} max-w-xs truncate`}>{l.detail ?? "—"}</td>
              <td className={tdClass}>{new Date(l.occurredAt).toLocaleString()}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={4} className={tdClass}>
                No connection events recorded.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
