import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/httpClient";
import { useAuth } from "../auth/AuthContext";
import { ProductCard } from "../components/storefront/ProductCard";
import type { Order, Product } from "../types";
import { errorTextClass } from "../components/ui/formStyles";

export function StorefrontPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ products: Product[] }>("/products")
      .then((d) => setProducts(d.products))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load products."));
  }, []);

  async function handleBuy(product: Product) {
    if (!user) {
      navigate("/login");
      return;
    }

    setBusyId(product.id);
    setError(null);
    try {
      // Price is never sent from the client — the server looks up the
      // current Product price by id, so a request can't set its own price.
      await api.post<{ order: Order }>("/orders", {
        items: [{ productId: product.id, quantity: 1 }],
      });
      navigate("/orders");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to place order.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Store</h1>
        <p className="mt-1 text-sm text-gray-500">Premium IoT hardware, ready to deploy.</p>
      </div>

      {error && <p className={`${errorTextClass} mb-6`}>{error}</p>}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onBuy={handleBuy} busy={busyId === product.id} />
        ))}
        {products.length === 0 && !error && <p className="text-sm text-gray-500">No products available right now.</p>}
      </div>
    </div>
  );
}
