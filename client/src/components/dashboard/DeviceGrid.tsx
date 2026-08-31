import { useEffect, useState } from "react";
import { api } from "../../api/httpClient";
import type { Device } from "../../types";
import { DeviceCard } from "./DeviceCard";
import { DeviceConfigModal } from "./DeviceConfigModal";
import { errorTextClass } from "../ui/formStyles";

export function DeviceGrid() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [configuring, setConfiguring] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<{ devices: Device[] }>("/devices")
      .then((d) => setDevices(d.devices))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load devices."));
  }

  useEffect(() => {
    load();
    // Lightweight polling keeps the online/offline indicator fresh without
    // needing a websocket for this dashboard view.
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  if (error) return <p className={errorTextClass}>{error}</p>;

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <DeviceCard key={d.id} device={d} onConfigure={() => setConfiguring(d)} />
        ))}
        {devices.length === 0 && <p className="text-sm text-gray-500">You don't have any devices yet.</p>}
      </div>

      {configuring && (
        <DeviceConfigModal
          device={configuring}
          onClose={() => setConfiguring(null)}
          onSaved={() => {
            setConfiguring(null);
            load();
          }}
        />
      )}
    </>
  );
}
