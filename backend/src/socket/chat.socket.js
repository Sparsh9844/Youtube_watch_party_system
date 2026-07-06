import Message from "../models/Message.js";
import Room from "../models/Room.js";

const registerChatEvents = (io, socket) => {
  // ─── send_message ─────────────────────────────────────────────
  // Payload : { roomCode, message }
  // Emits   : new_message → all members of the room
  socket.on("send_message", async (payload, callback) => {
    try {
      const { roomCode, message } = payload;

      if (!roomCode || !message || !message.trim()) {
        return callback?.({ success: false, message: "roomCode and message are required" });
      }

      if (message.trim().length > 500) {
        return callback?.({ success: false, message: "Message too long (max 500 chars)" });
      }

      // Find the room and verify sender is a participant
      const room = await Room.findOne({ roomCode });
      if (!room) return callback?.({ success: false, message: "Room not found" });

      const sender = room.participants.find((p) => p.socketId === socket.id);
      if (!sender) return callback?.({ success: false, message: "You are not in this room" });

      // Persist to DB
      const saved = await Message.create({
        roomId: room._id,
        username: sender.username,
        senderSocketId: socket.id,
        message: message.trim(),
      });

      const outgoing = {
        id:        saved._id.toString(),
        username:  sender.username,
        userId:    socket.id,
        role:      sender.role,
        message:   saved.message,
        createdAt: saved.createdAt,
      };

      // Broadcast to everyone in the room (including the sender)
      io.to(roomCode).emit("new_message", outgoing);

      callback?.({ success: true });
    } catch (err) {
      console.error("[chat] send_message error:", err.message);
      callback?.({ success: false, message: "Failed to send message" });
    }
  });

  // ─── get_messages ─────────────────────────────────────────────
  // Payload : { roomCode }
  // Returns last 50 messages so a joining user can see recent history
  socket.on("get_messages", async ({ roomCode }, callback) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return callback?.({ success: false, message: "Room not found" });

      const messages = await Message.find({ roomId: room._id })
        .sort({ createdAt: 1 })
        .limit(50)
        .lean();

      // Enrich with role from current participants (best-effort — role may have changed)
      const participantMap = Object.fromEntries(
        room.participants.map((p) => [p.socketId, p.role])
      );

      const enriched = messages.map((m) => ({
        id:        m._id.toString(),
        username:  m.username,
        userId:    m.senderSocketId,
        role:      participantMap[m.senderSocketId] || "participant",
        message:   m.message,
        createdAt: m.createdAt,
      }));

      callback?.({ success: true, data: enriched });
    } catch (err) {
      console.error("[chat] get_messages error:", err.message);
      callback?.({ success: false, message: "Failed to fetch messages" });
    }
  });
};

export default registerChatEvents;
