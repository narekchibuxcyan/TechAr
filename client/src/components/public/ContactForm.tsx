import { useState, type FormEvent } from "react";
import { api, ApiError } from "../../api/httpClient";
import {
  cardClass,
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "../ui/formStyles";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/contact", { name, email, message });
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Failed to send message.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "sent") {
    return (
      <div className={`${cardClass} text-center`}>
        <p className="text-lg font-semibold text-emerald-300">Thanks — we'll get back to you soon.</p>
      </div>
    );
  }

  return (
    <form className={`${cardClass} flex flex-col gap-5`} onSubmit={submit}>
      <div>
        <h1 className="text-2xl font-bold text-white">Contact us</h1>
        <p className="mt-1 text-sm text-gray-500">Questions, feedback, or support requests.</p>
      </div>

      {error && <p className={errorTextClass}>{error}</p>}

      <label className={labelClass}>
        Name
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
      </label>
      <label className={labelClass}>
        Email
        <input
          type="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={255}
        />
      </label>
      <label className={labelClass}>
        Message
        <textarea
          className={`${inputClass} resize-none`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          maxLength={5000}
        />
      </label>

      <button type="submit" className={primaryButtonClass} disabled={busy}>
        {busy ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
