// Allowed values and server-side checks for grocery products.
// Used by the model and by every admin route that adds or edits a product.

export const GROCERY_CATEGORIES = [
  "Fruits & Vegetables",
  "Dairy & Eggs",
  "Rice, Atta & Grains",
  "Snacks & Biscuits",
  "Spices & Masalas",
  "Beverages & Drinks",
  "Personal Care",
  "Household Essentials",
  "Instant & Packaged Food",
  "Baby & Pet Care",
] as const;

export const GROCERY_UNITS = [
  "kg",
  "g",
  "liter",
  "ml",
  "piece",
  "pack",
] as const;

const MAX_PRICE = 1_000_000;
const MAX_NAME_LENGTH = 100;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Check<T> = { ok: true; value: T } | { ok: false; message: string };

export function checkName(input: unknown): Check<string> {
  const name = typeof input === "string" ? input.trim() : "";
  if (!name) return { ok: false, message: "Name is required" };
  if (name.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      message: `Name must be at most ${MAX_NAME_LENGTH} characters`,
    };
  }
  return { ok: true, value: name };
}

export function checkCategory(input: unknown): Check<string> {
  if (
    typeof input === "string" &&
    (GROCERY_CATEGORIES as readonly string[]).includes(input)
  ) {
    return { ok: true, value: input };
  }
  return { ok: false, message: "Category is not an allowed value" };
}

export function checkUnit(input: unknown): Check<string> {
  if (
    typeof input === "string" &&
    (GROCERY_UNITS as readonly string[]).includes(input)
  ) {
    return { ok: true, value: input };
  }
  return { ok: false, message: "Unit is not an allowed value" };
}

/**
 * Price must be a positive number with at most 2 decimals. It is still stored
 * as a String in the database, so this returns a clean string ("120.5").
 */
export function checkPrice(input: unknown): Check<string> {
  const text = typeof input === "string" ? input.trim() : "";
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return {
      ok: false,
      message: "Price must be a number with at most 2 decimals",
    };
  }
  const value = Number(text);
  if (!(value > 0)) {
    return { ok: false, message: "Price must be greater than 0" };
  }
  if (value > MAX_PRICE) {
    return { ok: false, message: `Price must be at most ${MAX_PRICE}` };
  }
  return { ok: true, value: String(value) };
}

/** An uploaded image must really be an image file and not too big. */
export function checkImage(input: unknown): Check<Blob> {
  if (
    !input ||
    typeof input === "string" ||
    typeof (input as Blob).arrayBuffer !== "function"
  ) {
    return { ok: false, message: "Image is required" };
  }
  const file = input as Blob;
  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "File must be an image" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "Image must be 5 MB or smaller" };
  }
  return { ok: true, value: file };
}
