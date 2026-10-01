import uploadOnCloudinary, { deleteFromCloudinary } from "@/lib/cloudinary";
import {
  checkCategory,
  checkImage,
  checkName,
  checkPrice,
  checkUnit,
} from "@/lib/groceryOptions";
import { deleteImageIfUnused } from "@/lib/groceryImages";
import connectDb from "@/lib/mongodb";
import { requireAuth } from "@/lib/requireAuth";
import Grocery from "@/models/grocery.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };

const bad = (message: string, status = 400) =>
  NextResponse.json({ message }, { status });

// PATCH /api/admin/groceries/:id  (multipart form, every field optional)
// Fields: name, category, price, unit, inStock ("true" | "false"), image (file)
export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    const authResult = await requireAuth(["admin"]);
    if ("error" in authResult) return authResult.error;

    await connectDb();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return bad("invalid grocery id");

    const grocery = await Grocery.findById(id);
    if (!grocery) return bad("grocery not found", 404);

    const formData = await req.formData();
    const update: Record<string, unknown> = {};

    // Validate only the fields that were sent
    if (formData.has("name")) {
      const checked = checkName(formData.get("name"));
      if (!checked.ok) return bad(checked.message);
      update.name = checked.value;
    }
    if (formData.has("category")) {
      const checked = checkCategory(formData.get("category"));
      if (!checked.ok) return bad(checked.message);
      update.category = checked.value;
    }
    if (formData.has("unit")) {
      const checked = checkUnit(formData.get("unit"));
      if (!checked.ok) return bad(checked.message);
      update.unit = checked.value;
    }
    if (formData.has("price")) {
      const checked = checkPrice(formData.get("price"));
      if (!checked.ok) return bad(checked.message);
      update.price = checked.value;
    }
    if (formData.has("inStock")) {
      const value = formData.get("inStock");
      if (value !== "true" && value !== "false") {
        return bad("inStock must be true or false");
      }
      update.inStock = value === "true";
    }

    // Optional new image. Upload it first, so a failed upload changes nothing.
    let newImageUrl: string | null = null;
    if (formData.has("image")) {
      const checked = checkImage(formData.get("image"));
      if (!checked.ok) return bad(checked.message);
      newImageUrl = await uploadOnCloudinary(checked.value);
      if (!newImageUrl) return bad("Image upload failed", 500);
      update.image = newImageUrl;
    }

    if (Object.keys(update).length === 0) return bad("Nothing to update");

    const updated = await Grocery.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: "after", runValidators: true },
    );
    if (!updated) {
      // The product was deleted while we were working: remove the new upload
      if (newImageUrl) await deleteFromCloudinary(newImageUrl);
      return bad("grocery not found", 404);
    }

    // The old image is replaced on Cloudinary, unless an order still shows it
    if (newImageUrl && grocery.image !== newImageUrl) {
      await deleteImageIfUnused(grocery.image, id);
    }

    return NextResponse.json(
      { ...updated.toObject(), inStock: updated.inStock !== false },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: `update grocery error: ${error}` },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/groceries/:id
// Old orders keep working: every order item stores its own copy of the name,
// price, unit and image URL, and no code reads order items through the
// Grocery collection. The image file is only deleted from Cloudinary when no
// order item uses it (see deleteImageIfUnused).
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const authResult = await requireAuth(["admin"]);
    if ("error" in authResult) return authResult.error;

    await connectDb();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return bad("invalid grocery id");

    const grocery = await Grocery.findByIdAndDelete(id);
    if (!grocery) return bad("grocery not found", 404);

    const image = await deleteImageIfUnused(grocery.image, id);

    return NextResponse.json({ message: "grocery deleted", image }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: `delete grocery error: ${error}` },
      { status: 500 },
    );
  }
}
