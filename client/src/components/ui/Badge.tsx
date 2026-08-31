import type { ReactNode } from "react";
import type { DeviceStatus, OrderStatus, OtaStatus, ProductStatus, Role, UserStatus } from "../../types";

type BadgeTone = "purple" | "blue" | "green" | "amber" | "red" | "cyan" | "gray";

const TONE_CLASSES: Record<BadgeTone, string> = {
  purple: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  blue: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  green: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  red: "bg-red-500/15 text-red-300 ring-red-500/30",
  cyan: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  gray: "bg-gray-500/15 text-gray-400 ring-gray-500/30",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

// Role: Admin = purple, User = blue.
export function roleTone(role: Role): BadgeTone {
  return role === "ADMIN" ? "purple" : "blue";
}

export function userStatusTone(status: UserStatus): BadgeTone {
  if (status === "ACTIVE") return "green";
  if (status === "PENDING") return "amber";
  return "red";
}

export function deviceStatusTone(status: DeviceStatus): BadgeTone {
  if (status === "ONLINE") return "green";
  if (status === "OFFLINE") return "gray";
  return "red";
}

export function orderStatusTone(status: OrderStatus): BadgeTone {
  switch (status) {
    case "AWAITING_CONFIRMATION":
      return "amber";
    case "CONFIRMED":
      return "blue";
    case "IN_TRANSIT":
      return "cyan";
    case "DELIVERED":
      return "green";
    case "CANCELLED":
      return "red";
  }
}

export function otaStatusTone(status: OtaStatus): BadgeTone {
  switch (status) {
    case "SCHEDULED":
      return "amber";
    case "IN_PROGRESS":
      return "cyan";
    case "SUCCEEDED":
      return "green";
    case "FAILED":
      return "red";
    case "CANCELLED":
      return "gray";
  }
}

export function productStatusTone(status: ProductStatus): BadgeTone {
  return status === "PUBLISHED" ? "green" : "gray";
}

export const LOW_STOCK_THRESHOLD = 5;
