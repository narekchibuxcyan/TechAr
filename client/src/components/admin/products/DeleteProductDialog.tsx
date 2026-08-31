import { useState } from "react";
import { api, ApiError } from "../../../api/httpClient";
import type { Product } from "../../../types";
import { Modal } from "../../ui/Modal";
import { dangerButtonClass, errorTextClass, inputClass, secondaryButtonClass } from "../../ui/formStyles";

interface Props {
  product: Product;
  onClose: () => void;
  onDeleted: () => void;
}

// Double confirmation: a plain "Are you sure?" click is too easy to fat-finger
// on a destructive action, so this requires typing the exact product title
// before the delete button becomes clickable.
export function DeleteProductDialog({ product, onClose, onDeleted }: Props) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canDelete = confirmText.trim() === product.title;

  async function handleDelete() {
    if (!canDelete) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/admin/products/${product.id}`);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete product.");
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Delete product</h2>
        <p className="text-sm text-gray-400">
          This removes <span className="font-semibold text-gray-200">{product.title}</span> from the storefront. It
          won't be shown to customers, though the record is kept for order history. This cannot be undone from the UI.
        </p>

        {error && <p className={errorTextClass}>{error}</p>}

        <label className="flex flex-col gap-1.5 text-sm text-gray-300">
          Type <span className="font-mono text-gray-100">{product.title}</span> to confirm
          <input
            className={inputClass}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoFocus
            autoComplete="off"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={dangerButtonClass} onClick={handleDelete} disabled={!canDelete || busy}>
            {busy ? "Deleting…" : "Delete product"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
