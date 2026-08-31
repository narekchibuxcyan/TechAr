import { useState } from "react";
import { FirmwareUploadForm } from "../../components/admin/firmware/FirmwareUploadForm";
import { OtaScheduleForm } from "../../components/admin/firmware/OtaScheduleForm";

export function FirmwarePage() {
  const [uploadCount, setUploadCount] = useState(0);

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Remote Firmware Updates (OTA)</h1>
        <p className="mt-1 text-sm text-gray-500">Upload validated firmware and push or schedule updates.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <FirmwareUploadForm onUploaded={() => setUploadCount((n) => n + 1)} />
        <OtaScheduleForm key={uploadCount} />
      </div>
    </section>
  );
}
