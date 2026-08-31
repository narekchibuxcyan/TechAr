import { NavLink, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-lg px-3 py-2 text-sm font-medium transition",
    isActive ? "bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-cyan-500/30" : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
  ].join(" ");

// Route-level guard: hides the admin UI for non-admins. This is a UX nicety
// only — every admin API route independently re-checks role + status
// server-side (see server/src/middleware/auth.ts requireAdmin).
export function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return <p className="p-10 text-sm text-gray-500">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl gap-8 px-6 py-8">
      <nav className="glass-panel h-fit w-48 shrink-0 p-3">
        <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Admin</p>
        <div className="flex flex-col gap-1">
          <NavLink to="/admin/users" className={navLinkClass}>
            Users
          </NavLink>
          <NavLink to="/admin/devices" className={navLinkClass}>
            Devices
          </NavLink>
          <NavLink to="/admin/firmware" className={navLinkClass}>
            Firmware / OTA
          </NavLink>
          <NavLink to="/admin/orders" className={navLinkClass}>
            Orders
          </NavLink>
          <NavLink to="/admin/products" className={navLinkClass}>
            Products
          </NavLink>
        </div>
      </nav>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
