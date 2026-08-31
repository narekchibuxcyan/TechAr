import { useEffect, useState } from "react";
import { api } from "../../../api/httpClient";
import type { Product, ProductStatus } from "../../../types";
import { Badge, LOW_STOCK_THRESHOLD, productStatusTone } from "../../ui/Badge";
import { errorTextClass, inputClass, primaryButtonClass, secondaryButtonClass } from "../../ui/formStyles";
import { tableClass, tableWrapperClass, tdClass, theadClass, thClass, toolbarClass } from "../../ui/tableStyles";
import { ProductFormDrawer } from "./ProductFormDrawer";
import { DeleteProductDialog } from "./DeleteProductDialog";

const STATUS_OPTIONS: (ProductStatus | "")[] = ["", "DRAFT", "PUBLISHED"];

export function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | "new" | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  async function load() {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const data = await api.get<{ products: Product[]; total: number }>(`/admin/products?${params}`);
      setProducts(data.products);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <div className={toolbarClass}>
        <input
          className={`${inputClass} w-64`}
          placeholder="Search title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ProductStatus | "")}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="rounded-lg border border-gray-800/80 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-700 hover:bg-white/5"
        >
          Search
        </button>
        <button className={`${primaryButtonClass} ml-auto`} onClick={() => setEditingProduct("new")}>
          + Add product
        </button>
      </div>

      {error && <p className={`${errorTextClass} mb-4`}>{error}</p>}

      <div className={tableWrapperClass}>
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Title</th>
              <th className={thClass}>Price</th>
              <th className={thClass}>Stock</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Updated</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const lowStock = p.stockQuantity < LOW_STOCK_THRESHOLD;
              return (
                <tr
                  key={p.id}
                  className={`border-b border-gray-800/40 transition last:border-0 hover:bg-white/[0.04] ${
                    lowStock ? "bg-amber-500/[0.06]" : ""
                  }`}
                >
                  <td className={`${tdClass} font-medium text-gray-100`}>{p.title}</td>
                  <td className={tdClass}>${(p.priceCents / 100).toFixed(2)}</td>
                  <td className={tdClass}>
                    <span className={lowStock ? "font-semibold text-amber-300" : ""}>{p.stockQuantity}</span>
                    {lowStock && (
                      <span className="ml-2">
                        <Badge tone="amber">Low stock</Badge>
                      </span>
                    )}
                  </td>
                  <td className={tdClass}>
                    <Badge tone={productStatusTone(p.status)}>{p.status}</Badge>
                  </td>
                  <td className={tdClass}>{new Date(p.updatedAt).toLocaleDateString()}</td>
                  <td className={tdClass}>
                    <div className="flex justify-end gap-2">
                      <button className={secondaryButtonClass} onClick={() => setEditingProduct(p)}>
                        Edit
                      </button>
                      <button
                        className="rounded-lg border border-gray-800/80 px-4 py-2 text-sm font-medium text-red-300 transition hover:border-red-500/40 hover:bg-red-500/10"
                        onClick={() => setDeletingProduct(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-600">{total} product(s)</p>

      {editingProduct && (
        <ProductFormDrawer
          product={editingProduct === "new" ? undefined : editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            load();
          }}
        />
      )}

      {deletingProduct && (
        <DeleteProductDialog
          product={deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onDeleted={() => {
            setDeletingProduct(null);
            load();
          }}
        />
      )}
    </div>
  );
}
