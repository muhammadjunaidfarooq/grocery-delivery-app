import connectDb from "@/lib/mongodb";
import { getStripe } from "@/lib/stripe";
import Order from "@/models/order.model";
import emitEventHandler from "@/lib/emitEventHandler";
import { NextRequest, NextResponse } from "next/server";

// Stripe calls this after a Checkout payment. The signature check proves the
// request really comes from Stripe, so only then is the order marked as paid.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig ?? "", webhookSecret);
  } catch (error) {
    console.error("signature verification failed", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const orderId = event.data.object.metadata?.orderId;
    if (orderId) {
      await connectDb();
      const order = await Order.findByIdAndUpdate(
        orderId,
        { isPaid: true, paidAt: new Date(), paymentConfirmationMethod: "stripe" },
        { returnDocument: "after" },
      );
      if (order) await emitEventHandler("new-order", order);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
