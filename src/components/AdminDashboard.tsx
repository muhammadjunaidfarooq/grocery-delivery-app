import React from "react";
import AdminDashboardClient from "./AdminDashboardClient";

// The numbers come from GET /api/admin/dashboard, which the client component
// calls when it loads and whenever the date filter changes.
function AdminDashboard() {
  return <AdminDashboardClient />;
}

export default AdminDashboard;
