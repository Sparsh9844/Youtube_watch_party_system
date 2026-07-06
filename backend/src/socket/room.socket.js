import { createRoomService, joinRoomService, leaveRoomService } from "../services/room.service.js";
import {
  assignRoleService,
  removeParticipantService,
  transferHostService,
} from "../services/permission.service.js";
import Room from "../models/Room.js";

const registerRoomEvents = (io, socket) => {
  // ─── Create Room ──────────────────────────────────────────────
  socket.on("create_room", async (payload, callback) => {
    try {
      const { username } = payload;
      if (!username || !username.trim()) {
        return callback({ success: false, message: "Username is required" });
      }

      const room = await createRoomService({
        username: username.trim(),
        socketId: socket.id,
      });

      socket.join(room.roomCode);
      console.log(`🏠 ${username} created room ${room.roomCode}`);
      callback({ success: true, message: "Room created successfully", data: room });
    } catch (error) {
      console.error(error);
      callback({ success: false, message: error.message || "Failed to create room" });
    }
  });

  // ─── Join Room ────────────────────────────────────────────────
  socket.on("join_room", async (payload, callback) => {
    try {
      const { roomCode, username } = payload;
      if (!roomCode || !username) {
        return callback({ success: false, message: "Room code and username are required" });
      }

      const room = await joinRoomService({
        roomCode: roomCode.trim().toUpperCase(),
        username: username.trim(),
        socketId: socket.id,
      });

      socket.join(room.roomCode);
      console.log(`👤 ${username} joined room ${room.roomCode}`);

      const joined = room.participants.find((p) => p.socketId === socket.id);

      io.to(room.roomCode).emit("user_joined", {
        username: joined.username,
        userId: joined.socketId,
        role: joined.role,
        participants: room.participants,
      });

      callback({ success: true, message: "Joined room successfully", data: room });
    } catch (error) {
      console.error(error);
      callback({ success: false, message: error.message || "Failed to join room" });
    }
  });

  // ─── Leave Room ───────────────────────────────────────────────
  const handleLeave = async (roomCode) => {
    try {
      const roomDoc = await Room.findOne({ roomCode });
      const leaving = roomDoc?.participants.find((p) => p.socketId === socket.id);

      const result = await leaveRoomService({ roomCode, socketId: socket.id });
      if (!result) return;

      socket.leave(roomCode);
      console.log(`🚪 ${socket.id} left room ${roomCode}`);

      if (result.dissolved) {
        console.log(`🗑️  Room ${roomCode} dissolved (empty)`);
        return;
      }

      io.to(roomCode).emit("user_left", {
        username: leaving?.username || "Unknown",
        userId: socket.id,
        participants: result.room.participants,
      });

      if (result.newHostId) {
        io.to(roomCode).emit("host_transferred", {
          success: true,
          message: "Host left — role transferred automatically",
          data: { participants: result.room.participants, newHostId: result.newHostId },
        });
      }
    } catch (err) {
      console.error("Error handling leave:", err.message);
    }
  };

  socket.on("leave_room", async ({ roomCode }, callback) => {
    await handleLeave(roomCode);
    if (typeof callback === "function") callback({ success: true });
  });

  socket.on("disconnecting", async () => {
    for (const roomCode of socket.rooms) {
      if (roomCode === socket.id) continue;
      await handleLeave(roomCode);
    }
  });

  // ─── Assign Role ──────────────────────────────────────────────
  socket.on("assign_role", async (payload, callback) => {
    try {
      const { roomCode, targetSocketId, newRole } = payload;
      if (!roomCode || !targetSocketId || !newRole) {
        return callback({ success: false, message: "roomCode, targetSocketId and newRole are required" });
      }

      const room = await assignRoleService({ roomCode, requesterId: socket.id, targetSocketId, newRole });
      const target = room.participants.find((p) => p.socketId === targetSocketId);

      io.to(roomCode).emit("role_assigned", {
        userId: targetSocketId,
        username: target?.username || "",
        role: newRole,
        participants: room.participants,
      });

      callback({ success: true, message: "Role assigned successfully" });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  // ─── Remove Participant ───────────────────────────────────────
  socket.on("remove_participant", async (payload, callback) => {
    try {
      const { roomCode, targetSocketId } = payload;
      if (!roomCode || !targetSocketId) {
        return callback({ success: false, message: "roomCode and targetSocketId are required" });
      }

      const room = await removeParticipantService({ roomCode, requesterId: socket.id, targetSocketId });

      io.to(targetSocketId).emit("kicked", { message: "You have been removed from the room" });

      const kickedSocket = io.sockets.sockets.get(targetSocketId);
      if (kickedSocket) kickedSocket.leave(roomCode);

      io.to(roomCode).emit("participant_removed", {
        userId: targetSocketId,
        participants: room.participants,
      });

      callback({ success: true, message: "Participant removed successfully" });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  // ─── Transfer Host ────────────────────────────────────────────
  socket.on("transfer_host", async (payload, callback) => {
    try {
      const { roomCode, targetSocketId } = payload;
      if (!roomCode || !targetSocketId) {
        return callback({ success: false, message: "roomCode and targetSocketId are required" });
      }

      const room = await transferHostService({ roomCode, requesterId: socket.id, targetSocketId });

      io.to(roomCode).emit("role_assigned", {
        userId: targetSocketId,
        username: room.participants.find((p) => p.socketId === targetSocketId)?.username || "",
        role: "host",
        participants: room.participants,
      });

      io.to(roomCode).emit("host_transferred", {
        success: true,
        message: "Host role transferred",
        data: { participants: room.participants, newHostId: targetSocketId },
      });

      callback({ success: true, message: "Host transferred successfully" });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });
};

export default registerRoomEvents;
