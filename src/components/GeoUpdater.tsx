"use client";
import { getSocket } from "@/lib/socket";
import { useEffect } from "react";

/**
 * Tells the socket server which user this browser belongs to, so the app can
 * send events to this user (for example a new delivery job to a rider).
 * It is sent again after every reconnect, because the socket id changes.
 * (Riders share their live location from the rider dashboard.)
 */
const GeoUpdater = ({ userId }: { userId: string }) => {
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    const sendIdentity = () => socket.emit("identity", userId);
    if (socket.connected) sendIdentity();
    socket.on("connect", sendIdentity);
    return () => {
      socket.off("connect", sendIdentity);
    };
  }, [userId]);
  return null;
};

export default GeoUpdater;
