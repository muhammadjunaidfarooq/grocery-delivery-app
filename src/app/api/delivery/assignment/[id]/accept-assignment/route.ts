import emitEventHandler from "@/lib/emitEventHandler";
import { requireAuth } from "@/lib/requireAuth";
import connectDb from "@/lib/mongodb";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import Order from "@/models/order.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(["deliveryBoy"]);
    if ("error" in authResult) return authResult.error;
    const deliveryBoyId = authResult.user.id;

    await connectDb();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { message: "invalid assignment id" },
        { status: 400 },
      );
    }

    // A rider can only have one active delivery at a time
    const activeJob = await DeliveryAssignment.findOne({
      assignedTo: deliveryBoyId,
      status: "assigned",
    });
    if (activeJob) {
      return NextResponse.json(
        { message: "already assigned to other order" },
        { status: 409 },
      );
    }

    // One atomic update: it only matches while the job is still "brodcasted",
    // nobody has it, and it was offered to this rider. If two riders accept at
    // the same moment, MongoDB lets only one of them match.
    const assignment = await DeliveryAssignment.findOneAndUpdate(
      {
        _id: id,
        status: "brodcasted",
        assignedTo: null,
        brodcastedTo: deliveryBoyId,
      },
      {
        $set: {
          assignedTo: deliveryBoyId,
          status: "assigned",
          acceptedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!assignment) {
      const exists = await DeliveryAssignment.exists({ _id: id });
      if (!exists) {
        return NextResponse.json(
          { message: "assignment not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { message: "assignment is no longer available" },
        { status: 409 },
      );
    }

    const order = await Order.findByIdAndUpdate(assignment.order, {
      assignedDeliveryBoy: deliveryBoyId,
    });
    if (!order) {
      // Undo the claim so the job is not stuck on a missing order
      await DeliveryAssignment.updateOne(
        { _id: assignment._id },
        {
          $set: { status: "brodcasted" },
          $unset: { assignedTo: "", acceptedAt: "" },
        },
      );
      return NextResponse.json({ message: "order not found" }, { status: 404 });
    }

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

    // Tell the customer's pages (My Orders, Track Order) to reload this order
    await emitEventHandler("order-status-update", {
      orderId: order._id,
      status: order.status,
    });

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
