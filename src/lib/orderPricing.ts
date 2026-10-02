import mongoose from "mongoose";
import Grocery from "@/models/grocery.model";
import { cleanMobile, formatMobile, isValidMobile } from "@/lib/mobile";

// Same rule the cart shows: free delivery above Rs.3500, otherwise Rs.120
export const FREE_DELIVERY_ABOVE = 3500;
export const DELIVERY_FEE = 120;
const MAX_QUANTITY = 50;

export const deliveryFeeFor = (subTotal: number) =>
  subTotal > FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export interface PricedOrder {
  items: {
    grocery: mongoose.Types.ObjectId;
    name: string;
    price: string;
    unit: string;
    image: string;
    quantity: number;
  }[];
  subTotal: number;
  deliveryFee: number;
  totalAmount: number;
}

/**
 * Builds the order items and total ON THE SERVER from the product ids and
 * quantities. Names, prices and images come from the database, never from
 * the browser, so a customer cannot change the price of what they buy.
 */
export async function priceOrder(input: unknown): Promise<Result<PricedOrder>> {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, message: "Your cart is empty" };
  }

  const wanted = new Map<string, number>();
  for (const raw of input) {
    const id = String(raw?.grocery ?? "");
    const quantity = Number(raw?.quantity);
    if (!mongoose.isValidObjectId(id)) {
      return { ok: false, message: "Invalid product in cart" };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { ok: false, message: `Quantity must be between 1 and ${MAX_QUANTITY}` };
    }
    wanted.set(id, (wanted.get(id) ?? 0) + quantity);
  }

  const products = await Grocery.find({ _id: { $in: [...wanted.keys()] } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items: PricedOrder["items"] = [];
  let subTotal = 0;
  for (const [id, quantity] of wanted) {
    const product = byId.get(id);
    if (!product) {
      return { ok: false, message: "A product in your cart no longer exists. Please remove it." };
    }
    if (product.inStock === false) {
      return { ok: false, message: `${product.name} is out of stock. Please remove it from your cart.` };
    }
    subTotal += Number(product.price) * quantity;
    items.push({
      grocery: new mongoose.Types.ObjectId(id),
      name: product.name,
      price: product.price,
      unit: product.unit,
      image: product.image,
      quantity,
    });
  }

  subTotal = Math.round(subTotal * 100) / 100;
  const deliveryFee = deliveryFeeFor(subTotal);
  return {
    ok: true,
    value: { items, subTotal, deliveryFee, totalAmount: subTotal + deliveryFee },
  };
}

export interface DeliveryAddress {
  fullName: string;
  mobile: string;
  city: string;
  state: string;
  pincode: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
}

const text = (value: unknown, max = 300) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Checks the delivery address sent from the checkout form. */
export function checkAddress(input: unknown): Result<DeliveryAddress> {
  const a = (input ?? {}) as Record<string, unknown>;
  const fullName = text(a.fullName, 100);
  const fullAddress = text(a.fullAddress);
  const city = text(a.city, 100);
  const latitude = Number(a.latitude);
  const longitude = Number(a.longitude);
  const mobileDigits = cleanMobile(String(a.mobile ?? "").replace(/^\+?92/, ""));

  if (!fullName) return { ok: false, message: "Full name is required" };
  if (!isValidMobile(mobileDigits)) {
    return { ok: false, message: "Enter a valid mobile number (e.g. 3001234567)" };
  }
  if (!fullAddress) return { ok: false, message: "Delivery address is required" };
  if (!city) return { ok: false, message: "City is required" };
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return { ok: false, message: "Please choose your location on the map" };
  }

  return {
    ok: true,
    value: {
      fullName,
      mobile: formatMobile(mobileDigits),
      city,
      state: text(a.state, 100),
      pincode: text(a.pincode, 20),
      fullAddress,
      latitude,
      longitude,
    },
  };
}
