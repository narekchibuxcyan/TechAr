import { useEffect, useState } from "react";
import { api } from "../../../api/httpClient";
import type { Role, User, UserStatus } from "../../../types";
import { UserDetailDrawer } from "./UserDetailDrawer";
import { Badge, roleTone, userStatusTone } from "../../ui/Badge";
import { errorTextClass, inputClass } from "../../ui/formStyles";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, toolbarClass, trClass } from "../../ui/tableStyles";

const STATUS_OPTIONS: (UserStatus | "")[] = ["", "PENDING", "ACTIVE", "BANNED"];
const ROLE_OPTIONS: (Role | "")[] = ["", "USER", "ADMIN"];

export function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<UserStatus | "">("");
  const [role, setRole] = useState<Role | "">("");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (role) params.set("role", role);
      if (search) params.set("search", search);
      const data = await api.get<{ users: User[]; total: number }>(`/admin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role]);

  return (
    <div>
      <div className={toolbarClass}>
        <input
          className={`${inputClass} w-64`}
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as UserStatus | "")}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
        <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as Role | "")}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r || "All roles"}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-gray-800/80 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-700 hover:bg-white/5"
        >
          Search
        </button>
      </div>

      {error && <p className={`${errorTextClass} mb-4`}>{error}</p>}

      <div className={tableWrapperClass}>
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Name</th>
              <th className={thClass}>Email</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>Devices</th>
              <th className={thClass}>Orders</th>
              <th className={thClass}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} onClick={() => setSelectedUserId(u.id)} className={trClass}>
                <td className={`${tdClass} font-medium text-gray-100`}>{u.fullName}</td>
                <td className={tdClass}>{u.email}</td>
                <td className={tdClass}>
                  <Badge tone={userStatusTone(u.status)}>{u.status}</Badge>
                </td>
                <td className={tdClass}>
                  <Badge tone={roleTone(u.role)}>{u.role}</Badge>
                </td>
                <td className={tdClass}>{u._count?.devices ?? 0}</td>
                <td className={tdClass}>{u._count?.orders ?? 0}</td>
                <td className={tdClass}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-600">{total} user(s)</p>

      {selectedUserId && (
        <UserDetailDrawer userId={selectedUserId} onClose={() => setSelectedUserId(null)} onChanged={load} />
      )}
    </div>
  );
}
