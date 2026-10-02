"use client";

import dynamic from "next/dynamic";

// Leaflet needs `window`, so the map is loaded in the browser only
const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-125 rounded-xl bg-gray-100 animate-pulse" />
  ),
});
import { getSocket } from "@/lib/socket";
import { IMessage } from "@/models/message.model";
import { IUser } from "@/models/user.model";
import { RootState } from "@/redux/store";
import axios from "axios";
import { ArrowLeft, CheckCircle, Send } from "lucide-react";
import mongoose from "mongoose";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { AnimatePresence, motion } from "motion/react";

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

interface ILocation {
  latitude: number;
  longitude: number;
}

const TrackOrder = () => {
  const { orderId } = useParams();

  const router = useRouter();

  const { userData } = useSelector((state: RootState) => state.user);

  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const chatBoxRef=useRef<HTMLDivElement>(null)

  const [order, setOrder] = useState<IOrder>();
  const [userLocation, setUserLocation] = useState<ILocation>({
    latitude: 0,
    longitude: 0,
  });
  // null until the rider's position is known
  const [deliveryBoyLocation, setDeliveryBoyLocation] =
    useState<ILocation | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const getOrder = async () => {
      try {
        const result = await axios.get(`/api/user/get-order/${orderId}`);
        setOrder(result.data);
        setUserLocation({
          latitude: result.data.address.latitude,
          longitude: result.data.address.longitude,
        });
        // No rider yet (the order is still pending), so there is no location
        const riderCoordinates =
          result.data.assignedDeliveryBoy?.location?.coordinates;
        // [0, 0] is the default before the rider has shared a location
        if (riderCoordinates && (riderCoordinates[0] || riderCoordinates[1])) {
          setDeliveryBoyLocation({
            latitude: riderCoordinates[1],
            longitude: riderCoordinates[0],
          });
        }
      } catch (error) {
        console.error(error);
        setLoadError(
          axios.isAxiosError(error) && error.response?.status === 404
            ? "Order not found."
            : "Could not load this order. Please try again.",
        );
      }
    };

    getOrder();

    // Reload this order when a rider accepts or delivers it
    const socket = getSocket();
    const onStatusUpdate = (data: { orderId: string }) => {
      if (data.orderId?.toString() === String(orderId)) {
        getOrder();
      }
    };
    socket.on("order-status-update", onStatusUpdate);
    return () => {
      socket.off("order-status-update", onStatusUpdate);
    };
  }, [userData?._id]);

  // Live rider position: only follow the rider assigned to THIS order
  const riderId = order?.assignedDeliveryBoy?._id?.toString();
  useEffect(() => {
    if (!riderId) return;
    const socket = getSocket();
    const onLocation = (data: {
      userId: string;
      location: { coordinates: [number, number] };
    }) => {
      if (String(data.userId) !== riderId) return;
      setDeliveryBoyLocation({
        latitude: data.location.coordinates[1],
        longitude: data.location.coordinates[0],
      });
    };
    socket.on("update-deliveryBoy-location", onLocation);
    return () => {
      socket.off("update-deliveryBoy-location", onLocation);
    };
  }, [riderId]);

  useEffect(() => {
    const socket = getSocket();
    const joinRoom = () => socket.emit("join-room", orderId);
    joinRoom();
    // Rejoin the chat room after a reconnect
    socket.on("connect", joinRoom);
    const onMessage = (message: IMessage) => {
      if (String(message.roomId) === String(orderId)) {
        setMessages((prev) => [...prev, message]);
      }
    };
    socket.on("send-message", onMessage);
    return () => {
      socket.off("connect", joinRoom);
      socket.off("send-message", onMessage);
    };
  }, [orderId]);

  const sendMsg = () => {
    if (!newMessage.trim()) return;
    const socket = getSocket();

    const message = {
      roomId: orderId,
      text: newMessage,
      senderId: userData?._id,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    socket.emit("send-message", message);
    
    setNewMessage("");
  };

  useEffect(() => {
    const getAllMessages = async () => {
      try {
        const result = await axios.post("/api/chat/messages", {
          roomId: orderId,
        });
        setMessages(result.data);
      } catch (error) {
        console.log(error);
      }
    };
    getAllMessages();
  }, []);

  useEffect(()=>{
  chatBoxRef.current?.scrollTo({
    top:chatBoxRef.current.scrollHeight,
    behavior:"smooth"
  })
},[messages])

  return (
    <div className="w-full min-h-screen bg-linear-to-b from-green-50 to-white">
      <div className="max-w-2xl mx-auto pb-24">
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl p-4 border-b shadow flex gap-3 items-center z-1000">
          <button
            className="p-2 bg-green-100 rounded-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="text-green-700" size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold">Track Order</h2>
            <p className="text-sm text-gray-600">
              order#{order?._id?.toString().slice(-6)}{" "}
              <span className="text-green-700 font-semibold capitalize">
                {order?.status}
              </span>
              {order && (
                <span
                  className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    order.isPaid
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-yellow-100 text-yellow-700 border-yellow-300"
                  }`}
                >
                  {order.isPaid ? "Paid" : "Payment Pending"}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="px-4 mt-6">
          {loadError ? (
            <div className="bg-white rounded-3xl shadow border p-8 text-center text-red-600">
              {loadError}
            </div>
          ) : !order ? (
            <div className="bg-white rounded-3xl shadow border p-8 text-center text-gray-500 animate-pulse">
              Loading order...
            </div>
          ) : order?.status === "delivered" ? (
            <div className="bg-white rounded-3xl shadow-lg border p-8 text-center">
              <CheckCircle className="mx-auto text-green-600 w-16 h-16" />
              <h3 className="text-xl font-bold text-green-700 mt-4">
                Delivered
              </h3>
              <p className="text-gray-600 mt-1">
                Your order has been delivered. Thank you for shopping with
                OmniMart!
              </p>
            </div>
          ) : (
            <>
              {!deliveryBoyLocation && (
                <p className="text-sm text-gray-600 mb-2">
                  Waiting for the rider&apos;s live location...
                </p>
              )}
              <div className="rounded-3xl overflow-hidden border shadow mb-6">
                <LiveMap
                  userLocation={userLocation}
                  deliveryBoyLocation={deliveryBoyLocation}
                />
              </div>

              <div className="bg-white rounded-3xl shadow-lg border p-4 h-[430px] flex flex-col">
                <div className="flex-1 overflow-y-auto p-2 space-y-3" ref={chatBoxRef}>
                  <AnimatePresence>
                    {messages?.map((msg, index) => (
                      <motion.div
                        key={msg._id?.toString() ?? index}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${String(msg.senderId) === String(userData?._id) ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`px-4 py-2 max-w-[75%] rounded-2xl shadow
        ${
          String(msg.senderId) === String(userData?._id)
            ? "bg-green-600 text-white rounded-br-none"
            : "bg-gray-100 text-gray-800 rounded-bl-none"
        }`}
                        >
                          <p>{msg.text}</p>
                          <p className="text-[10px] opacity-70 mt-1 text-right">
                            {msg.time}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="flex gap-2 mt-3 border-t pt-3">
                  <input
                    type="text"
                    placeholder="Type a Message..."
                    className="flex-1 bg-gray-100 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMsg();
                    }}
                  />
                  <button
                    className="bg-green-600 hover:bg-green-700 p-3 rounded-xl text-white"
                    onClick={sendMsg}
                  >
                    <Send size={24} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;
