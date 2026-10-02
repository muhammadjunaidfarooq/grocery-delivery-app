import { markCodOrderPaid, paymentConflictResponse } from "@/lib/confirmPayment";
import connectDb from "@/lib/mongodb";
import { ADMIN_PAYMENT_METHODS, MAX_PAYMENT_NOTE_LENGTH, type AdminPaymentMethod } from "@/lib/payment";
import { requireAuth } from "@/lib/requireAuth";
import Order from "@/models/order.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const fail = (message: string, status: number) =>
  NextResponse.json({ message }, { status });

// POST /api/admin/confirm-payment/:orderId
// Body: { method: "cash" | "easypaisa" | "jazzcash" | "bank_transfer" | "other", note: string }
// An admin marks an unpaid COD order as paid (for example the customer sent
// the money to the business Easypaisa account) and must explain why.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    // 1-2. Logged in, and an admin
    const authResult = await requireAuth(["admin"]);
    if ("error" in authResult) return authResult.error;

    await connectDb();
    const { orderId } = await params;
    if (!mongoose.isValidObjectId(orderId)) return fail("Order not found", 404);

    const body = await req.json().catch(() => ({}));
    // 6. Method must be one of the allowed values
    const method = body?.method;
    if (!(ADMIN_PAYMENT_METHODS as readonly string[]).includes(method)) {
      return fail("Please choose a valid payment method", 400);
    }
    // 7. A reason is required
    const note = typeof body?.note === "string" ? body.note.trim() : "";
    if (!note) return fail("Please explain why the payment is being confirmed", 400);
    if (note.length > MAX_PAYMENT_NOTE_LENGTH) {
      return fail(`The reason must be at most ${MAX_PAYMENT_NOTE_LENGTH} characters`, 400);
    }

    // 3-5. Exists, COD, not yet paid
    const order = await Order.findById(orderId).select("paymentMethod isPaid");
    if (!order) return fail("Order not found", 404);
    if (order.paymentMethod !== "cod") {
      return fail("Only Cash on Delivery orders can be confirmed manually", 400);
    }
    if (order.isPaid) return fail("Payment has already been confirmed.", 409);

    const updated = await markCodOrderPaid({
      orderId,
      method: method as AdminPaymentMethod,
      receivedBy: authResult.user.id,
      role: "admin",
      note,
    });
    if (!updated) return paymentConflictResponse(orderId);

    return NextResponse.json(
      {
        message: "Payment confirmed.",
        isPaid: updated.isPaid,
        paidAt: updated.paidAt,
        paymentConfirmationMethod: updated.paymentConfirmationMethod,
        paymentReceivedByRole: updated.paymentReceivedByRole,
        paymentConfirmationNote: updated.paymentConfirmationNote,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("confirm-payment error:", error);
    return fail("Could not confirm the payment. Please try again.", 500);
  }
}
