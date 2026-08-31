import { useEffect, useState } from "react";
import { api } from "../api/httpClient";
import type { Order } from "../types";
import { OrderStepper } from "../components/OrderStepper";
import { errorTextClass } from "../components/ui/formStyles";

export function OrderTrackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ orders: Order[] }>("/orders")
      .then((d) => setOrders(d.orders))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders."));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Orders</h1>
        <p className="mt-1 text-sm text-gray-500">Track each order through its delivery lifecycle.</p>
      </div>

      {error && <p className={errorTextClass}>{error}</p>}

      <div className="flex flex-col gap-5">
        {orders.map((order) => (
          <div key={order.id} className="glass-panel p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-gray-600">Order {order.id.slice(0, 8)}</p>
                <p className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <span className="text-lg font-bold text-white">${(order.totalCents / 100).toFixed(2)}</span>
            </div>

            <div className="mb-5">
              <OrderStepper status={order.status} />
            </div>

            <ul className="flex flex-col gap-1 border-t border-gray-800/60 pt-4 text-sm text-gray-400">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {item.quantity}× {item.productName}
                  </span>
                  <span>${((item.unitPriceCents * item.quantity) / 100).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {orders.length === 0 && !error && <p className="text-sm text-gray-500">You haven't placed any orders yet.</p>}
      </div>
    </div>
  );
}
