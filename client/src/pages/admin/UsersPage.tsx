import { UserTable } from "../../components/admin/users/UserTable";

export function UsersPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="mt-1 text-sm text-gray-500">View accounts, manage status, and grant or revoke admin access.</p>
      </div>
      <UserTable />
    </section>
  );
}
