import type { Device } from "../../types";
import { StatusDot } from "../ui/StatusDot";
import { Sparkline } from "../Sparkline";

function latestByMetric(device: Device, metric: string) {
  return device.telemetry?.find((t) => t.metric === metric);
}

function seriesFor(device: Device, metric: string): number[] {
  const points = (device.telemetry ?? []).filter((t) => t.metric === metric);
  // Telemetry arrives newest-first; reverse to chronological order for the chart.
  return points
    .slice()
    .reverse()
    .map((t) => t.value);
}

export function DeviceCard({ device, onConfigure }: { device: Device; onConfigure: () => void }) {
  const isUpdating = (device.updateJobs?.length ?? 0) > 0;
  const temperature = latestByMetric(device, "temperature");
  const battery = latestByMetric(device, "batteryLevel");
  const temperatureSeries = seriesFor(device, "temperature");

  const statusLabel = isUpdating ? "Updating" : device.status === "ONLINE" ? "Online" : device.status === "OFFLINE" ? "Offline" : "Disabled";
  const statusTextClass = isUpdating
    ? "text-amber-300"
    : device.status === "ONLINE"
      ? "text-emerald-300"
      : device.status === "DISABLED"
        ? "text-red-300"
        : "text-gray-500";

  return (
    <div className="glass-panel group relative overflow-hidden p-5 transition hover:border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{device.name}</h3>
          <p className="text-xs text-gray-500">{device.model}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={device.status} updating={isUpdating} />
          <span className={`text-xs font-medium ${statusTextClass}`}>{statusLabel}</span>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div className="flex gap-4">
          {temperature && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-600">Temp</p>
              <p className="text-lg font-bold text-white">
                {temperature.value}
                <span className="text-xs font-normal text-gray-500">{temperature.unit}</span>
              </p>
            </div>
          )}
          {battery && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-600">Battery</p>
              <p className="text-lg font-bold text-white">
                {battery.value}
                <span className="text-xs font-normal text-gray-500">{battery.unit}</span>
              </p>
            </div>
          )}
        </div>
        <Sparkline values={temperatureSeries} width={100} height={32} />
      </div>

      <button
        onClick={onConfigure}
        className="mt-5 w-full rounded-lg border border-gray-800/80 py-2 text-sm font-medium text-gray-300 transition hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300"
      >
        Configure
      </button>
    </div>
  );
}
