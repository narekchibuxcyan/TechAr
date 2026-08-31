import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/httpClient";
import { useAuth } from "../auth/AuthContext";
import { cardClass, errorTextClass, inputClass, labelClass, primaryButtonClass } from "../components/ui/formStyles";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/login", { email, password });
      await refresh();
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-12">
      <form className={`${cardClass} flex flex-col gap-5`} onSubmit={submit}>
        <div>
          <h1 className="text-2xl font-bold text-white">Log in</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back to the IoT platform.</p>
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

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
          Password
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={200}
          />
        </label>

        <button type="submit" className={primaryButtonClass} disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>

        <p className="text-center text-sm text-gray-500">
          No account?{" "}
          <Link to="/register" className="font-medium text-cyan-400 hover:text-cyan-300">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
