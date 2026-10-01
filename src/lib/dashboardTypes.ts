import type { DashboardRange } from "@/lib/dateRange";

// Shape of the response from GET /api/admin/dashboard
export interface DashboardData {
  range: DashboardRange;
  from: string | null;
  timezone: string;
  stats: {
    revenue: number;
    orders: number;
    delivered: number;
    pending: number;
    averageOrderValue: number;
    totalCustomers: number;
  };
  revenueSeries: { label: string; revenue: number; orders: number }[];
  statusBreakdown: { status: string; count: number }[];
  paymentBreakdown: { method: string; count: number }[];
  topProducts: { id: string; name: string; quantity: number; revenue: number }[];
}
