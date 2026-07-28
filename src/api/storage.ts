import "@tanstack/react-start/server-only";
// Server-only. Stores uploaded document files on local disk under
// <project root>/uploads/. Not committed to git (see .gitignore) and not
// tracked in Postgres — only the metadata (filename, size, category, etc.)
// lives in the `documents` table; this module just reads/writes the bytes.

import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomBytes } from "node:crypto";

const UPLOADS_DIR = join(process.cwd(), "uploads");

async function ensureUploadsDir() {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

/** Writes a file to disk under a generated unique name and returns that name. */
export async function saveUploadedFile(buffer: Buffer, originalName: string): Promise<string> {
  await ensureUploadsDir();
  const ext = extname(originalName) || "";
  const storedFileName = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}${ext}`;
  await writeFile(join(UPLOADS_DIR, storedFileName), buffer);
  return storedFileName;
}

export async function readStoredFile(storedFileName: string): Promise<Buffer> {
  return readFile(join(UPLOADS_DIR, storedFileName));
}

export async function deleteStoredFile(storedFileName: string): Promise<void> {
  try {
    await unlink(join(UPLOADS_DIR, storedFileName));
  } catch {
    // Already gone — fine, the DB row is what we actually care about deleting.
  }
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
