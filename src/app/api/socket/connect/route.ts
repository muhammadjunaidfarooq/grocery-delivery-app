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
    const { socketId } = body;
    // A logged-in user can only register a socket for themselves.
    // The socket server (secret header) may name any user.
    const userId = authResult.via === "session" ? authResult.user.id : body.userId;
    if (!mongoose.isValidObjectId(userId) || typeof socketId !== "string") {
      return NextResponse.json({ message: "invalid userId or socketId" }, { status: 400 });
    }
    const result = await User.updateOne(
      { _id: userId },
      { socketId, isOnline: true },
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "user not found" }, { status: 400 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("socket connect error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
