"use client";
import { getSocket } from "@/lib/socket";
import { IMessage } from "@/models/message.model";
import axios from "axios";
import { Send } from "lucide-react";
import mongoose from "mongoose";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
type props = {
  orderId: mongoose.Types.ObjectId;
  deliveryBoyId: string | mongoose.Types.ObjectId;
};
function DeliveryChat({ orderId, deliveryBoyId }: props) {
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const chatBoxRef=useRef<HTMLDivElement>(null)
  useEffect(() => {
    const socket = getSocket();
    const joinRoom = () => socket.emit("join-room", orderId);
    joinRoom();
    socket.on("connect", joinRoom); // rejoin after a reconnect
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
      senderId: deliveryBoyId,
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
    <div className="bg-white rounded-3xl shadow-lg border p-4 h-107.5 flex flex-col">
      <div className="flex-1 overflow-y-auto p-2 space-y-3" ref={chatBoxRef}>
        <AnimatePresence>
          {messages?.map((msg, index) => (
            <motion.div
              key={index?.toString()}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${String(msg.senderId) === String(deliveryBoyId) ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-4 py-2 max-w-[75%] rounded-2xl shadow
    ${
      String(msg.senderId) === String(deliveryBoyId)
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
  );
}
export default DeliveryChat;
