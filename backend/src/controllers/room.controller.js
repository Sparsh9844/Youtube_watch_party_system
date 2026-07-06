import {
  createRoomService,
  getRoomByCodeService,
} from "../services/room.service.js";

export const createRoom = async (req, res, next) => {
  try {
    const { username, socketId } = req.body;

    if (!username || !socketId) {
      res.status(400);
      throw new Error("Username and socketId are required");
    }

    const room = await createRoomService({ username, socketId });

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

export const getRoomByCode = async (req, res, next) => {
  try {
    const { roomCode } = req.params;

    const room = await getRoomByCodeService(roomCode);

    res.status(200).json({
      success: true,
      message: "Room fetched successfully",
      data: room,
    });
  } catch (error) {
    next(error);
  }
};