import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyPassword } from "../lib/password";
import { setSessionPersonId, clearSessionCookie } from "./session";
import { findCredentialByEmail, findPersonById } from "./repo";

const signInSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const signInFn = createServerFn({ method: "POST" })
  .validator(signInSchema)
  .handler(async ({ data }) => {
    const normalized = data.email.trim().toLowerCase();
    const credential = await findCredentialByEmail(normalized);
    if (!credential || !verifyPassword(data.password, credential.passwordHash)) {
      return {
        ok: false as const,
        error: "That email and password do not match a VNC Hub account.",
      };
    }

    const person = await findPersonById(credential.personId);
    if (!person) {
      return { ok: false as const, error: "We couldn't find a profile for that account." };
    }
    if (person.status === "inactive") {
      return {
        ok: false as const,
        error: "This account has been deactivated. Contact your admin.",
      };
    }

    await setSessionPersonId(person.id);
    return { ok: true as const };
  });

export const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
  await clearSessionCookie();
  return { ok: true as const };
});
