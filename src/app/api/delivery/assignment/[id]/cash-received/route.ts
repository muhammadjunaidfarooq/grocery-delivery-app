import { markCodOrderPaid, paymentConflictResponse } from "@/lib/confirmPayment";
import connectDb from "@/lib/mongodb";
import { requireAuth } from "@/lib/requireAuth";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import Order from "@/models/order.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const fail = (message: string, status: number) =>
  NextResponse.json({ message }, { status });

// POST /api/delivery/assignment/:id/cash-received
// The assigned rider confirms they received the full COD amount in cash.
// No body is read: the amount, method and status are decided here.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1-2. Logged in, and a delivery boy
    const authResult = await requireAuth(["deliveryBoy"]);
    if ("error" in authResult) return authResult.error;
    const riderId = authResult.user.id;

    await connectDb();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return fail("invalid assignment id", 400);

    // 3-4. The job exists and belongs to THIS rider
    const assignment = await DeliveryAssignment.findById(id).select(
      "assignedTo status order",
    );
    if (!assignment) return fail("assignment not found", 404);
    if (!assignment.assignedTo || String(assignment.assignedTo) !== riderId) {
      return fail("You can only confirm payment for your own deliveries", 403);
    }
    if (!["assigned", "completed"].includes(assignment.status)) {
      return fail("This delivery is not active", 409);
    }

    const order = await Order.findById(assignment.order).select(
      "assignedDeliveryBoy paymentMethod isPaid status",
    );
    if (!order) return fail("Order not found", 404);
    if (String(order.assignedDeliveryBoy) !== riderId) {
      return fail("You can only confirm payment for your own deliveries", 403);
    }
    // 5. COD only (Stripe orders are paid online)
    if (order.paymentMethod !== "cod") {
      return fail("This order was paid online. There is no cash to collect.", 400);
    }
    // 6. Not already paid
    if (order.isPaid) return fail("Payment has already been confirmed.", 409);
    // 7. The rider has the order (out for delivery, or just delivered)
    if (!["out of delivery", "delivered"].includes(order.status)) {
      return fail("Cash can only be collected while delivering the order", 409);
    }

    const updated = await markCodOrderPaid({
      orderId: String(order._id),
      method: "cash",
      receivedBy: riderId,
      role: "deliveryBoy",
      // Re-checked inside the atomic update
      extraFilter: {
        assignedDeliveryBoy: riderId,
        status: { $in: ["out of delivery", "delivered"] },
      },
    });
    if (!updated) return paymentConflictResponse(String(order._id));

    return NextResponse.json(
      {
        message: "Cash received. Payment confirmed.",
        isPaid: updated.isPaid,
        paidAt: updated.paidAt,
        paymentConfirmationMethod: updated.paymentConfirmationMethod,
        paymentReceivedByRole: updated.paymentReceivedByRole,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("cash-received error:", error);
    return fail("Could not confirm the payment. Please try again.", 500);
  }
}
