export type Role = "USER" | "ADMIN";
export type UserStatus = "PENDING" | "ACTIVE" | "BANNED";
export type DeviceStatus = "ONLINE" | "OFFLINE" | "DISABLED";
export type OtaStatus = "SCHEDULED" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type OrderStatus = "AWAITING_CONFIRMATION" | "CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
export type ConnectionEvent = "CONNECTED" | "DISCONNECTED" | "ERROR" | "FORCED_STATE_CHANGE";
export type ProductStatus = "DRAFT" | "PUBLISHED";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  createdAt?: string;
  lastLoginAt?: string | null;
  _count?: { devices: number; orders: number };
}

export interface Device {
  id: string;
  serialNumber: string;
  name: string;
  model: string;
  hardwareRevision?: string | null;
  ownerId?: string | null;
  owner?: { id: string; email: string; fullName: string } | null;
  status: DeviceStatus;
  lastSeenAt?: string | null;
  firmwareVersion?: string | null;
  settings?: Record<string, unknown> | null;
  registeredAt: string;
  telemetry?: DeviceTelemetry[];
  /** Present (and non-empty) only when an OTA job is SCHEDULED/IN_PROGRESS for this device. */
  updateJobs?: { id: string; status: OtaStatus }[];
}

export interface DeviceTelemetry {
  id: string;
  metric: string;
  value: number;
  unit?: string | null;
  recordedAt: string;
}

export interface DeviceConnectionLog {
  id: string;
  event: ConnectionEvent;
  ipAddress?: string | null;
  detail?: string | null;
  occurredAt: string;
}

export interface Firmware {
  id: string;
  version: string;
  model: string;
  checksumSha256: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface FirmwareUpdateJob {
  id: string;
  status: OtaStatus;
  scheduledAt?: string | null;
  firmware: Firmware;
  device: { id: string; name: string; serialNumber: string };
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderStatusHistoryEntry {
  id: string;
  status: OrderStatus;
  changedAt: string;
  note?: string | null;
}

export interface Order {
  id: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  user?: { id: string; email: string; fullName: string };
  items: OrderItem[];
  statusHistory?: OrderStatusHistoryEntry[];
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  stockQuantity: number;
  imageUrl?: string | null;
  specs: ProductSpec[] | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}
