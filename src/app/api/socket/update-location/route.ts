import connectDb from "@/lib/mongodb";
import { requireSessionOrSocketSecret } from "@/lib/socketAuth";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireSessionOrSocketSecret(req);
    if ("error" in authResult) return authResult.error;

    await connectDb();
    const body = await req.json();
    const { location } = body;
    // A logged-in user can only update their own location.
    // The socket server (secret header) may name any user.
    const userId = authResult.via === "session" ? authResult.user.id : body.userId;
    if (!userId || !location) {
      return NextResponse.json(
        { message: "missing userId or Location" },
        { status: 400 },
      );
    }

    const [lng, lat] = location?.coordinates ?? [];
    if (
      !mongoose.isValidObjectId(userId) ||
      location?.type !== "Point" ||
      !Number.isFinite(lng) ||
      !Number.isFinite(lat)
    ) {
      return NextResponse.json({ message: "invalid location" }, { status: 400 });
    }
    const result = await User.updateOne(
      { _id: userId },
      { location: { type: "Point", coordinates: [lng, lat] } },
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "user not found" }, { status: 400 });
    }

    return NextResponse.json({ message: "Location updated" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: `update location error ${error}` },
      { status: 500 },
    );
  }
}
