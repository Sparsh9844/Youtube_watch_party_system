import Room from "../models/Room.js";

// Roles that can control video playback and change the video
export const CONTROLLER_ROLES = ["host", "moderator"];

/**
 * Check if a socket ID belongs to a host or moderator in a room.
 * Throws if room not found or requester lacks permission.
 */
export const requireController = async (room, requesterId) => {
  const requester = room.participants.find((p) => p.socketId === requesterId);
  if (!requester || !CONTROLLER_ROLES.includes(requester.role)) {
    throw new Error("Only the host or a moderator can perform this action");
  }
  return requester;
};

/**
 * Assign a role to a participant.
 * - Host can assign "moderator" or "participant" to anyone except themselves.
 * - Moderator can only demote a plain participant (no promotions, no touching other moderators).
 */
export const assignRoleService = async ({ roomCode, requesterId, targetSocketId, newRole }) => {
  const room = await Room.findOne({ roomCode });
  if (!room) throw new Error("Room not found");

  const requester = await requireController(room, requesterId);

  if (targetSocketId === requesterId) throw new Error("You cannot change your own role");

  const target = room.participants.find((p) => p.socketId === targetSocketId);
  if (!target) throw new Error("Participant not found");

  if (target.role === "host") throw new Error("Cannot change the host's role");
  if (newRole === "host") throw new Error("Use transfer host to assign the host role");

  // Moderators can only demote participants — they cannot promote to moderator
  if (requester.role === "moderator") {
    if (target.role !== "participant") {
      throw new Error("Moderators can only demote plain participants");
    }
    if (newRole !== "participant") {
      throw new Error("Moderators cannot promote participants to moderator");
    }
  }

  target.role = newRole;
  await room.save();

  return room;
};

/**
 * Remove a participant from the room.
 * - Host can remove anyone except themselves.
 * - Moderator can only remove plain participants (not other moderators or the host).
 */
export const removeParticipantService = async ({ roomCode, requesterId, targetSocketId }) => {
  const room = await Room.findOne({ roomCode });
  if (!room) throw new Error("Room not found");

  const requester = await requireController(room, requesterId);

  if (targetSocketId === requesterId) throw new Error("You cannot remove yourself");

  const target = room.participants.find((p) => p.socketId === targetSocketId);
  if (!target) throw new Error("Participant not found");

  if (target.role === "host") throw new Error("Cannot remove the host");

  // Moderators cannot remove other moderators
  if (requester.role === "moderator" && target.role === "moderator") {
    throw new Error("Moderators cannot remove other moderators");
  }

  const targetIndex = room.participants.findIndex((p) => p.socketId === targetSocketId);
  room.participants.splice(targetIndex, 1);
  await room.save();

  return room;
};

/**
 * Transfer the host role to another participant.
 * Only the host can do this.
 */
export const transferHostService = async ({ roomCode, requesterId, targetSocketId }) => {
  const room = await Room.findOne({ roomCode });
  if (!room) throw new Error("Room not found");

  if (room.hostId !== requesterId) throw new Error("Only the host can transfer the host role");
  if (targetSocketId === requesterId) throw new Error("You are already the host");

  const currentHost = room.participants.find((p) => p.socketId === requesterId);
  const newHost = room.participants.find((p) => p.socketId === targetSocketId);

  if (!newHost) throw new Error("Target participant not found");

  currentHost.role = "participant";
  newHost.role = "host";
  room.hostId = targetSocketId;

  await room.save();

  return room;
};
