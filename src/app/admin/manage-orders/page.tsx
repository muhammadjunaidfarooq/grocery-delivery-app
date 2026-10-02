"use client";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import AdminOrderCard from "@/components/AdminOrderCard";
import { getSocket } from "@/lib/socket";
import mongoose from "mongoose";
import { IUser } from "@/models/user.model";

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

const ManageOrders = () => {
  const [orders, setOrders] = useState<IOrder[]>();
  const [error, setError] = useState("");
  const router = useRouter();

  const getOrders = useCallback(async () => {
    try {
      const result = await axios.get("/api/admin/get-orders");
      setOrders(result.data);
      setError("");
    } catch (error) {
      console.error(error);
      setError("Could not load orders. Please refresh the page.");
    }
  }, []);

  useEffect(() => {
    getOrders();
  }, [getOrders]);

  // Realtime: new orders appear at the top; rider accept / delivered updates
  // reload the list so the assigned rider and status are always current.
  useEffect(() => {
    const socket = getSocket();
    const onNewOrder = (newOrder: IOrder) => {
      setOrders((prev = []) => [
        newOrder,
        ...prev.filter((o) => String(o._id) !== String(newOrder._id)),
      ]);
    };
    socket.on("new-order", onNewOrder);
    socket.on("order-status-update", getOrders);
    return () => {
      socket.off("new-order", onNewOrder);
      socket.off("order-status-update", getOrders);
    };
  }, [getOrders]);

  return (
    <div className="bg-linear-to-b from-white to-gray-100 min-h-screen w-full">
      <div className="fixed top-0 left-0 w-full backdrop-blur-lg bg-white/70 shadow-sm border-b z-50">
        <div className="max-w-3xl mx-auto flex items-center gap-4 px-4 py-3">
          <button
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 active:scale-95 transition"
            onClick={() => router.push("/")}
          >
            <ArrowLeft size={24} className="text-green-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Manage Orders</h1>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16 space-y-8">
        <div className="space-y-6">
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 text-center">
              {error}
            </div>
          )}
          {!orders && !error &&
            [1, 2].map((i) => (
              <div key={i} className="h-48 bg-white rounded-2xl shadow-md animate-pulse" />
            ))}
          {orders?.length === 0 && (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
              No orders yet. New orders will appear here instantly.
            </div>
          )}
          {orders?.map((order, index) => (
            <motion.div key={order._id?.toString() ?? index}>
              <AdminOrderCard order={order} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageOrders;
