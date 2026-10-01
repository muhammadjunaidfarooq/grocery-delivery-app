import emitEventHandler from "@/lib/emitEventHandler";
import connectDb from "@/lib/mongodb";
import { requireAuth } from "@/lib/requireAuth";
import Order from "@/models/order.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

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

    await emitEventHandler("new-order", newOrder)

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: `Place order error ${error}` },
      { status: 500 },
    );
  }
}
