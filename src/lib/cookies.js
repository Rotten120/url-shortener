import { generateToken } from "./auth.js"

//maxAge default value is 1 week
export const setCookie = async (res, label, payload, age = 1000*60*60*24*7) => {
  const token = payload? await generateToken(payload) : "";

  res.cookie(label, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: age
  });

  return token;
}

