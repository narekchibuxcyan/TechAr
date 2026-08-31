import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Nav } from "./components/Nav";
import { AdminLayout } from "./layouts/AdminLayout";
import { UsersPage } from "./pages/admin/UsersPage";
import { DevicesPage } from "./pages/admin/DevicesPage";
import { FirmwarePage } from "./pages/admin/FirmwarePage";
import { OrdersPage } from "./pages/admin/OrdersPage";
import { ProductsPage } from "./pages/admin/ProductsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ContactPage } from "./pages/ContactPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyOtpPage } from "./pages/VerifyOtpPage";
import { StorefrontPage } from "./pages/StorefrontPage";
import { OrderTrackingPage } from "./pages/OrderTrackingPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-10 text-sm text-gray-500">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-base-bg text-gray-100">
          <Nav />
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/store" element={<StorefrontPage />} />
            <Route
              path="/orders"
              element={
                <RequireAuth>
                  <OrderTrackingPage />
                </RequireAuth>
              }
            />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="devices" element={<DevicesPage />} />
              <Route path="firmware" element={<FirmwarePage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="products" element={<ProductsPage />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
