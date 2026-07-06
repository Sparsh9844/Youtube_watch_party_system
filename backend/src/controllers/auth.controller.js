import User from "../models/User.js";
import { signToken, setTokenCookie, clearTokenCookie } from "../utils/jwt.js";

/* ── helpers ───────────────────────────────────────────────── */
const safeUser = (user) => ({
  userId:   user._id.toString(),
  username: user.username,
  email:    user.email,
  createdAt: user.createdAt,
});

/* ── Register ───────────────────────────────────────────────── */
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "username, email and password are required" });
    }

    // Check duplicates with friendly messages
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }

    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) {
      return res.status(409).json({ success: false, message: "Username is already taken" });
    }

    const user = await User.create({ username: username.trim(), email: email.toLowerCase().trim(), password });

    const token = signToken({ userId: user._id, username: user.username, email: user.email });
    setTokenCookie(res, token);

    return res.status(201).json({ success: true, message: "Account created", data: safeUser(user) });
  } catch (err) {
    // Mongoose validation errors
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors)[0]?.message || "Validation error";
      return res.status(400).json({ success: false, message: msg });
    }
    console.error("[auth] register error:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

/* ── Login ──────────────────────────────────────────────────── */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }

    // Explicitly select password (it's excluded by default)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = signToken({ userId: user._id, username: user.username, email: user.email });
    setTokenCookie(res, token);

    return res.status(200).json({ success: true, message: "Logged in", data: safeUser(user) });
  } catch (err) {
    console.error("[auth] login error:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

/* ── Logout ─────────────────────────────────────────────────── */
export const logout = (req, res) => {
  clearTokenCookie(res);
  return res.status(200).json({ success: true, message: "Logged out" });
};

/* ── Me (verify session) ────────────────────────────────────── */
export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, data: safeUser(user) });
  } catch (err) {
    console.error("[auth] me error:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};
