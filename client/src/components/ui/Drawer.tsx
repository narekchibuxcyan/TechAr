import { useEffect, type ReactNode } from "react";

interface Props {
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
}

// Slide-over panel from the right, replacing the old jarring center popup
// for detail views (UserDetailDrawer, DeviceDetailPanel).
export function Drawer({ onClose, children, widthClassName = "w-full max-w-md" }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative h-full ${widthClassName} animate-drawer-in overflow-y-auto border-l border-gray-800/60 bg-base-surface/95 p-6 shadow-2xl backdrop-blur-xl`}
      >
        {children}
      </div>
    </div>
  );
}

export function DrawerClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close"
      className="absolute right-4 top-4 text-2xl leading-none text-gray-500 transition hover:text-gray-200"
    >
      ×
    </button>
  );
}
