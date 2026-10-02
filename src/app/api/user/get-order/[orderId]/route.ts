import connectDb from "@/lib/mongodb";
import { canAccessOrder } from "@/lib/orderAccess";
import { requireAuth } from "@/lib/requireAuth";
import Order from "@/models/order.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;

    await connectDb();

    const { orderId } = await params; // ✅ FIX

    if (!mongoose.isValidObjectId(orderId)) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const order = await Order.findById(orderId)
      .select("-paymentConfirmationNote -paymentReceivedBy")
      .populate("assignedDeliveryBoy", "name mobile location");

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // Only the owner, the assigned rider, or an admin may read this order
    if (!canAccessOrder(order, authResult.user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
