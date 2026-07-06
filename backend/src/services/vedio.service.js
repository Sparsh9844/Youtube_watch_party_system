import Room from "../models/Room.js";

export const updateVideoService = async ({ roomCode, videoId }) => {
  const room = await Room.findOne({ roomCode });

  if (!room) {
    throw new Error("Room not found");
  }

  room.video.videoId = videoId;
  room.video.currentTime = 0;
  room.video.isPlaying = false;
  room.video.lastUpdatedAt = new Date();

  await room.save();

  return room;
};

export const updatePlaybackService = async ({
  roomCode,
  currentTime,
  isPlaying,
}) => {
  const room = await Room.findOne({ roomCode });

  if (!room) {
    throw new Error("Room not found");
  }

  room.video.currentTime = currentTime;
  room.video.isPlaying = isPlaying;
  room.video.lastUpdatedAt = new Date();

  await room.save();

  return room;
};