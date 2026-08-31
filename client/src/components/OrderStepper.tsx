import type { OrderStatus } from "../types";

const STAGES: { status: OrderStatus; label: string }[] = [
  { status: "AWAITING_CONFIRMATION", label: "Awaiting Confirmation" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "IN_TRANSIT", label: "In Transit" },
  { status: "DELIVERED", label: "Delivered" },
];

// Horizontal line timeline for the forward-only order lifecycle. CANCELLED
// is a terminal off-ramp, not a stage on the line, so it renders as a
// distinct banner instead of trying to plot a position on the stepper.
export function OrderStepper({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 ring-1 ring-inset ring-red-500/30">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        Order cancelled
      </div>
    );
  }

  const currentIndex = STAGES.findIndex((s) => s.status === status);

  return (
    <div className="flex w-full items-center">
      {STAGES.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;

        return (
          <div key={stage.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ring-2 transition-colors duration-500",
                  isComplete && "bg-emerald-500 text-white ring-emerald-500",
                  isCurrent && "bg-cyan-500 text-white ring-cyan-400 animate-glow-green",
                  isFuture && "bg-transparent text-gray-600 ring-gray-700",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isComplete ? "✓" : i + 1}
              </div>
              <span
                className={[
                  "w-20 text-center text-[11px] leading-tight",
                  isFuture ? "text-gray-600" : "text-gray-300",
                ].join(" ")}
              >
                {stage.label}
              </span>
            </div>

            {i < STAGES.length - 1 && (
              <div
                className={[
                  "mx-1 h-0.5 flex-1 rounded transition-colors duration-500",
                  isComplete ? "bg-emerald-500" : "bg-gray-800",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
