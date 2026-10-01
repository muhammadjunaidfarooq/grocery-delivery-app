import connectDb from "@/lib/mongodb";
import { requireAuth } from "@/lib/requireAuth";
import Order from "@/models/order.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(["user"]);
    if ("error" in authResult) return authResult.error;
    // The buyer is always the logged-in user, never an id from the request body
    const userId = authResult.user.id;

    await connectDb();
    const { items, paymentMethod, totalAmount, address } = await req.json();

    if (!items || !paymentMethod || !totalAmount || !address) {
      return NextResponse.json(
        { message: "Please send all credentials" },
        { status: 400 },
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "user not found" }, { status: 400 });
    }

    const newOrder = await Order.create({
      user: userId,
      items,
      paymentMethod,
      totalAmount,
      address,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.NEXT_BASE_ULR}/user/order-success`,
      cancel_url: `${process.env.NEXT_BASE_ULR}/user/order-cancel`,
      line_items: [
        {
          price_data: {
            currency: "pkr",
            product_data: {
              name: "OmniMart Payment",
            },
            unit_amount: totalAmount * 100,
          },
          quantity: 1,
        },
      ],
      metadata: { orderId: newOrder._id.toString() },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: `Place order payment error ${error}` },
      { status: 500 },
    );
  }
}
