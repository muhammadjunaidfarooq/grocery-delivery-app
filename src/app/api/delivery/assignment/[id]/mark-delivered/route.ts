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

    const existing = await DeliveryAssignment.findById(id).select(
      "assignedTo status order",
    );
    if (!existing) {
      return NextResponse.json(
        { message: "assignment not found" },
        { status: 404 },
      );
    }

    // Only the rider this job is assigned to can complete it
    if (!existing.assignedTo || String(existing.assignedTo) !== deliveryBoyId) {
      return NextResponse.json(
        { message: "Only the assigned rider can mark this order as delivered" },
        { status: 403 },
      );
    }
    if (existing.status !== "assigned") {
      return NextResponse.json(
        { message: "this delivery is already completed" },
        { status: 409 },
      );
    }

    // The order must really be out for delivery. (An admin could have moved it
    // back to "pending" after the rider accepted it.)
    const currentOrder = await Order.findById(existing.order).select("status");
    if (!currentOrder) {
      return NextResponse.json({ message: "order not found" }, { status: 404 });
    }
    if (currentOrder.status !== "out of delivery") {
      return NextResponse.json(
        { message: "this order is not out for delivery" },
        { status: 409 },
      );
    }

    // Complete the job. The filter repeats the checks, so a double tap cannot
    // complete it twice. Completing it frees the rider: the "busy" checks only
    // look for status "assigned".
    const assignment = await DeliveryAssignment.findOneAndUpdate(
      { _id: id, assignedTo: deliveryBoyId, status: "assigned" },
      { $set: { status: "completed" } },
      { returnDocument: "after" },
    );
    if (!assignment) {
      return NextResponse.json(
        { message: "this delivery is already completed" },
        { status: 409 },
      );
    }

    await Order.findByIdAndUpdate(assignment.order, { status: "delivered" });

    // Tell the customer's pages (My Orders, Track Order) to reload this order
    await emitEventHandler("order-status-update", {
      orderId: assignment.order,
      status: "delivered",
    });

    return NextResponse.json(
      { message: "order marked as delivered" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: `mark delivered error ${error}` },
      { status: 500 },
    );
  }
}
