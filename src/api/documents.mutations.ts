import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { documents } from "../db/schema";
import { getSessionPersonId } from "./session";
import { findPersonById, findOrCreateClient, findDocumentRowById } from "./repo";
import { generateId } from "./mappers";
import { saveUploadedFile, readStoredFile, deleteStoredFile, MAX_UPLOAD_BYTES } from "./storage";
import type { DocumentCategory } from "../lib/documents";

const documentCategories = ["Contracts", "MOMs", "Invoices", "Reports"] as const;

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

/** Leadership, Admin, or any Business Unit Head can delete documents; everyone can upload. */
function canDeleteDocuments(person: { departmentFunction: string; isBusinessUnitHead: boolean }) {
  return (
    person.departmentFunction === "Leadership" ||
    person.departmentFunction === "Admin" ||
    person.isBusinessUnitHead
  );
}

export const uploadDocumentFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const file = data.get("file");
    const categoryRaw = data.get("category");
    const clientName = (data.get("clientName") as string | null)?.trim() ?? "";

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false as const, error: "Choose a file to upload." };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { ok: false as const, error: "That file is larger than the 20 MB limit." };
    }
    const category = documentCategories.find((c) => c === categoryRaw);
    if (!category) {
      return { ok: false as const, error: "Choose a valid category." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storedFileName = await saveUploadedFile(buffer, file.name);
    const clientId = clientName ? await findOrCreateClient(clientName) : null;

    await db.insert(documents).values({
      id: generateId("doc"),
      fileName: file.name,
      storedFileName,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      category: category as DocumentCategory,
      clientId,
      uploadedBy: user.id,
    });

    return { ok: true as const };
  });

const downloadDocumentSchema = z.object({ id: z.string().min(1) });

export const downloadDocumentFn = createServerFn({ method: "POST" })
  .validator(downloadDocumentSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const row = await findDocumentRowById(data.id);
    if (!row) return { ok: false as const, error: "Document not found." };

    const buffer = await readStoredFile(row.storedFileName);
    return {
      ok: true as const,
      fileName: row.fileName,
      mimeType: row.mimeType,
      base64: buffer.toString("base64"),
    };
  });

const deleteDocumentSchema = z.object({ id: z.string().min(1) });

export const deleteDocumentFn = createServerFn({ method: "POST" })
  .validator(deleteDocumentSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };
    if (!canDeleteDocuments(user)) {
      return { ok: false as const, error: "Only Leadership, Admin, and Business Unit Heads can delete documents." };
    }

    const row = await findDocumentRowById(data.id);
    if (!row) return { ok: false as const, error: "Document not found." };

    await db.delete(documents).where(eq(documents.id, data.id));
    await deleteStoredFile(row.storedFileName);

    return { ok: true as const };
  });
