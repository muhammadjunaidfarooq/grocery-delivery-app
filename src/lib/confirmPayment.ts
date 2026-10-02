import emitEventHandler from "@/lib/emitEventHandler";
import type { PaymentConfirmationMethod, PaymentReceivedByRole } from "@/lib/payment";
import Order from "@/models/order.model";
import { NextResponse } from "next/server";

interface ConfirmInput {
  orderId: string;
  method: PaymentConfirmationMethod;
  receivedBy: string;
  role: PaymentReceivedByRole;
  note?: string;
  /** Extra conditions the order must still meet at the moment of the update */
  extraFilter?: Record<string, unknown>;
}

/**
 * Marks an unpaid COD order as paid in ONE atomic update. The filter repeats
 * every rule (COD, still unpaid, plus the caller's extra rules), so a double
 * click or two people confirming at the same time cannot pay it twice.
 * Returns the updated order, or null if the order no longer matched.
 */
export async function markCodOrderPaid({
  orderId,
  method,
  receivedBy,
  role,
  note,
  extraFilter = {},
}: ConfirmInput) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentMethod: "cod", isPaid: { $ne: true }, ...extraFilter },
    {
      $set: {
        isPaid: true,
        paidAt: new Date(), // server time, never from the browser
        paymentConfirmationMethod: method,
        paymentReceivedBy: receivedBy,
        paymentReceivedByRole: role,
        ...(note ? { paymentConfirmationNote: note } : {}),
      },
    },
    { returnDocument: "after" },
  );

  if (order) {
    // Same event the app already uses for order changes: My Orders, Track
    // Order, Manage Orders and the rider screen reload the order when they get it.
    await emitEventHandler("order-status-update", {
      orderId: order._id,
      status: order.status,
      isPaid: true,
    });
  }
  return order;
}

/** Works out why a confirmation did not match, for a clear error message. */
export async function paymentConflictResponse(orderId: string) {
  const current = await Order.findById(orderId).select("paymentMethod isPaid");
  if (!current) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  if (current.isPaid) {
    return NextResponse.json(
      { message: "Payment has already been confirmed." },
      { status: 409 },
    );
  }
  if (current.paymentMethod !== "cod") {
    return NextResponse.json(
      { message: "Only Cash on Delivery orders can be confirmed here." },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { message: "This order cannot be confirmed right now." },
    { status: 409 },
  );
}
