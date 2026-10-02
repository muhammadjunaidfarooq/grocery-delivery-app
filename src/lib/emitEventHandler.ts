import axios from "axios";
import { SOCKET_SECRET_HEADER } from "@/lib/socketAuth";

// URL of the Socket.IO server, as seen from this server
const SOCKET_SERVER_URL =
  process.env.SOCKET_SERVER_URL || process.env.NEXT_PUBLIC_SOCKET_SERVER;

/**
 * Asks the socket server to push an event to browsers.
 * - socketId given -> only that browser (for example one rider)
 * - no socketId    -> every connected browser
 * Realtime is "best effort": a failure is logged, never thrown, so the
 * database change that triggered it still succeeds.
 */
const emitEventHandler = async (
  event: string,
  data: unknown,
  socketId?: string,
) => {
  if (!SOCKET_SERVER_URL) return;
  try {
    await axios.post(
      `${SOCKET_SERVER_URL.replace(/\/+$/, "")}/notify`,
      { socketId, event, data },
      {
        timeout: 5000,
        headers: { [SOCKET_SECRET_HEADER]: process.env.SOCKET_SERVER_SECRET ?? "" },
      },
    );
  } catch (error) {
    console.error(
      `emit "${event}" failed:`,
      axios.isAxiosError(error) ? error.message : error,
    );
  }
};

export default emitEventHandler;
