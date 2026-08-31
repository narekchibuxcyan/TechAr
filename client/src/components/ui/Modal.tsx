import { useEffect, type ReactNode } from "react";

interface Props {
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
}

export function Modal({ onClose, children, widthClassName = "w-full max-w-md" }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative ${widthClassName} animate-fade-in rounded-2xl border border-gray-800/60 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl`}
      >
        {children}
      </div>
    </div>
  );
}
