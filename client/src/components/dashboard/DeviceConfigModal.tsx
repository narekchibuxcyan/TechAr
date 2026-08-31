import { useState, type FormEvent } from "react";
import { api, ApiError } from "../../api/httpClient";
import type { Device } from "../../types";
import { Modal } from "../ui/Modal";
import { errorTextClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../ui/formStyles";

interface Props {
  device: Device;
  onClose: () => void;
  onSaved: (device: Device) => void;
}

export function DeviceConfigModal({ device, onClose, onSaved }: Props) {
  const [name, setName] = useState(device.name);
  const [settingsText, setSettingsText] = useState(JSON.stringify(device.settings ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    let settings: Record<string, unknown>;
    try {
      settings = JSON.parse(settingsText);
    } catch {
      setError("Settings must be valid JSON.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const data = await api.patch<{ device: Device }>(`/devices/${device.id}/config`, { name, settings });
      onSaved(data.device);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold text-white">Configure {device.name}</h2>
        {error && <p className={errorTextClass}>{error}</p>}

        <label className={labelClass}>
          Device name
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </label>
        <label className={labelClass}>
          Settings (JSON)
          <textarea
            className={`${inputClass} font-mono text-xs`}
            value={settingsText}
            onChange={(e) => setSettingsText(e.target.value)}
            rows={8}
            spellCheck={false}
          />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={primaryButtonClass} disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
