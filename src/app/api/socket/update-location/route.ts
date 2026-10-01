import connectDb from "@/lib/mongodb";
import { requireSessionOrSocketSecret } from "@/lib/socketAuth";
import User from "@/models/user.model";
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

    const user = await User.findByIdAndUpdate(userId, { location });
    if (!user) {
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
