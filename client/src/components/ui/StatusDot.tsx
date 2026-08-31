import type { DeviceStatus } from "../../types";

interface Props {
  status: DeviceStatus;
  /** An active/pending OTA job in flight overrides the usual status glow. */
  updating?: boolean;
}

// Glowing green = online, pulsing amber = update in progress, muted gray/red
// = offline/disabled.
export function StatusDot({ status, updating }: Props) {
  if (updating) {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 animate-glow-amber" />;
  }
  if (status === "ONLINE") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-glow-green" />;
  }
  if (status === "DISABLED") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500/70" />;
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-600" />;
}
