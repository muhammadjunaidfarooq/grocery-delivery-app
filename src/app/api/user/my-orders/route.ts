import connectDb from "@/lib/mongodb";
import { requireAuth } from "@/lib/requireAuth";
import Order from "@/models/order.model";
import { NextResponse } from "next/server";

// GET /api/user/my-orders — the logged-in customer's orders, newest first
export async function GET() {
  try {
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;

    await connectDb();
    const orders = await Order.find({ user: authResult.user.id })
      // Internal admin payment details are not shown to customers
      .select("-paymentConfirmationNote -paymentReceivedBy")
      .populate("assignedDeliveryBoy", "name mobile")
      .sort({ createdAt: -1 });
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("my-orders error:", error);
    return NextResponse.json(
      { message: "Could not load your orders" },
      { status: 500 },
    );
  }
}
