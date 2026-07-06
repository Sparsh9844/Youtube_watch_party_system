import registerRoomEvents  from "./room.socket.js";
import registerVideoEvents from "./vedio.socket.js";
import registerChatEvents  from "./chat.socket.js";

const registerSocketEvents = (io) => {
  io.on("connection", (socket) => {
    console.log(`🟢 User Connected: ${socket.id}`);

    registerRoomEvents(io, socket);
    registerVideoEvents(io, socket);
    registerChatEvents(io, socket);

    socket.on("disconnect", () => {
      console.log(`🔴 User Disconnected: ${socket.id}`);
    });
  });
};

export default registerSocketEvents;
