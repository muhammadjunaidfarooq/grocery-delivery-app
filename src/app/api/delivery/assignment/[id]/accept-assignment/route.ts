import { requireAuth } from "@/lib/requireAuth";
import connectDb from "@/lib/mongodb";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await requireAuth(["deliveryBoy"]);
    if ("error" in authResult) return authResult.error;
    const deliveryBoyId = authResult.user.id;

    await connectDb();
    const { id } = await params;

    const assignment = await DeliveryAssignment.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { message: "assignment not found" },
        { status: 400 },
      );
    }
    if (assignment.status !== "brodcasted") {
      return NextResponse.json(
        { message: "assignment expired" },
        { status: 400 },
      );
    }

    const alreadyAssigned = await DeliveryAssignment.findOne({
      assignedTo: deliveryBoyId,
      status: { $nin: ["brodcasted", "completed"] },
    });

    if (alreadyAssigned) {
      return NextResponse.json(
        { message: "already assigned to other order" },
        { status: 400 },
      );
    }

    assignment.assignedTo = deliveryBoyId;
    assignment.status = "assigned";
    assignment.acceptedAt = new Date();
    await assignment.save();

    const order = await Order.findById(assignment.order);
    if (!order) {
      return NextResponse.json({ message: "order not found" }, { status: 400 });
    }
    order.assignedDeliveryBoy = deliveryBoyId;
    await order.save();

    await DeliveryAssignment.updateMany(
      {
        _id: { $ne: assignment._id },
        brodcastedTo: deliveryBoyId,
        status: "brodcasted",
      },
      {
        $pull: { brodcastedTo: deliveryBoyId },
      },
    );

    return NextResponse.json(
      { message: "order accepted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: `accept assignment error ${error}` },
      { status: 500 },
    );
  }
}
