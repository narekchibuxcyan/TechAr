# IoT Platform — Product & Architecture Specification

Status: **Updated** — adds full User Management and Device Management to the Admin
Panel, plus the security guardrails those features must be built under.

## 1. Secure User Registration & Authentication

- Registration creates a user with `status = PENDING`. No session is issued yet.
- A 6-digit numeric OTP is generated, hashed (SHA-256) and stored with a 10-minute
  expiry and an attempt counter (max 5 attempts). The raw code is emailed to the
  user; the hash is what's persisted (`OtpCode.codeHash`).
- Submitting the correct OTP within the window flips the account to
  `status = ACTIVE`. Expired/exhausted OTPs must be re-requested (rate-limited).
- Passwords are hashed with **argon2id** (`argon2` package) — never stored or
  logged in plaintext, never compared with `===`.
- A session is an opaque random 256-bit token. The **hash** of the token is stored
  server-side in a `Session` row; the raw token goes to the browser only as an
  `HttpOnly`, `Secure`, `SameSite=Strict` cookie. This makes sessions revocable
  (delete the row) without needing a JWT blocklist.
- Login is refused for any account that isn't `ACTIVE` (`PENDING` → "verify your
  email first", `BANNED` → "account disabled").

## 2. User Dashboard

- **Device list**: grid/list of the signed-in user's own devices, each showing a
  live Online/Offline indicator (derived from `Device.status` +
  `Device.lastSeenAt` heartbeat staleness) and the latest telemetry reading(s).
- **Device configuration**: an owned-device-only settings form
  (`PATCH /api/devices/:id/config`) — ownership is enforced server-side on every
  request, not just hidden in the UI.

## 3. Advanced Admin Panel (updated)

### User Management
- Paginated/filterable list of all registered users (status, role, search by
  email/name).
- User detail view: profile, owned devices, order count, session/login activity.
- Manual account status transitions: `PENDING ⇄ ACTIVE ⇄ BANNED`.
- Grant/revoke the `ADMIN` role. An admin cannot revoke their own admin role
  (prevents accidental full lockout — see `admin.users.routes.ts`).
- Every status/role change is written to `AuditLog`.

### Device Management
- Master list of every device in the system (owner, model, status, firmware
  version, last-seen).
- Register new devices (serial number, model, hardware revision) ahead of them
  shipping to a customer.
- Assign / reassign a device to a different user (or unassign).
- Device detail view: hardware specs, telemetry history, full connection log.
- Force a device's state (e.g. remotely mark `DISABLED`) — logged as a
  `FORCED_STATE_CHANGE` connection-log event plus an audit entry.

### Remote Firmware Updates (OTA)
- Admins upload a firmware binary (`multipart/form-data`). The upload is
  rejected unless **both** the extension (`.bin`/`.hex`) and the file's magic
  bytes / structure pass validation — see [Firmware upload validation](#firmware-upload-validation).
  Files are stored outside the web root under a randomized name; a SHA-256
  checksum is recorded so a device can verify integrity before flashing.
- Admins schedule a `FirmwareUpdateJob` per target device (immediate or a future
  `scheduledAt`), trackable through `SCHEDULED → IN_PROGRESS → SUCCEEDED|FAILED`.

### Order Management
- Admins list/filter orders and advance status through a forward-only state
  machine: `AWAITING_CONFIRMATION → CONFIRMED → IN_TRANSIT → DELIVERED`
  (with a `CANCELLED` escape hatch). Every transition is appended to
  `OrderStatusHistory`, never overwritten.

## 4. E-Commerce & Sales Panel

- Public storefront listing purchasable devices.
- Customers see their own order's current stage from the same
  `OrderStatus` enum the admin panel uses, so the two views can never disagree.

## 5. Public Pages

- Static "About Us" and "Contacts" pages.
- The contact form (`POST /api/contact`) is public but rate-limited, validated,
  and sanitized before being persisted — see guardrails below.

## 6. Security Guardrails (cross-cutting)

| Concern | Mechanism |
|---|---|
| SQL/NoSQL injection | Prisma ORM (parameterized queries) — no raw string-concatenated SQL anywhere. |
| XSS | `zod` schema validation on every route + `sanitize-html` stripping on free-text fields (name, message, device name) on write; React escapes on render by default. |
| CSRF | Double-submit cookie: a non-HttpOnly `csrf_token` cookie must match an `X-CSRF-Token` header on every state-changing request. |
| Secrets | Everything sensitive (`DATABASE_URL`, `SESSION_SECRET`, SMTP creds) is read from `process.env` via `server/src/config/env.ts`, which throws at boot if a required var is missing. Only `.env.example` (placeholders) is committed; real `.env` is git-ignored. |
| Brute force / OTP abuse | `express-rate-limit` on `/auth/register`, `/auth/verify-otp`, `/auth/login`, `/contact`. |
| Firmware upload | See below. |
| Session hijacking | `HttpOnly` + `Secure` + `SameSite=Strict` cookies; session tokens stored hashed, never in plaintext. |
| Privilege escalation | `requireAdmin` middleware re-checks role + `ACTIVE` status from the DB on every request (not from a client-supplied claim). |

### Firmware upload validation

`server/src/utils/fileValidation.ts` rejects a firmware upload unless:
1. The filename extension is `.bin` or `.hex`.
2. For `.hex`: the first line matches the Intel HEX record format (`:` + valid
   hex digits + valid checksum byte).
3. For `.bin`: size is within the configured bounds (`FIRMWARE_MAX_BYTES`) and
   the file is not empty/all-zero (a cheap sanity check against garbage
   uploads).
4. The upload is capped by `multer` at `FIRMWARE_MAX_BYTES` before it ever
   reaches validation, and stored under a `crypto.randomUUID()` filename outside
   any statically-served directory.

## Data Model

See `server/prisma/schema.prisma` for the authoritative schema. Key entities:
`User`, `OtpCode`, `Session`, `Device`, `DeviceTelemetry`,
`DeviceConnectionLog`, `Firmware`, `FirmwareUpdateJob`, `Order`, `OrderItem`,
`OrderStatusHistory`, `ContactMessage`, `AuditLog`.

## API Surface

```
POST   /api/auth/register
POST   /api/auth/verify-otp
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/devices                     (own devices)
GET    /api/devices/:id
PATCH  /api/devices/:id/config
GET    /api/devices/:id/telemetry

GET    /api/orders                      (own orders)
GET    /api/orders/:id
POST   /api/orders

POST   /api/contact

--- admin (requireAuth + requireAdmin) ---
GET    /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id/status
PATCH  /api/admin/users/:id/role

GET    /api/admin/devices
POST   /api/admin/devices
GET    /api/admin/devices/:id
GET    /api/admin/devices/:id/logs
PATCH  /api/admin/devices/:id/assign
PATCH  /api/admin/devices/:id/state

POST   /api/admin/firmware/upload
GET    /api/admin/firmware
POST   /api/admin/firmware/jobs
GET    /api/admin/firmware/jobs
PATCH  /api/admin/firmware/jobs/:id/cancel

GET    /api/admin/orders
GET    /api/admin/orders/:id
PATCH  /api/admin/orders/:id/status

--- device-agent (requireDeviceAuth — see below) ---
POST   /api/device-agent/telemetry
POST   /api/device-agent/heartbeat
GET    /api/device-agent/firmware-jobs
GET    /api/device-agent/firmware-jobs/:jobId/binary
POST   /api/device-agent/firmware-jobs/:jobId/report
```

### Device-agent authentication

A physical device (or `simulator/`) is not a browser session, so it doesn't
authenticate with the cookie-based flow in section 1. Instead it presents two
headers on every request:

```
X-Device-Id:  <device id, issued at registration>
X-Device-Key: <raw API key, shown exactly once at registration>
```

`requireDeviceAuth` (`server/src/middleware/deviceAuth.ts`) hashes the
supplied key and compares it to `Device.apiKeyHash` — the same "store a hash,
never the raw value" pattern used for passwords and session tokens.
`apiKeyHash` is never selected back out to any client (`omit` is applied on
every Device query an admin or user can reach). Because this scheme doesn't
rely on an ambient cookie, `/api/device-agent/*` is mounted before the CSRF
middleware in `app.ts` and is exempt from it — CSRF protects cookie-based
auth from being driven by a malicious page in the user's browser, which
doesn't apply here.

## Testing tools

- `server/prisma/seed.ts` — populates an admin account, three test users (two
  pending OTP verification, one active), five demo devices with device-agent
  credentials, historical telemetry/connection-log/order data, and a
  `SCHEDULED` firmware update job ready for the OTA flow. Run via
  `npx prisma db seed`.
- `simulator/` — a standalone script that authenticates as one of the seeded
  devices and drives the full device-agent API: telemetry every 5s,
  heartbeats for the connection log, and polling for + applying OTA updates
  (download → validate size/checksum → simulated flash → report outcome).
  Run via `npm start` inside `simulator/`.

## Project layout

```
server/     Express + TypeScript API, Prisma schema/client, seed script
client/     React + TypeScript admin panel, dashboard, and public components
simulator/  Standalone IoT device simulator for end-to-end testing
docs/       This spec
```
