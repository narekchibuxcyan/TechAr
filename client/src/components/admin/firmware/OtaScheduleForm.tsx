import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../../../api/httpClient";
import type { Device, Firmware, FirmwareUpdateJob } from "../../../types";
import { Badge, otaStatusTone } from "../../ui/Badge";
import { errorTextClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../ui/formStyles";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass } from "../../ui/tableStyles";

export function OtaScheduleForm() {
  const [firmwares, setFirmwares] = useState<Firmware[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [firmwareId, setFirmwareId] = useState("");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [jobs, setJobs] = useState<FirmwareUpdateJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ firmwares: Firmware[] }>("/admin/firmware").then((d) => setFirmwares(d.firmwares));
    api.get<{ devices: Device[] }>("/admin/devices?pageSize=100").then((d) => setDevices(d.devices));
    refreshJobs();
  }, []);

  function refreshJobs() {
    api.get<{ jobs: FirmwareUpdateJob[] }>("/admin/firmware/jobs").then((d) => setJobs(d.jobs));
  }

  function toggleDevice(id: string) {
    setSelectedDeviceIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!firmwareId || selectedDeviceIds.length === 0) {
      setError("Choose a firmware and at least one device.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.post("/admin/firmware/jobs", {
        firmwareId,
        deviceIds: selectedDeviceIds,
        scheduledAt: scheduledAt || undefined,
      });
      setSelectedDeviceIds([]);
      refreshJobs();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to schedule update.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelJob(id: string) {
    await api.patch(`/admin/firmware/jobs/${id}/cancel`);
    refreshJobs();
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="glass-panel flex flex-col gap-4 p-6" onSubmit={submit}>
        <h3 className="text-base font-semibold text-white">Schedule OTA update</h3>
        {error && <p className={errorTextClass}>{error}</p>}

        <label className={labelClass}>
          Firmware
          <select className={inputClass} value={firmwareId} onChange={(e) => setFirmwareId(e.target.value)} required>
            <option value="">Select firmware…</option>
            {firmwares.map((f) => (
              <option key={f.id} value={f.id}>
                {f.model} — v{f.version}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-300">Target devices</legend>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-800/80 bg-black/20 p-3">
            {devices.map((d) => (
              <label key={d.id} className="flex items-center gap-2 py-1 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedDeviceIds.includes(d.id)}
                  onChange={() => toggleDevice(d.id)}
                  className="h-4 w-4 rounded border-gray-700 bg-black/30 text-cyan-500 focus:ring-cyan-500/40"
                />
                {d.name} ({d.serialNumber})
              </label>
            ))}
          </div>
        </fieldset>

        <label className={labelClass}>
          Schedule for (optional, leave blank for immediate)
          <input type="datetime-local" className={inputClass} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </label>

        <button type="submit" className={`${primaryButtonClass} self-start`} disabled={busy}>
          Schedule update
        </button>
      </form>

      <div>
        <h3 className="mb-3 text-base font-semibold text-white">Update jobs</h3>
        <div className={tableWrapperClass}>
          <table className={tableClass}>
            <thead className={theadClass}>
              <tr>
                <th className={thClass}>Device</th>
                <th className={thClass}>Firmware</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Scheduled</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-gray-800/40 last:border-0">
                  <td className={tdClass}>{j.device.name}</td>
                  <td className={tdClass}>
                    {j.firmware.model} v{j.firmware.version}
                  </td>
                  <td className={tdClass}>
                    <Badge tone={otaStatusTone(j.status)}>{j.status}</Badge>
                  </td>
                  <td className={tdClass}>{j.scheduledAt ? new Date(j.scheduledAt).toLocaleString() : "Immediate"}</td>
                  <td className={tdClass}>
                    {j.status === "SCHEDULED" && (
                      <button onClick={() => cancelJob(j.id)} className={secondaryButtonClass}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
