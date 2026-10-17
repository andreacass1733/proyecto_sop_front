import { Routes, Route, Navigate } from "react-router-dom";

import RtlLayout from "layouts/rtl";
import AdminLayout from "layouts/admin";
import AuthLayout from "layouts/auth";
import ProtectedRoute from "components/auth/ProtectedRoute";

const App = () => {
  return (
    <Routes>
      {/* Rutas de autenticación pública */}
      <Route path="auth/*" element={<AuthLayout />} />

      {/* Rutas protegidas mediante verificación de sesión activa */}
      <Route
        path="admin/*"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      />

      <Route
        path="rtl/*"
        element={
          <ProtectedRoute>
            <RtlLayout />
          </ProtectedRoute>
        }
      />

      {/* Redirección por defecto */}
      <Route path="/" element={<Navigate to="/admin/default" replace />} />
      <Route path="*" element={<Navigate to="/admin/default" replace />} />
    </Routes>
  );
};

export default App;
