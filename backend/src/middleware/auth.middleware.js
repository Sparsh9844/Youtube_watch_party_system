import { verifyToken } from "../utils/jwt.js";

/**
 * Protects HTTP routes — reads the JWT from the cookie,
 * verifies it, and attaches req.user = { userId, username, email }.
 */
export const protect = (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const decoded = verifyToken(token);
    req.user = {
      userId:   decoded.userId,
      username: decoded.username,
      email:    decoded.email,
    };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
