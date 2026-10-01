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
    const { socketId } = body;
    // A logged-in user can only register a socket for themselves.
    // The socket server (secret header) may name any user.
    const userId = authResult.via === "session" ? authResult.user.id : body.userId;
    const user = await User.findByIdAndUpdate(
      userId,
      {
        socketId,
        isOnline: true,
      },
      { new: true },
    );
    if (!user) {
      return NextResponse.json({ message: "user not found" }, { status: 400 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
