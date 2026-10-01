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

    // Only the rider this job is assigned to can complete it, and only while
    // it is still "assigned". Completing it also frees the rider: the "busy"
    // checks only look for status "assigned".
    const assignment = await DeliveryAssignment.findOneAndUpdate(
      { _id: id, assignedTo: deliveryBoyId, status: "assigned" },
      { $set: { status: "completed" } },
      { returnDocument: "after" },
    );

    if (!assignment) {
      const existing = await DeliveryAssignment.findById(id).select(
        "assignedTo status",
      );
      if (!existing) {
        return NextResponse.json(
          { message: "assignment not found" },
          { status: 404 },
        );
      }
      if (!existing.assignedTo || String(existing.assignedTo) !== deliveryBoyId) {
        return NextResponse.json(
          { message: "Only the assigned rider can mark this order as delivered" },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { message: "this delivery is already completed" },
        { status: 409 },
      );
    }

    const order = await Order.findByIdAndUpdate(assignment.order, {
      status: "delivered",
    });
    if (!order) {
      return NextResponse.json({ message: "order not found" }, { status: 404 });
    }

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
