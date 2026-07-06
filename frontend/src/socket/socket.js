import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL, {
  autoConnect: false,
  // Use WebSocket first, fall back to polling — required for Railway/Render
  transports: ["websocket", "polling"],
});

export default socket;
