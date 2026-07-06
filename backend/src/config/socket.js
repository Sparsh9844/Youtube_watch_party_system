import { Server } from "socket.io";

let io;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  console.log("✅ Socket.IO Initialized");
  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO has not been initialized.");
  return io;
};

export default initializeSocket;
