"use client";
import React, { useState } from "react";
import { motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  MapPin,
  Package,
  Truck,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import { displayMobile } from "@/lib/mobile";
import {
  customerPaymentMethodLabel,
  formatPaidAt,
  type PaymentConfirmationMethod,
  type PaymentReceivedByRole,
} from "@/lib/payment";
import mongoose from "mongoose";
import { IUser } from "@/models/user.model";
import { useRouter } from "next/navigation";

interface IOrder {
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
  isPaid: boolean;
  paidAt?: string | Date | null;
  paymentConfirmationMethod?: PaymentConfirmationMethod | null;
  paymentReceivedByRole?: PaymentReceivedByRole | null;
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
  assignedDeliveryBoy?: IUser;
  status: "pending" | "out of delivery" | "delivered";
  createdAt?: Date;
  updatedAt?: Date;
}

const UserOrderCard = ({ order }: { order: IOrder }) => {
  const [expended, setExpended] = useState(false);
  // my-orders reloads the list on every realtime status update
  const status = order.status;
  const router = useRouter();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "out of delivery":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "delivered":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-600 border-gray-300";
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-gray-100 px-5 py-4 bg-linear-to-r from-green-50 to-white">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            order{" "}
            <span className="text-green-700 font-bold">
              #{order?._id?.toString()?.slice(-6)}
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(order.createdAt!).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              order.isPaid
                ? "bg-green-100 text-green-700 border-green-300"
                : "bg-red-100 text-red-700 border-red-300"
            }`}
          >
            {order.isPaid ? "Paid" : "Payment Pending"}
          </span>
          <span
            className={`px-3 py-1 text-xs font-semibold border rounded-full capitalize ${getStatusColor(
              status,
            )}`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-gray-700 text-sm">
          <span className="flex items-center gap-2">
            {order.paymentMethod == "cod" ? (
              <Truck size={16} className="text-green-600" />
            ) : (
              <CreditCard size={16} className="text-green-600" />
            )}
            Payment Method: <b>{customerPaymentMethodLabel(order)}</b>
          </span>
          <span>
            Payment Status:{" "}
            <b className={order.isPaid ? "text-green-700" : "text-yellow-700"}>
              {order.isPaid ? "Paid" : "Payment Pending"}
            </b>
            {order.isPaid && order.paidAt && (
              <span className="text-gray-500 text-xs"> · {formatPaidAt(order.paidAt)}</span>
            )}
          </span>
        </div>

        {order.assignedDeliveryBoy && (
          <>
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <UserCheck className="text-blue-600" size={18} />
                <div className="font-semibold text-gray-800">
                  <p className="">
                    Assigned to : <span>{order.assignedDeliveryBoy.name}</span>
                  </p>
                  <p className="text-xs text-gray-600">
                    📞 {displayMobile(order.assignedDeliveryBoy.mobile)}
                  </p>
                </div>
              </div>

              <a
                href={`tel:${order.assignedDeliveryBoy.mobile}`}
                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
              >
                Call
              </a>
            </div>
            {/* Nothing left to track once the order is delivered */}
            {status !== "delivered" && (
              <button
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-semibold px-4 py-2 rounded-xl shadow hover:bg-green-700 transition"
                onClick={() => {
                  if (!order._id) return;
                  router.push(`/user/track-order/${order._id.toString()}`);
                }}
              >
                <Truck size={18} /> Track Your Order
              </button>
            )}
          </>
        )}

        <div className="flex items-center gap-2 text-gray-700 text-sm">
          <MapPin size={16} className="text-green-600" />
          <span className="truncate">{order.address.fullAddress}</span>
        </div>
        <div className="border-t border-gray-200 pt-3">
          <button
            onClick={() => setExpended((prev) => !prev)}
            className="w-full flex justify-between items-center text-sm font-medium text-gray-700 hover:text-green-700 transition"
          >
            <span className="flex items-center gap-2">
              <Package size={16} className="text-green-600" />
              {expended
                ? "Hide Order Items"
                : `view ${order.items.length} Items`}
            </span>
            {expended ? (
              <ChevronUp size={16} className="text-green-600" />
            ) : (
              <ChevronDown size={16} className="text-green-600" />
            )}
          </button>
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: expended ? "auto" : 0,
              opacity: expended ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2 hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={48}
                      height={48}
                      className=" rounded-lg object-cover border border-gray-200"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} x {item.unit}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    Rs.{Number(item.price) * item.quantity}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        <div className="border-t pt-3 flex justify-between items-center text-sm font-semibold text-gray-800">
          <div className="flex items-center gap-2 text-gray-700 text-sm">
            <Truck size={16} className="text-green-600" />
            <span>
              Delivery:{" "}
              <span className="text-green-700 font-semibold">{status}</span>
            </span>
          </div>
          <div>
            Total:{" "}
            <span className="text-green-700 font-bold">
              Rs.{Number(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UserOrderCard;
