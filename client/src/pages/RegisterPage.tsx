import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/httpClient";
import { cardClass, errorTextClass, inputClass, labelClass, primaryButtonClass } from "../components/ui/formStyles";

export function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api.post<{ message: string }>("/auth/register", { fullName, email, password });
      setMessage(data.message);
      setTimeout(() => navigate(`/verify-otp?email=${encodeURIComponent(email)}`), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to register.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-12">
      <form className={`${cardClass} flex flex-col gap-5`} onSubmit={submit}>
        <div>
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="mt-1 text-sm text-gray-500">
            We'll email you a 6-digit activation code before your account goes live.
          </p>
        </div>

        {error && <p className={errorTextClass}>{error}</p>}
        {message && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
            {message}
          </p>
        )}

        <label className={labelClass}>
          Full name
          <input
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            maxLength={120}
          />
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
          Password (min 10 characters)
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={10}
            maxLength={200}
          />
        </label>

        <button type="submit" className={primaryButtonClass} disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-cyan-400 hover:text-cyan-300">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
