import { requireAuth } from "@/lib/requireAuth";
import connectDb from "@/lib/mongodb";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authResult = await requireAuth(["deliveryBoy"]);
    if ("error" in authResult) return authResult.error;
    const deliveryBoyId = authResult.user.id;

    await connectDb();
    const activeAssignment = await DeliveryAssignment.findOne({
      assignedTo: deliveryBoyId,
      status: "assigned",
    })
      .populate({
        path: "order",
        populate: { path: "address" },
      })
      .lean();
    if (!activeAssignment) {
      return NextResponse.json({ active: false }, { status: 200 });
    }
    return NextResponse.json(
      { active: true, assignment: activeAssignment },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: `Current order error: ${error}` },
      { status: 500 },
    );
  }
}
