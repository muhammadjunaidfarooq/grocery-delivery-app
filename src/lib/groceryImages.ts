import { deleteFromCloudinary } from "@/lib/cloudinary";
import Grocery from "@/models/grocery.model";
import Order from "@/models/order.model";

/**
 * Deletes a product image from Cloudinary, but only if nothing else uses it.
 *
 * Every order item stores its own copy of the image URL (not a link to the
 * product), so past orders still show the picture. If we deleted the file
 * while an order points at it, that order would show a broken image. So the
 * file is kept when any order item or any other product uses the same URL.
 *
 * Returns "deleted", "kept" (still in use) or "failed" (Cloudinary error or
 * not one of our files). It never throws, because the product change has
 * already been saved when this runs.
 */
export async function deleteImageIfUnused(
  imageUrl: string,
  exceptGroceryId?: string,
): Promise<"deleted" | "kept" | "failed"> {
  try {
    const usedByOrder = await Order.exists({ "items.image": imageUrl });
    if (usedByOrder) return "kept";

    const usedByGrocery = await Grocery.exists({
      image: imageUrl,
      ...(exceptGroceryId ? { _id: { $ne: exceptGroceryId } } : {}),
    });
    if (usedByGrocery) return "kept";

    return (await deleteFromCloudinary(imageUrl)) ? "deleted" : "failed";
  } catch (error) {
    console.error("deleteImageIfUnused error:", error);
    return "failed";
  }
}
