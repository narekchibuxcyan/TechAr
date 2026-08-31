import { DeviceGrid } from "../components/dashboard/DeviceGrid";

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Devices</h1>
        <p className="mt-1 text-sm text-gray-500">Live status and telemetry for the devices you own.</p>
      </div>
      <DeviceGrid />
    </div>
  );
}
