import { DeviceTable } from "../../components/admin/devices/DeviceTable";

export function DevicesPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Device Management</h1>
        <p className="mt-1 text-sm text-gray-500">Register, assign, and manage every device in the fleet.</p>
      </div>
      <DeviceTable />
    </section>
  );
}
