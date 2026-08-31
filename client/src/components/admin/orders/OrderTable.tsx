import { useEffect, useState } from "react";
import { api, ApiError } from "../../../api/httpClient";
import type { Order, OrderStatus } from "../../../types";
import { Badge, orderStatusTone } from "../../ui/Badge";
import { errorTextClass, inputClass, secondaryButtonClass } from "../../ui/formStyles";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, toolbarClass } from "../../ui/tableStyles";

const STATUS_OPTIONS: (OrderStatus | "")[] = [
  "",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  AWAITING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
};

export function OrderTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    api
      .get<{ orders: Order[] }>(`/admin/orders?${params}`)
      .then((d) => setOrders(d.orders))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders."));
  }

  useEffect(load, [statusFilter]);

  async function advance(orderId: string, status: OrderStatus) {
    setBusyId(orderId);
    setError(null);
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update order status.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className={toolbarClass}>
        <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
      </div>

      {error && <p className={`${errorTextClass} mb-4`}>{error}</p>}

      <div className={tableWrapperClass}>
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Order</th>
              <th className={thClass}>Customer</th>
              <th className={thClass}>Total</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Placed</th>
              <th className={thClass}>Advance to</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-800/40 last:border-0">
                <td className={`${tdClass} font-mono text-xs`}>{o.id.slice(0, 8)}</td>
                <td className={tdClass}>{o.user ? `${o.user.fullName} <${o.user.email}>` : "—"}</td>
                <td className={`${tdClass} font-medium text-gray-100`}>${(o.totalCents / 100).toFixed(2)}</td>
                <td className={tdClass}>
                  <Badge tone={orderStatusTone(o.status)}>{o.status.replace(/_/g, " ")}</Badge>
                </td>
                <td className={tdClass}>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className={tdClass}>
                  <div className="flex gap-2">
                    {(NEXT_STATUS[o.status] ?? []).map((next) => (
                      <button key={next} disabled={busyId === o.id} onClick={() => advance(o.id, next)} className={secondaryButtonClass}>
                        {next.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
