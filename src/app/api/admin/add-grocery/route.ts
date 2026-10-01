import uploadOnCloudinary from "@/lib/cloudinary";
import {
  checkCategory,
  checkImage,
  checkName,
  checkPrice,
  checkUnit,
} from "@/lib/groceryOptions";
import connectDb from "@/lib/mongodb";
import { requireAuth } from "@/lib/requireAuth";
import Grocery from "@/models/grocery.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // 1. Admin Check: only admins may add groceries
    const authResult = await requireAuth(["admin"]);
    if ("error" in authResult) return authResult.error;

    await connectDb();

    // Read data that comes from the form (/api/admin/add-grocery)
    const formData = await req.formData();

    // 2. Validate every field on the server (never trust the browser)
    const name = checkName(formData.get("name"));
    const category = checkCategory(formData.get("category"));
    const unit = checkUnit(formData.get("unit"));
    const price = checkPrice(formData.get("price"));
    const file = checkImage(formData.get("image"));
    for (const check of [name, category, unit, price, file]) {
      if (!check.ok) {
        return NextResponse.json({ message: check.message }, { status: 400 });
      }
    }
    if (!name.ok || !category.ok || !unit.ok || !price.ok || !file.ok) {
      return NextResponse.json({ message: "Invalid input" }, { status: 400 });
    }

    // 3. Upload the image, and make sure we got a URL before saving
    const imageUrl = await uploadOnCloudinary(file.value);
    if (!imageUrl) {
      return NextResponse.json(
        { message: "Image upload failed" },
        { status: 500 },
      );
    }

    const grocery = await Grocery.create({
      name: name.value,
      category: category.value,
      price: price.value,
      unit: unit.value,
      image: imageUrl,
    });

    return NextResponse.json(grocery, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: `Add grocery error: ${error}` },
      { status: 500 },
    );
  }
}
