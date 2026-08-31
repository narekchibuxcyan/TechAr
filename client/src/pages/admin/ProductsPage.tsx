import { ProductTable } from "../../components/admin/products/ProductTable";

export function ProductsPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Product Management</h1>
        <p className="mt-1 text-sm text-gray-500">Manage the storefront catalog — pricing, stock, and visibility.</p>
      </div>
      <ProductTable />
    </section>
  );
}
