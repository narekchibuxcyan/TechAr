import { useState, type FormEvent } from "react";
import { api, ApiError } from "../../../api/httpClient";
import type { Product, ProductSpec, ProductStatus } from "../../../types";
import { Drawer, DrawerClose } from "../../ui/Drawer";
import { errorTextClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../../ui/formStyles";

interface Props {
  /** undefined = create mode, otherwise editing this product. */
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}

function centsToDollarsString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function dollarsStringToCents(value: string): number {
  return Math.round(Number(value) * 100);
}

export function ProductFormDrawer({ product, onClose, onSaved }: Props) {
  const isEditing = Boolean(product);

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [price, setPrice] = useState(product ? centsToDollarsString(product.priceCents) : "");
  const [stockQuantity, setStockQuantity] = useState(String(product?.stockQuantity ?? 0));
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "DRAFT");
  const [specs, setSpecs] = useState<ProductSpec[]>(product?.specs ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateSpec(index: number, field: keyof ProductSpec, value: string) {
    setSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addSpec() {
    setSpecs((prev) => [...prev, { label: "", value: "" }]);
  }

  function removeSpec(index: number) {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const priceCents = dollarsStringToCents(price);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError("Price must be a positive amount.");
      return;
    }
    const stock = Number(stockQuantity);
    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock quantity must be zero or a positive whole number.");
      return;
    }
    const cleanSpecs = specs.filter((s) => s.label.trim() && s.value.trim());

    setBusy(true);
    try {
      const payload = {
        title,
        description,
        priceCents,
        stockQuantity: stock,
        imageUrl: imageUrl || undefined,
        specs: cleanSpecs,
        status,
      };

      if (isEditing && product) {
        await api.put(`/admin/products/${product.id}`, payload);
      } else {
        await api.post("/admin/products", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer onClose={onClose} widthClassName="w-full max-w-lg">
      <DrawerClose onClose={onClose} />

      <form onSubmit={submit} className="flex flex-col gap-5">
        <h2 className="text-xl font-bold text-white">{isEditing ? "Edit product" : "Add product"}</h2>
        {error && <p className={errorTextClass}>{error}</p>}

        <label className={labelClass}>
          Title
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} />
        </label>

        <label className={labelClass}>
          Description
          <textarea
            className={`${inputClass} resize-none`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            maxLength={5000}
          />
        </label>

        <label className={labelClass}>
          Image URL (or leave blank for a placeholder)
          <input
            className={inputClass}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            maxLength={2000}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Price (USD)
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={inputClass}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </label>
          <label className={labelClass}>
            Stock quantity
            <input
              type="number"
              step="1"
              min="0"
              className={inputClass}
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              required
            />
          </label>
        </div>

        <label className={labelClass}>
          Visibility
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
            <option value="DRAFT">Draft (hidden from storefront)</option>
            <option value="PUBLISHED">Published (visible on storefront)</option>
          </select>
        </label>

        <fieldset>
          <div className="mb-2 flex items-center justify-between">
            <legend className="text-sm font-medium text-gray-300">Technical specifications</legend>
            <button type="button" onClick={addSpec} className={secondaryButtonClass}>
              + Add spec
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {specs.map((spec, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Label (e.g. Battery)"
                  value={spec.label}
                  onChange={(e) => updateSpec(i, "label", e.target.value)}
                  maxLength={60}
                />
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Value (e.g. 5000mAh)"
                  value={spec.value}
                  onChange={(e) => updateSpec(i, "value", e.target.value)}
                  maxLength={200}
                />
                <button
                  type="button"
                  onClick={() => removeSpec(i)}
                  aria-label="Remove spec"
                  className="shrink-0 rounded-lg border border-gray-800/80 px-2.5 py-2 text-gray-500 transition hover:border-red-500/40 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
            {specs.length === 0 && <p className="text-xs text-gray-600">No specs added yet.</p>}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-gray-800/60 pt-4">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={primaryButtonClass} disabled={busy}>
            {busy ? "Saving…" : isEditing ? "Save changes" : "Create product"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
