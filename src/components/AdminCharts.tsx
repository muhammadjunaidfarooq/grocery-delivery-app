"use client";
import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData } from "@/lib/dashboardTypes";

const GREEN = "#16A34A";

const STATUS_COLORS: Record<string, string> = {
  pending: "#EAB308",
  "out of delivery": "#3B82F6",
  delivered: GREEN,
};

const PAYMENT_LABELS: Record<string, string> = {
  cod: "Cash on delivery",
  online: "Online",
};
const PAYMENT_COLORS: Record<string, string> = {
  cod: "#F59E0B",
  online: GREEN,
};

const money = (n: number) =>
  `Rs.${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(n);

function ChartCard({
  title,
  empty,
  emptyText,
  children,
}: {
  title: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-md p-5">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">{title}</h2>
      {empty ? (
        <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm text-center">
          {emptyText}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-100 rounded-2xl shadow-md p-5 animate-pulse"
        >
          <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
          <div className="h-[260px] bg-gray-100 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function AdminCharts({
  data,
  loading,
}: {
  data: DashboardData;
  loading: boolean;
}) {
  const hasRevenue = data.revenueSeries.some((p) => p.revenue > 0);
  const statusTotal = data.statusBreakdown.reduce((s, r) => s + r.count, 0);
  const paymentData = data.paymentBreakdown.map((p) => ({
    ...p,
    name: PAYMENT_LABELS[p.method] ?? p.method,
  }));
  const hasPayments = paymentData.some((p) => p.count > 0);

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity ${
        loading ? "opacity-50" : "opacity-100"
      }`}
    >
      <ChartCard
        title="💰 Revenue over time"
        empty={!hasRevenue}
        emptyText="No revenue in this period yet. Revenue counts delivered and online-paid orders."
      >
        <AreaChart data={data.revenueSeries}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={GREEN} stopOpacity={0.35} />
              <stop offset="95%" stopColor={GREEN} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={16} />
          <YAxis
            tick={{ fontSize: 12 }}
            width={48}
            tickFormatter={(v) => compact(Number(v))}
          />
          <Tooltip
            formatter={(value, name) =>
              name === "revenue"
                ? [money(Number(value)), "Revenue"]
                : [String(value), "Orders"]
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={GREEN}
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ChartCard>

      <ChartCard
        title="📦 Orders by status"
        empty={statusTotal === 0}
        emptyText="No orders in this period yet."
      >
        <PieChart>
          <Pie
            data={data.statusBreakdown}
            dataKey="count"
            nameKey="status"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
          >
            {data.statusBreakdown.map((s) => (
              <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? "#9CA3AF"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [String(value), String(name)]}
          />
          <Legend />
        </PieChart>
      </ChartCard>

      <ChartCard
        title="🏆 Top 5 selling products"
        empty={data.topProducts.length === 0}
        emptyText="No products sold in this period yet."
      >
        <BarChart data={data.topProducts} layout="vertical">
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 12 }}
            tickFormatter={(v: string) =>
              v.length > 14 ? `${v.slice(0, 13)}…` : v
            }
          />
          <Tooltip
            formatter={(value, name, item) =>
              name === "quantity"
                ? [
                    `${value} sold (${money(Number(item?.payload?.revenue ?? 0))})`,
                    "Units",
                  ]
                : [String(value), String(name)]
            }
          />
          <Bar dataKey="quantity" fill={GREEN} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard
        title="💳 Orders by payment method"
        empty={!hasPayments}
        emptyText="No orders in this period yet."
      >
        <BarChart data={paymentData}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
          <Tooltip formatter={(value) => [String(value), "Orders"]} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {paymentData.map((p) => (
              <Cell key={p.method} fill={PAYMENT_COLORS[p.method] ?? GREEN} />
            ))}
          </Bar>
        </BarChart>
      </ChartCard>
    </div>
  );
}

export default AdminCharts;
