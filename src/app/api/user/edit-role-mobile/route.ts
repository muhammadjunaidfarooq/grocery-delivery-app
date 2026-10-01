import connectDb from "@/lib/mongodb";
import { cleanMobile, formatMobile, isValidMobile } from "@/lib/mobile";
import { requireAuth } from "@/lib/requireAuth";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

const SELF_ASSIGNABLE_ROLES = ["user", "deliveryBoy"];

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ("error" in authResult) return authResult.error;
    const { user: sessionUser } = authResult;

    await connectDb();
    const { role, mobile } = await req.json();

    // Same cleaning as the form: digits only, no leading 0. It must then be
    // exactly 10 digits starting with 3, and is saved as "+92XXXXXXXXXX".
    const cleanedMobile = cleanMobile(mobile);
    if (!isValidMobile(cleanedMobile)) {
      return NextResponse.json(
        { message: "Mobile must be 10 digits starting with 3 (after +92)" },
        { status: 400 },
      );
    }

    // "admin" can only be chosen by the very first admin (when no admin
    // exists yet), or by someone who is already an admin.
    let roleAllowed = SELF_ASSIGNABLE_ROLES.includes(role);
    if (role === "admin") {
      const adminExists = await User.exists({ role: "admin" });
      roleAllowed = !adminExists || sessionUser.role === "admin";
    }
    if (!roleAllowed) {
      return NextResponse.json(
        { message: "You cannot choose this role" },
        { status: 403 },
      );
    }

    const user = await User.findOneAndUpdate(
      { email: sessionUser.email },
      { role, mobile: formatMobile(cleanedMobile) },
      { returnDocument: "after" }, // Fixes the Mongoose warning
    );

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
