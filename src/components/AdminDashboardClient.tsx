"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "motion/react";
import {
  CheckCircle,
  Clock,
  Package,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { DashboardRange } from "@/lib/dateRange";
import type { DashboardData } from "@/lib/dashboardTypes";
import AdminCharts, { ChartsSkeleton } from "./AdminCharts";

const RANGES: { id: DashboardRange; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
];

const RANGE_NAMES: Record<DashboardRange, string> = {
  all: "all time",
  today: "today",
  month: "this month",
  year: "this year",
};

const money = (n: number) =>
  `Rs.${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 shadow-md rounded-2xl p-5 flex items-center gap-4 animate-pulse">
      <div className="bg-gray-200 w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="h-6 w-20 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

function AdminDashboardClient() {
  const [range, setRange] = useState<DashboardRange>("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  // The server calculates everything (including the date range in Pakistan
  // time). The browser only asks for a range and shows the result.
  useEffect(() => {
    let cancelled = false;
    axios
      .get<DashboardData>("/api/admin/dashboard", { params: { range } })
      .then((result) => {
        if (cancelled) return;
        setData(result.data);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.log(err);
        setError("Could not load the dashboard. Please try again.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, reloadCount]);

  const changeRange = (next: DashboardRange) => {
    if (next === range) return;
    setLoading(true);
    setError("");
    setRange(next);
  };

  const retry = () => {
    setLoading(true);
    setError("");
    setReloadCount((c) => c + 1);
  };

  const cards = data
    ? [
        {
          title: "Revenue",
          value: money(data.stats.revenue),
          icon: <Wallet className="text-green-700 w-6 h-6" />,
          highlight: true,
        },
        {
          title: "Orders",
          value: data.stats.orders.toLocaleString(),
          icon: <Package className="text-green-700 w-6 h-6" />,
        },
        {
          title: "Delivered",
          value: data.stats.delivered.toLocaleString(),
          icon: <CheckCircle className="text-green-700 w-6 h-6" />,
        },
        {
          title: "Pending",
          value: data.stats.pending.toLocaleString(),
          icon: <Clock className="text-green-700 w-6 h-6" />,
        },
        {
          title: "Average order value",
          value: money(data.stats.averageOrderValue),
          icon: <TrendingUp className="text-green-700 w-6 h-6" />,
        },
        {
          title: "Total customers",
          value: data.stats.totalCustomers.toLocaleString(),
          note: "all time",
          icon: <Users className="text-green-700 w-6 h-6" />,
        },
      ]
    : [];

  return (
    <div className="pt-28 w-[90%] md:w-[80%] mx-auto pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 text-center lg:text-left">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-green-700"
        >
          🏪 Admin Dashboard
        </motion.h1>

        <div
          className="flex flex-wrap justify-center lg:justify-end gap-2"
          role="group"
          aria-label="Date filter"
        >
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => changeRange(r.id)}
              aria-pressed={range === r.id}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                range === r.id
                  ? "bg-green-600 text-white border-green-600 shadow"
                  : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <span>{error}</span>
          <button
            onClick={retry}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {loading && !data
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: loading ? 0.5 : 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`border shadow-md rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg transition-all ${
                  c.highlight
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-gray-100"
                }`}
              >
                <div className="bg-green-100 p-3 rounded-xl">{c.icon}</div>
                <div className="min-w-0">
                  <p className="text-gray-600 text-sm">
                    {c.title}
                    {c.note && (
                      <span className="text-gray-400"> ({c.note})</span>
                    )}
                  </p>
                  <p className="text-2xl font-bold text-gray-800 truncate">
                    {c.value}
                  </p>
                </div>
              </motion.div>
            ))}
      </div>

      {loading && !data && <ChartsSkeleton />}
      {data && data.stats.orders > 0 && (
        <AdminCharts data={data} loading={loading} />
      )}

      {data && !loading && !error && data.stats.orders === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-500 mb-8">
          <Package className="mx-auto w-10 h-10 text-gray-300 mb-2" />
          No orders for {RANGE_NAMES[range]} yet.
        </div>
      )}
    </div>
  );
}

export default AdminDashboardClient;
