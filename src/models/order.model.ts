import mongoose from "mongoose";
import {
  MAX_PAYMENT_NOTE_LENGTH,
  PAYMENT_CONFIRMATION_METHODS,
  type PaymentConfirmationMethod,
} from "@/lib/payment";

export interface IOrder {
  _id?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  items: {
    grocery: mongoose.Types.ObjectId;
    name: string;
    price: string;
    unit: string;
    image: string;
    quantity: number;
  }[];
  // Payment status: false = pending, true = paid
  isPaid: boolean;
  // How and by whom the payment was confirmed (empty while unpaid)
  paidAt?: Date | null;
  paymentConfirmationMethod?: PaymentConfirmationMethod | null;
  paymentReceivedBy?: mongoose.Types.ObjectId | null;
  paymentReceivedByRole?: "deliveryBoy" | "admin" | null;
  paymentConfirmationNote?: string;
  totalAmount: {
    type: number;
  };
  paymentMethod: "cod" | "online";
  address: {
    fullName: string;
    mobile: string;
    city: string;
    state: string;
    pincode: string;
    fullAddress: string;
    latitude: number;
    longitude: number;
  };
  assignment?: mongoose.Types.ObjectId;
  assignedDeliveryBoy?: mongoose.Types.ObjectId;
  status: "pending" | "out of delivery" | "delivered";
  createdAt?: Date;
  updatedAt?: Date;
}

const orderSchema = new mongoose.Schema<IOrder>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        grocery: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Grocery",
          required: true,
        },
        name: String,
        price: String,
        unit: String,
        image: String,
        quantity: Number,
      },
    ],
    isPaid: {
      type: Boolean,
      default: false,
    },
    // Payment confirmation audit (all optional, so older orders stay valid)
    paidAt: {
      type: Date,
      default: null,
    },
    paymentConfirmationMethod: {
      type: String,
      enum: [...PAYMENT_CONFIRMATION_METHODS, null],
      default: null,
    },
    paymentReceivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    paymentReceivedByRole: {
      type: String,
      enum: ["deliveryBoy", "admin", null],
      default: null,
    },
    // Admin's reason for a manual confirmation. Internal: never sent to customers.
    paymentConfirmationNote: {
      type: String,
      trim: true,
      maxlength: MAX_PAYMENT_NOTE_LENGTH,
    },
    totalAmount: {
      type: Number,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "online"],
      default: "cod",
    },
    address: {
      fullName: String,
      mobile: String,
      city: String,
      state: String,
      pincode: String,
      fullAddress: String,
      latitude: Number,
      longitude: Number,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryAssignment",
      default: null,
    },
    assignedDeliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["pending", "out of delivery", "delivered"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// In `next dev`, the old compiled model survives hot reloads. If it was built
// from an older version of this schema (for example before the payment
// fields were added), rebuild it so new fields are saved and can be populated.
if (mongoose.models.Order && !mongoose.models.Order.schema.path("paymentReceivedBy")) {
  mongoose.deleteModel("Order");
}

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;
