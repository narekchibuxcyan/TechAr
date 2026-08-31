// Shared Tailwind class strings so every form across the app (auth, admin,
// storefront) looks consistent without a full component-per-input system.
export const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-300";

export const inputClass =
  "rounded-lg border border-gray-800/80 bg-black/20 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-base-bg transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-gray-800/80 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-700 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-red-500/15 px-4 py-2 text-sm font-medium text-red-300 ring-1 ring-inset ring-red-500/30 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50";

export const errorTextClass = "rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-500/30";

export const cardClass = "glass-panel w-full max-w-md p-8 shadow-2xl";
