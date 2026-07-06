import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRY  = "7d";
const COOKIE_MAX_AGE_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

export const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

/**
 * Attach the JWT as an HTTP-only cookie on the response.
 */
export const setTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,           // JS cannot read this cookie
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
  });
};

export const clearTokenCookie = (res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
};
