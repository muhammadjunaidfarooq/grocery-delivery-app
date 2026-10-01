import { requireAuth } from "@/lib/requireAuth";
import connectDb from "@/lib/mongodb";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
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

    // Remove only this rider from the list of riders who were offered the job.
    // The assignment itself stays "brodcasted", so other riders can still
    // accept it. It only matches while the job is still open and offered to
    // this rider.
    const result = await DeliveryAssignment.updateOne(
      { _id: id, status: "brodcasted", brodcastedTo: deliveryBoyId },
      { $pull: { brodcastedTo: deliveryBoyId } },
    );

    if (result.matchedCount === 0) {
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

    return NextResponse.json(
      { message: "assignment rejected" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: `reject assignment error ${error}` },
      { status: 500 },
    );
  }
}
