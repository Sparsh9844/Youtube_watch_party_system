import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

const generateRoomCode = () => {
  return nanoid();
};

export default generateRoomCode;