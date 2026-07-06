import {
  updateVideoService,
  updatePlaybackService,
} from "../services/vedio.service.js";
import extractVideoId from "../utils/extractVedioId.js";
import Room from "../models/Room.js";
import { CONTROLLER_ROLES } from "../services/permission.service.js";

// ─── Helper: check if socket is a host/moderator ──────────────
const checkController = async (roomCode, socketId) => {
  const room = await Room.findOne({ roomCode });
  if (!room) return { allowed: false, room: null };
  const participant = room.participants.find((p) => p.socketId === socketId);
  const allowed = participant && CONTROLLER_ROLES.includes(participant.role);
  return { allowed, room };
};

// ─── Helper: broadcast sync_state to the whole room ──────────
// Used after every state-changing event so all clients stay in sync.
const broadcastSyncState = (io, roomCode, video) => {
  io.to(roomCode).emit("sync_state", {
    playState: video.isPlaying ? "playing" : "paused",
    currentTime: video.currentTime,
    videoId: video.videoId,
  });
};

const registerVideoEvents = (io, socket) => {
  // ─── change_video ─────────────────────────────────────────────
  // Payload : { roomCode, videoUrl }
  // Requires: host or moderator
  // Emits   : video_changed (to others) + sync_state (to all)
  socket.on("change_video", async (payload, callback) => {
    try {
      const { roomCode, videoUrl } = payload;

      if (!roomCode || !videoUrl) {
        return callback({ success: false, message: "roomCode and videoUrl are required" });
      }

      const { allowed } = await checkController(roomCode, socket.id);
      if (!allowed) {
        return callback({ success: false, message: "Only the host or moderator can change the video" });
      }

      const videoId = extractVideoId(videoUrl);
      if (!videoId) {
        return callback({ success: false, message: "Invalid YouTube URL or video ID" });
      }

      const room = await updateVideoService({ roomCode, videoId });

      // Tell everyone else to load the new video
      socket.to(roomCode).emit("video_changed", {
        success: true,
        data: room.video,
      });

      // Broadcast full sync_state to all (including sender)
      broadcastSyncState(io, roomCode, room.video);

      callback({ success: true, message: "Video loaded successfully", data: room.video });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  // ─── play ─────────────────────────────────────────────────────
  // Payload : { roomCode, currentTime, sentAt }
  // Requires: host or moderator
  // Emits   : video_played (to others, excludes sender) + sync_state (to all)
  socket.on("play", async (payload, callback) => {
    try {
      const { roomCode, currentTime, sentAt } = payload;

      const { allowed } = await checkController(roomCode, socket.id);
      if (!allowed) {
        return callback({ success: false, message: "Only the host or moderator can control playback" });
      }

      const room = await updatePlaybackService({ roomCode, currentTime, isPlaying: true });

      socket.to(roomCode).emit("video_played", {
        success: true,
        sentAt: sentAt ?? Date.now(),
        data: room.video,
      });

      broadcastSyncState(io, roomCode, room.video);

      callback({ success: true });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  // ─── pause ────────────────────────────────────────────────────
  // Payload : { roomCode, currentTime }
  // Requires: host or moderator
  // Emits   : video_paused (to others) + sync_state (to all)
  socket.on("pause", async (payload, callback) => {
    try {
      const { roomCode, currentTime } = payload;

      const { allowed } = await checkController(roomCode, socket.id);
      if (!allowed) {
        return callback({ success: false, message: "Only the host or moderator can control playback" });
      }

      const room = await updatePlaybackService({ roomCode, currentTime, isPlaying: false });

      socket.to(roomCode).emit("video_paused", {
        success: true,
        data: room.video,
      });

      broadcastSyncState(io, roomCode, room.video);

      callback({ success: true });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  // ─── seek ─────────────────────────────────────────────────────
  // Payload : { roomCode, time }
  // Requires: host or moderator
  // Emits   : video_seeked (to others) + sync_state (to all)
  socket.on("seek", async (payload, callback) => {
    try {
      const { roomCode, time } = payload;

      const { allowed, room: existingRoom } = await checkController(roomCode, socket.id);
      if (!allowed) {
        return callback({ success: false, message: "Only the host or moderator can seek" });
      }

      // Preserve current isPlaying state when seeking
      const currentIsPlaying = existingRoom?.video?.isPlaying ?? false;

      const room = await updatePlaybackService({
        roomCode,
        currentTime: time,
        isPlaying: currentIsPlaying,
      });

      socket.to(roomCode).emit("video_seeked", {
        success: true,
        data: room.video,
      });

      broadcastSyncState(io, roomCode, room.video);

      callback({ success: true });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  // ─── get_sync_state ───────────────────────────────────────────
  // Payload : { roomCode }
  // Any client can call this (e.g. on joining) to get current video state.
  // Server responds with sync_state directly to the requester.
  socket.on("get_sync_state", async ({ roomCode }, callback) => {
    try {
      const room = await Room.findOne({ roomCode });
      if (!room) return callback?.({ success: false, message: "Room not found" });

      socket.emit("sync_state", {
        playState: room.video.isPlaying ? "playing" : "paused",
        currentTime: room.video.currentTime,
        videoId: room.video.videoId,
      });

      callback?.({ success: true });
    } catch (error) {
      callback?.({ success: false, message: error.message });
    }
  });

  // ─── sync_time heartbeat relay ────────────────────────────────
  // Controller sends current time periodically; server relays to others.
  socket.on("sync_time", ({ roomCode, currentTime, sentAt }) => {
    socket.to(roomCode).emit("sync_time", { currentTime, sentAt });
  });
};

export default registerVideoEvents;
