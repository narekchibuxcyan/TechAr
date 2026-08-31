import type { Product } from "../../types";
import { primaryButtonClass } from "../ui/formStyles";

interface Props {
  product: Product;
  onBuy: (product: Product) => void;
  busy: boolean;
}

// There's no per-product art yet, so products without an imageUrl get a
// deterministic gradient placeholder instead of every card looking identical.
const GRADIENTS = [
  "from-cyan-500/30 to-blue-600/10",
  "from-violet-500/30 to-fuchsia-600/10",
  "from-emerald-500/30 to-teal-600/10",
  "from-amber-500/30 to-orange-600/10",
];

function gradientFor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length]!;
}

export function ProductCard({ product, onBuy, busy }: Props) {
  const outOfStock = product.stockQuantity <= 0;

  return (
    <div className="glass-panel flex flex-col overflow-hidden transition hover:border-gray-700">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.title} className="h-40 w-full object-cover" />
      ) : (
        <div className={`flex h-40 items-center justify-center bg-gradient-to-br ${gradientFor(product.id)}`}>
          <span className="px-4 text-center text-2xl font-black tracking-tight text-white/20">{product.title}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <h3 className="text-lg font-semibold text-white">{product.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{product.description}</p>
        </div>

        {product.specs && product.specs.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {product.specs.map((spec) => (
              <div key={spec.label}>
                <dt className="uppercase tracking-wide text-gray-600">{spec.label}</dt>
                <dd className="text-gray-300">{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xl font-bold text-white">${(product.priceCents / 100).toFixed(2)}</span>
          <button onClick={() => onBuy(product)} disabled={busy || outOfStock} className={primaryButtonClass}>
            {outOfStock ? "Out of stock" : busy ? "Placing order…" : "Buy now"}
          </button>
        </div>
      </div>
    </div>
  );
}
