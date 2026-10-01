import connectDb from "@/lib/mongodb";
import {
  buildBuckets,
  DASHBOARD_TIMEZONE,
  getBucketFormat,
  getBucketUnit,
  getRangeStart,
  parseRange,
} from "@/lib/dateRange";
import { requireAuth } from "@/lib/requireAuth";
import Order from "@/models/order.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

const STATUSES = ["pending", "out of delivery", "delivered"];
const PAYMENT_METHODS = ["cod", "online"];

// Revenue = orders that are delivered, or paid online. Each order counts once,
// and is dated by when it was created.
const REVENUE_MATCH = { $or: [{ status: "delivered" }, { isPaid: true }] };

const count = (condition: object) => ({
  $sum: { $cond: [condition, 1, 0] },
});

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(["admin"]);
    if ("error" in authResult) return authResult.error;

    const range = parseRange(req.nextUrl.searchParams.get("range"));
    if (!range) {
      return NextResponse.json(
        { message: "range must be all, today, month or year" },
        { status: 400 },
      );
    }

    await connectDb();
    const now = new Date();

    // The date maths is done here on the server, in Pakistan time
    let start = getRangeStart(range, now);
    if (!start) {
      const first = await Order.findOne({})
        .sort({ createdAt: 1 })
        .select("createdAt")
        .lean<{ createdAt: Date }>();
      start = first?.createdAt ?? null;
    }
    const unit = getBucketUnit(range);
    const match = range === "all" ? {} : { createdAt: { $gte: start } };

    const [result] = await Order.aggregate([
      { $match: match },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                delivered: count({ $eq: ["$status", "delivered"] }),
                pending: count({ $eq: ["$status", "pending"] }),
              },
            },
          ],
          revenue: [
            { $match: REVENUE_MATCH },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$totalAmount" },
                orders: { $sum: 1 },
              },
            },
          ],
          series: [
            { $match: REVENUE_MATCH },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: getBucketFormat(unit),
                    date: "$createdAt",
                    timezone: DASHBOARD_TIMEZONE,
                  },
                },
                revenue: { $sum: "$totalAmount" },
                orders: { $sum: 1 },
              },
            },
          ],
          status: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          payment: [{ $group: { _id: "$paymentMethod", count: { $sum: 1 } } }],
          top: [
            { $match: REVENUE_MATCH },
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.grocery",
                name: { $first: "$items.name" },
                quantity: { $sum: "$items.quantity" },
                revenue: {
                  $sum: {
                    $multiply: [
                      {
                        $convert: {
                          input: "$items.price",
                          to: "double",
                          onError: 0,
                          onNull: 0,
                        },
                      },
                      "$items.quantity",
                    ],
                  },
                },
              },
            },
            { $sort: { quantity: -1, revenue: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]);

    const totals = result.totals[0] ?? { orders: 0, delivered: 0, pending: 0 };
    const revenue = result.revenue[0] ?? { revenue: 0, orders: 0 };

    // Fill days (or hours, or months) that have no orders with zero
    const byKey = new Map<string, { revenue: number; orders: number }>(
      result.series.map((s: { _id: string; revenue: number; orders: number }) => [
        s._id,
        { revenue: s.revenue, orders: s.orders },
      ]),
    );
    const revenueSeries =
      start && totals.orders > 0
        ? buildBuckets(unit, start, now).map((b) => ({
            label: b.label,
            revenue: byKey.get(b.key)?.revenue ?? 0,
            orders: byKey.get(b.key)?.orders ?? 0,
          }))
        : [];

    const countOf = (rows: { _id: string; count: number }[], id: string) =>
      rows.find((r) => r._id === id)?.count ?? 0;

    const totalCustomers = await User.countDocuments({ role: "user" });

    return NextResponse.json(
      {
        range,
        from: start,
        timezone: DASHBOARD_TIMEZONE,
        stats: {
          revenue: revenue.revenue,
          orders: totals.orders,
          delivered: totals.delivered,
          pending: totals.pending,
          averageOrderValue:
            revenue.orders > 0
              ? Math.round((revenue.revenue / revenue.orders) * 100) / 100
              : 0,
          totalCustomers,
        },
        revenueSeries,
        statusBreakdown: STATUSES.map((status) => ({
          status,
          count: countOf(result.status, status),
        })),
        paymentBreakdown: PAYMENT_METHODS.map((method) => ({
          method,
          count: countOf(result.payment, method),
        })),
        topProducts: result.top.map(
          (t: { _id: string; name: string; quantity: number; revenue: number }) => ({
            id: String(t._id),
            name: t.name,
            quantity: t.quantity,
            revenue: Math.round(t.revenue * 100) / 100,
          }),
        ),
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: `dashboard error: ${error}` },
      { status: 500 },
    );
  }
}
