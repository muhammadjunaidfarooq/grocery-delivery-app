import connectDb from "@/lib/mongodb";
import { checkAddress, priceOrder } from "@/lib/orderPricing";
import { requireAuth } from "@/lib/requireAuth";
import { appBaseUrl, getStripe } from "@/lib/stripe";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// POST /api/user/payment — create an unpaid online order and a Stripe
// Checkout session. The Stripe webhook marks the order as paid.
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(["user"]);
    if ("error" in authResult) return authResult.error;
    const userId = authResult.user.id;

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { message: "Online payment is not available right now. Please use Cash on Delivery." },
        { status: 503 },
      );
    }

    await connectDb();
    const { items, address } = await req.json();

    const checkedAddress = checkAddress(address);
    if (!checkedAddress.ok) {
      return NextResponse.json({ message: checkedAddress.message }, { status: 400 });
    }
    const priced = await priceOrder(items);
    if (!priced.ok) {
      return NextResponse.json({ message: priced.message }, { status: 400 });
    }

    const newOrder = await Order.create({
      user: userId,
      items: priced.value.items,
      paymentMethod: "online",
      totalAmount: priced.value.totalAmount,
      address: checkedAddress.value,
    });

    try {
      const baseUrl = appBaseUrl();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        success_url: `${baseUrl}/user/order-success`,
        cancel_url: `${baseUrl}/user/order-cancel`,
        line_items: [
          {
            price_data: {
              currency: "pkr",
              product_data: { name: `OmniMart order #${String(newOrder._id).slice(-6)}` },
              // Stripe expects the smallest currency unit, as a whole number
              unit_amount: Math.round(priced.value.totalAmount * 100),
            },
            quantity: 1,
          },
        ],
        metadata: { orderId: newOrder._id.toString() },
      });
      return NextResponse.json({ url: session.url }, { status: 200 });
    } catch (stripeError) {
      // No payment page, so do not leave an unpaid order behind
      await Order.findByIdAndDelete(newOrder._id);
      console.error("Stripe session error:", stripeError);
      return NextResponse.json(
        { message: "Could not start online payment. Please try again or use Cash on Delivery." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Payment order error:", error);
    return NextResponse.json(
      { message: "Could not place the order. Please try again." },
      { status: 500 },
    );
  }
}
