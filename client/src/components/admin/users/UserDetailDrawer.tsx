import { useEffect, useState } from "react";
import { api, ApiError } from "../../../api/httpClient";
import type { Role, User, UserStatus } from "../../../types";
import { Drawer, DrawerClose } from "../../ui/Drawer";
import { Badge, roleTone, userStatusTone } from "../../ui/Badge";
import { errorTextClass, secondaryButtonClass } from "../../ui/formStyles";

interface Props {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}

export function UserDetailDrawer({ userId, onClose, onChanged }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ user: User }>(`/admin/users/${userId}`)
      .then((data) => setUser(data.user))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load user."));
  }, [userId]);

  async function updateStatus(status: UserStatus) {
    setBusy(true);
    setError(null);
    try {
      const data = await api.patch<{ user: User }>(`/admin/users/${userId}/status`, { status });
      setUser(data.user);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(role: Role) {
    setBusy(true);
    setError(null);
    try {
      const data = await api.patch<{ user: User }>(`/admin/users/${userId}/role`, { role });
      setUser(data.user);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer onClose={onClose}>
      <DrawerClose onClose={onClose} />

      {!user && !error && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className={errorTextClass}>{error}</p>}

      {user && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-white">{user.fullName}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>

          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-gray-500">Status</dt>
            <dd>
              <Badge tone={userStatusTone(user.status)}>{user.status}</Badge>
            </dd>
            <dt className="text-gray-500">Role</dt>
            <dd>
              <Badge tone={roleTone(user.role)}>{user.role}</Badge>
            </dd>
            <dt className="text-gray-500">Joined</dt>
            <dd className="text-gray-300">{user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}</dd>
            <dt className="text-gray-500">Last login</dt>
            <dd className="text-gray-300">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</dd>
          </dl>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Account status</h3>
            <div className="flex flex-wrap gap-2">
              {(["ACTIVE", "PENDING", "BANNED"] as UserStatus[]).map((s) => (
                <button
                  key={s}
                  disabled={busy || user.status === s}
                  onClick={() => updateStatus(s)}
                  className={secondaryButtonClass}
                >
                  Set {s}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Admin role</h3>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy || user.role === "ADMIN"} onClick={() => updateRole("ADMIN")} className={secondaryButtonClass}>
                Grant admin
              </button>
              <button disabled={busy || user.role === "USER"} onClick={() => updateRole("USER")} className={secondaryButtonClass}>
                Revoke admin
              </button>
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
}
