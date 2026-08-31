import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const linkClass = "text-sm text-gray-400 transition hover:text-gray-100";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-800/60 bg-base-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-base font-bold tracking-tight text-white">
          IoT<span className="text-cyan-400">Platform</span>
        </Link>

        <nav className="flex items-center gap-5">
          <Link to="/store" className={linkClass}>
            Store
          </Link>
          <Link to="/contact" className={linkClass}>
            Contact
          </Link>
          {user && (
            <Link to="/orders" className={linkClass}>
              My Orders
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link to="/admin" className={linkClass}>
              Admin
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-3 border-l border-gray-800/60 pl-5">
              <span className="text-sm text-gray-500">{user.fullName}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-gray-800/60 px-3 py-1.5 text-sm text-gray-300 transition hover:border-gray-700 hover:bg-white/5"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 border-l border-gray-800/60 pl-5">
              <Link to="/login" className={linkClass}>
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-medium text-base-bg transition hover:bg-cyan-400"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
