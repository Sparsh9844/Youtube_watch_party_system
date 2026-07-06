import express from "express";
import { createRoom, getRoomByCode } from "../controllers/room.controller.js";

const router = express.Router();

router.post("/create", createRoom);
router.get("/:roomCode", getRoomByCode);

export default router;