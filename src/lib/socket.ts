import { io, Socket } from "socket.io-client";

// One shared Socket.IO connection for the whole browser tab
let socket: Socket | null = null;

// Public URL of the Socket.IO server (Render in production, https://...).
// NEXT_PUBLIC_ values are inlined at build time, so set it before building.
// The localhost fallback is for local development only.
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_SERVER ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000");

export const getSocket = () => {
  if (!socket) {
    if (!SOCKET_URL) {
      console.error(
        "NEXT_PUBLIC_SOCKET_SERVER is not set: realtime updates are disabled.",
      );
    }
    // With an https:// URL Socket.IO uses a secure WebSocket (wss://)
    socket = io(SOCKET_URL || undefined, {
      autoConnect: Boolean(SOCKET_URL),
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
};
