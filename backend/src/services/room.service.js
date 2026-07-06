import Room from "../models/Room.js";
import generateRoomCode from "../utils/generateRoomCode.js";

export const createRoomService = async ({ username, socketId }) => {
  let roomCode;
  let existingRoom;

  do {
    roomCode = generateRoomCode();
    existingRoom = await Room.findOne({ roomCode });
  } while (existingRoom);

  const room = await Room.create({
    roomCode,
    hostId: socketId,
    participants: [
      {
        socketId,
        username,
        role: "host",
      },
    ],
  });

  return room;
};

export const joinRoomService = async ({ roomCode, username, socketId }) => {
  const room = await Room.findOne({ roomCode });

  if (!room) {
    throw new Error("Room not found");
  }

  const alreadyJoined = room.participants.find(
    (participant) => participant.socketId === socketId,
  );

  if (!alreadyJoined) {
    room.participants.push({
      socketId,
      username,
      role: "participant",
    });

    await room.save();
  }

  return room;
};

export const leaveRoomService = async ({ roomCode, socketId }) => {
  const room = await Room.findOne({ roomCode });
  if (!room) return null; // room may already be gone

  const leavingIndex = room.participants.findIndex((p) => p.socketId === socketId);
  if (leavingIndex === -1) return null; // already removed

  const leaving = room.participants[leavingIndex];
  const wasHost = leaving.role === "host";

  // Remove the participant
  room.participants.splice(leavingIndex, 1);

  // If no one is left, delete the room entirely
  if (room.participants.length === 0) {
    await Room.deleteOne({ roomCode });
    return { room: null, newHostId: null, dissolved: true };
  }

  // If the host left, auto-transfer to the next participant
  if (wasHost) {
    // Prefer an existing moderator, otherwise take the first participant
    const nextHost =
      room.participants.find((p) => p.role === "moderator") ||
      room.participants[0];

    nextHost.role = "host";
    room.hostId = nextHost.socketId;
  }

  await room.save();
  return { room, newHostId: wasHost ? room.hostId : null, dissolved: false };
};
