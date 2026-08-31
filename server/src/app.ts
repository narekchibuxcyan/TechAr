import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { issueCsrfCookie, verifyCsrf } from "./middleware/csrf";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { devicesRouter } from "./routes/devices.routes";
import { ordersRouter } from "./routes/orders.routes";
import { contactRouter } from "./routes/contact.routes";
import { adminUsersRouter } from "./routes/admin/users.routes";
import { adminDevicesRouter } from "./routes/admin/devices.routes";
import { adminFirmwareRouter } from "./routes/admin/firmware.routes";
import { adminOrdersRouter } from "./routes/admin/orders.routes";
import { adminProductsRouter } from "./routes/admin/products.routes";
import { deviceAgentRouter } from "./routes/deviceAgent.routes";
import { productsRouter } from "./routes/products.routes";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(issueCsrfCookie);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Mounted before verifyCsrf: devices authenticate with their own
// X-Device-Id/X-Device-Key headers, not the session cookie, so the
// double-submit CSRF check (which guards cookie-based auth) doesn't apply.
app.use("/api/device-agent", deviceAgentRouter);

app.use(verifyCsrf);

app.use("/api/auth", authRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/contact", contactRouter);
app.use("/api/products", productsRouter);

app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/devices", adminDevicesRouter);
app.use("/api/admin/firmware", adminFirmwareRouter);
app.use("/api/admin/orders", adminOrdersRouter);
app.use("/api/admin/products", adminProductsRouter);

app.use(errorHandler);
