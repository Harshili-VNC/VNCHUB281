// Server-only. Uses TanStack Start's built-in encrypted, signed, httpOnly
// session cookie (no separate "sessions" table needed — the cookie itself
// carries the (encrypted) session data).

import "dotenv/config";
import { getSession, updateSession, clearSession } from "@tanstack/react-start/server";
import type { SessionConfig } from "@tanstack/react-start/server";

export type SessionData = {
  personId?: string;
};

function sessionConfig(): SessionConfig {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET is not set (or is shorter than 32 characters). Copy .env.example to .env and set a long random value.",
    );
  }
  return {
    password,
    name: "vnc_hub_session",
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  };
}

export async function getSessionPersonId(): Promise<string | undefined> {
  const session = await getSession<SessionData>(sessionConfig());
  return session.data.personId;
}

export async function setSessionPersonId(personId: string): Promise<void> {
  await updateSession<SessionData>(sessionConfig(), { personId });
}

export async function clearSessionCookie(): Promise<void> {
  await clearSession(sessionConfig());
}
