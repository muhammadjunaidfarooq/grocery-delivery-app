import mongoose, { Schema, Model } from "mongoose";
import { GROCERY_CATEGORIES, GROCERY_UNITS } from "@/lib/groceryOptions";

// 1. Define the interface extending Mongoose Document
export interface IGrocery {
  _id? : mongoose.Types.ObjectId | string,
  name: string;
  category: string;
  price: string;
  unit: string; // e.g., "kg", "dozen", "piece"
  image: string;
  // Missing on older products: treat a missing value as "in stock"
  inStock?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Define the Schema
const grocerySchema = new Schema<IGrocery>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: GROCERY_CATEGORIES,
      required: true,
    },
    price: {
      type: String,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      enum: GROCERY_UNITS,
    },
    image: {
      type: String,
      required: true,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }, // Handles createdAt and updatedAt automatically
);

// 3. Prevent model re-compilation (Critical for Next.js)
const Grocery: Model<IGrocery> =
  mongoose.models.Grocery || mongoose.model<IGrocery>("Grocery", grocerySchema);

export default Grocery;
