"use client";
import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  MapPin,
  Package,
  Phone,
  Truck,
  User,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import axios from "axios";
import mongoose from "mongoose";
import { IUser } from "@/models/user.model";
import { displayMobile } from "@/lib/mobile";
import PaymentReceivedModal from "./PaymentReceivedModal";
import {
  PAYMENT_METHOD_LABELS,
  ROLE_LABELS,
  formatPaidAt,
  type PaymentConfirmationMethod,
  type PaymentReceivedByRole,
} from "@/lib/payment";

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
  paymentReceivedBy?: { name?: string } | string | null;
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
  assignedDeliveryBoy?: IUser;
  status: "pending" | "out of delivery" | "delivered";
  createdAt?: Date;
  updatedAt?: Date;
}

const AdminOrderCard = ({ order }: { order: IOrder }) => {
  const statusOptions = ["pending", "out of delivery"];
  const [expended, setExpended] = useState(false);

  const [status, setStatus] = useState<string>("pending");
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<{ type: "info" | "error"; text: string } | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  // Shown at once after the admin confirms; the list also reloads via socket
  const [confirmedPayment, setConfirmedPayment] = useState<Partial<IOrder> | null>(null);
  const pay = { ...order, ...confirmedPayment };
  const receivedByName =
    pay.paymentReceivedBy && typeof pay.paymentReceivedBy === "object"
      ? pay.paymentReceivedBy.name
      : undefined;

  const updateStatus = async (orderId: string, nextStatus: string) => {
    setUpdating(true);
    setNotice(null);
    try {
      const result = await axios.post(
        `/api/admin/update-order-status/${orderId}`,
        { status: nextStatus },
      );
      setStatus(nextStatus);
      if (nextStatus === "out of delivery") {
        const riders = result.data?.availableBoys?.length ?? 0;
        setNotice(
          riders > 0
            ? { type: "info", text: `Job sent to ${riders} nearby rider${riders > 1 ? "s" : ""}. Waiting for one to accept.` }
            : result.data?.assignment
              ? { type: "info", text: "Already sent to riders." }
              : { type: "error", text: "No free rider within 10 km right now. Try again later." },
        );
      }
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        text:
          axios.isAxiosError(error) && error.response?.data?.message
            ? error.response.data.message
            : "Could not update the status. Please try again.",
      });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    setStatus(order.status);
  }, [order]);

  return (
    <motion.div
      key={order._id?.toString()}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white shadow-md hover:shadow-lg border border-gray-100 rounded-2xl p-6 transition-all "
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-lg font-bold flex items-center gap-2 text-green-700">
            <Package size={20} />
            Order #{order._id?.toString().slice(-6)}
          </p>
          <span
            className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border
    ${
      pay.isPaid
        ? "bg-green-100 text-green-700 border-green-300"
        : "bg-red-100 text-red-700 border-red-300"
    }`}
          >
            {pay.isPaid ? "Paid" : "Payment Pending"}
          </span>
          <p className="text-gray-500 text-sm">
            {new Date(order.createdAt!).toLocaleString()}
          </p>
          <p className="flex items-center gap-2 font-semibold">
            <User size={16} className="text-green-600" />
            <span>{order?.address?.fullName}</span>
          </p>
          <p className="flex items-center gap-2 font-semibold">
            <Phone size={16} className="text-green-600" />
            <span>{order?.address?.mobile}</span>
          </p>
          <p className="flex items-center gap-2 font-semibold">
            <MapPin size={16} className="text-green-600" />
            <span>{order?.address?.fullAddress}</span>
          </p>
          {/* Payment */}
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 space-y-1 max-w-md">
            <p className="flex items-center gap-2">
              <CreditCard size={16} className="text-green-600" />
              <span className="font-semibold">Payment:</span>
              {order?.paymentMethod === "cod" ? "Cash On Delivery" : "Online (Stripe)"}
              <span className="text-gray-400">·</span>
              <span className={pay.isPaid ? "text-green-700 font-semibold" : "text-yellow-700 font-semibold"}>
                {pay.isPaid ? "Paid" : "Pending"}
              </span>
            </p>
            {pay.isPaid && pay.paymentConfirmationMethod && (
              <div className="pl-6 text-xs text-gray-600 space-y-0.5">
                <p>
                  Method: <b>{PAYMENT_METHOD_LABELS[pay.paymentConfirmationMethod]}</b>
                  {pay.paymentReceivedByRole === "deliveryBoy" &&
                    pay.paymentConfirmationMethod === "cash" &&
                    " (cash received by rider)"}
                </p>
                {pay.paymentReceivedByRole && (
                  <p>
                    Confirmed by: <b>{ROLE_LABELS[pay.paymentReceivedByRole]}</b>
                    {receivedByName ? ` (${receivedByName})` : ""}
                  </p>
                )}
                {pay.paidAt && <p>Confirmed at: {formatPaidAt(pay.paidAt)}</p>}
                {pay.paymentConfirmationNote && (
                  <p className="italic">Reason: {pay.paymentConfirmationNote}</p>
                )}
              </div>
            )}
            {order.paymentMethod === "cod" && !pay.isPaid && (
              <button
                onClick={() => setPaymentModalOpen(true)}
                className="ml-6 mt-1 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition"
              >
                Mark Payment Received
              </button>
            )}
          </div>
          {paymentModalOpen && (
            <PaymentReceivedModal
              orderId={order._id!.toString()}
              amount={Number(order.totalAmount)}
              onClose={() => setPaymentModalOpen(false)}
              onConfirmed={(payment) => {
                setConfirmedPayment(payment as Partial<IOrder>);
                setPaymentModalOpen(false);
              }}
            />
          )}

          {order.assignedDeliveryBoy && (
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
          )}
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
              status === "delivered"
                ? "bg-green-100 text-green-700"
                : status === "pending"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
            }`}
          >
            {status}
          </span>
          {/* "delivered" is set by the rider, so admins only see it (read only) */}
          {status !== "delivered" && (
            <select
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm shadow-sm hover:border-green-400 transition focus:ring-2 focus:ring-green-500 outline-none"
              value={status}
              disabled={updating}
              onChange={(e) =>
                updateStatus(order._id?.toString()!, e.target.value)
              }
            >
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st.toUpperCase()}
                </option>
              ))}
            </select>
          )}
          {notice && (
            <p
              role={notice.type === "error" ? "alert" : "status"}
              className={`text-xs max-w-60 md:text-right ${notice.type === "error" ? "text-red-600" : "text-blue-700"}`}
            >
              {notice.text}
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-gray-200 mt-3 pt-3">
        <button
          onClick={() => setExpended((prev) => !prev)}
          className="w-full flex justify-between items-center text-sm font-medium text-gray-700 hover:text-green-700 transition"
        >
          <span className="flex items-center gap-2">
            <Package size={16} className="text-green-600" />
            {expended ? "Hide Order Items" : `view ${order.items.length} Items`}
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
      <div className="border-t pt-3 mt-3 flex justify-between items-center text-sm font-semibold text-gray-800">
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
    </motion.div>
  );
};

export default AdminOrderCard;
