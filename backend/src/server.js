import dotenv from "dotenv";
dotenv.config();

import http from "http";

import app from "./app.js";
import connectDB from "./config/db.js";
import initializeSocket from "./config/socket.js";
import registerSocketEvents from "./socket/index.js";

// Connect Database
await connectDB();

// Create HTTP Server
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Register Socket Events
registerSocketEvents(io);

// Start Server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log("====================================");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log("====================================");
});