import emitEventHandler from "@/lib/emitEventHandler";
import connectDb from "@/lib/mongodb";
import { checkAddress, priceOrder } from "@/lib/orderPricing";
import { requireAuth } from "@/lib/requireAuth";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// POST /api/user/order  — place a Cash on Delivery order
// Body: { items: [{ grocery, quantity }], address: {...} }
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(["user"]);
    if ("error" in authResult) return authResult.error;
    // The buyer is always the logged-in user, never an id from the request body
    const userId = authResult.user.id;

    await connectDb();
    const { items, address } = await req.json();

    const checkedAddress = checkAddress(address);
    if (!checkedAddress.ok) {
      return NextResponse.json({ message: checkedAddress.message }, { status: 400 });
    }
    // Prices and the total are calculated here, not trusted from the browser
    const priced = await priceOrder(items);
    if (!priced.ok) {
      return NextResponse.json({ message: priced.message }, { status: 400 });
    }

    const newOrder = await Order.create({
      user: userId,
      items: priced.value.items,
      paymentMethod: "cod",
      totalAmount: priced.value.totalAmount,
      address: checkedAddress.value,
    });

    // Admin "Manage Orders" page shows it instantly
    await emitEventHandler("new-order", newOrder);

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error("Place order error:", error);
    return NextResponse.json(
      { message: "Could not place the order. Please try again." },
      { status: 500 },
    );
  }
}
