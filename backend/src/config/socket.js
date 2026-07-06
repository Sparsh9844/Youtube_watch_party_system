import { Server } from "socket.io";

let io;

const initializeSocket = (httpServer) => {
  // CLIENT_URL can be a comma-separated list for multiple origins
  // e.g. "https://your-app.vercel.app,http://localhost:5173"
  const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    // Allow both WebSocket and polling so Railway/Render work out of the box
    transports: ["websocket", "polling"],
  });

  console.log("✅ Socket.IO Initialized");
  console.log("🌐 Allowed origins:", allowedOrigins);
  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO has not been initialized.");
  return io;
};

export default initializeSocket;
