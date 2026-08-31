import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/httpClient";
import { cardClass, errorTextClass, inputClass, labelClass, primaryButtonClass } from "../components/ui/formStyles";

export function VerifyOtpPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api.post<{ message: string }>("/auth/verify-otp", { email, code });
      setMessage(data.message);
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-12">
      <form className={`${cardClass} flex flex-col gap-5`} onSubmit={submit}>
        <div>
          <h1 className="text-2xl font-bold text-white">Verify your email</h1>
          <p className="mt-1 text-sm text-gray-500">Enter the activation code we sent to your email.</p>
        </div>

        {error && <p className={errorTextClass}>{error}</p>}
        {message && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
            {message}
          </p>
        )}

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
          Activation code
          <input
            className={`${inputClass} tracking-[0.4em]`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            maxLength={6}
            pattern="\d{6}"
            inputMode="numeric"
          />
        </label>

        <button type="submit" className={primaryButtonClass} disabled={busy}>
          {busy ? "Verifying…" : "Verify"}
        </button>

        <p className="text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-cyan-400 hover:text-cyan-300">
            Back to log in
          </Link>
        </p>
      </form>
    </div>
  );
}
