import { OrderTable } from "../../components/admin/orders/OrderTable";

export function OrdersPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Order Management</h1>
        <p className="mt-1 text-sm text-gray-500">Track and advance every order through its lifecycle.</p>
      </div>
      <OrderTable />
    </section>
  );
}
