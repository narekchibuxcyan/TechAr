import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../../../api/httpClient";
import type { Device, User } from "../../../types";
import { Modal } from "../../ui/Modal";
import { UserPicker } from "../../ui/UserPicker";
import { errorTextClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../ui/formStyles";

interface Props {
  onClose: () => void;
  onRegistered: (device: Device) => void;
}

export function DeviceRegisterModal({ onClose, onRegistered }: Props) {
  const [serialNumber, setSerialNumber] = useState("");
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [hardwareRevision, setHardwareRevision] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Set once registration succeeds; the API key is only ever shown here,
  // once — the server never returns it again after this response.
  const [issued, setIssued] = useState<{ device: Device; apiKey: string } | null>(null);

  useEffect(() => {
    api
      .get<{ users: User[] }>("/admin/users?pageSize=100")
      .then((data) => setUsers(data.users))
      .catch(() => setUsers([]));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api.post<{ device: Device; apiKey: string }>("/admin/devices", {
        serialNumber,
        name,
        model,
        hardwareRevision: hardwareRevision || undefined,
        ownerId: ownerId ?? undefined,
      });
      setIssued(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to register device.");
    } finally {
      setBusy(false);
    }
  }

  if (issued) {
    return (
      <Modal onClose={() => onRegistered(issued.device)}>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white">Device registered</h2>
          <p className="text-sm text-gray-400">
            Copy this device's API key now — it won't be shown again. The physical device (or the simulator) needs
            both the device ID and this key to authenticate.
          </p>

          <label className={labelClass}>
            Device ID
            <input readOnly className={`${inputClass} font-mono text-xs`} value={issued.device.id} onFocus={(e) => e.target.select()} />
          </label>
          <label className={labelClass}>
            API key
            <input readOnly className={`${inputClass} font-mono text-xs`} value={issued.apiKey} onFocus={(e) => e.target.select()} />
          </label>

          <div className="flex justify-end">
            <button type="button" className={primaryButtonClass} onClick={() => onRegistered(issued.device)}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Register device</h2>
        {error && <p className={errorTextClass}>{error}</p>}

        <label className={labelClass}>
          Serial number
          <input className={inputClass} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required maxLength={120} />
        </label>
        <label className={labelClass}>
          Name
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </label>
        <label className={labelClass}>
          Model
          <input className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} required maxLength={120} />
        </label>
        <label className={labelClass}>
          Hardware revision (optional)
          <input className={inputClass} value={hardwareRevision} onChange={(e) => setHardwareRevision(e.target.value)} maxLength={60} />
        </label>
        <label className={labelClass}>
          Assign Owner (Optional)
          <UserPicker users={users} value={ownerId} onChange={setOwnerId} placeholder="Search users…" />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={primaryButtonClass} disabled={busy}>
            Register
          </button>
        </div>
      </form>
    </Modal>
  );
}
