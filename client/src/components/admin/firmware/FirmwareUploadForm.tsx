import { useState, type FormEvent } from "react";
import { api, ApiError } from "../../../api/httpClient";
import type { Firmware } from "../../../types";
import { errorTextClass, inputClass, labelClass, primaryButtonClass } from "../../ui/formStyles";

interface Props {
  onUploaded: (firmware: Firmware) => void;
}

// Client-side extension check is a UX convenience only — the server
// independently re-validates extension + magic bytes and is the real gate.
const ACCEPTED_EXTENSIONS = [".bin", ".hex"];

export function FirmwareUploadForm({ onUploaded }: Props) {
  const [version, setVersion] = useState("");
  const [model, setModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a .bin or .hex firmware file.");
      return;
    }

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError("Only .bin and .hex firmware files are accepted.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("version", version);
      formData.append("model", model);
      formData.append("firmware", file);

      const data = await api.post<{ firmware: Firmware }>("/admin/firmware/upload", formData);
      onUploaded(data.firmware);
      setVersion("");
      setModel("");
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="glass-panel flex flex-col gap-4 p-6" onSubmit={submit}>
      <h3 className="text-base font-semibold text-white">Upload firmware</h3>
      {error && <p className={errorTextClass}>{error}</p>}

      <label className={labelClass}>
        Device model
        <input className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} required maxLength={120} />
      </label>
      <label className={labelClass}>
        Version
        <input className={inputClass} value={version} onChange={(e) => setVersion(e.target.value)} required maxLength={40} />
      </label>
      <label className={labelClass}>
        Firmware file (.bin / .hex)
        <input
          type="file"
          accept=".bin,.hex"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
          className="text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-cyan-300 hover:file:bg-cyan-500/25"
        />
      </label>

      <button type="submit" className={`${primaryButtonClass} self-start`} disabled={busy}>
        {busy ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
