import connectDb from "@/lib/mongodb";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

const bad = (message: string) => NextResponse.json({ message }, { status: 400 });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!name) return bad("Name is required");
    if (!/^\S+@\S+\.\S+$/.test(email)) return bad("Please enter a valid email");
    if (password.length < 6) return bad("Password must be at least 6 characters");

    await connectDb();
    const existUser = await User.findOne({ email });
    if (existUser) return bad("Email already exists");

    const hashPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashPassword });

    // Never send the password hash back to the browser
    return NextResponse.json(
      { _id: user._id, name: user.name, email: user.email, role: user.role },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { message: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}
