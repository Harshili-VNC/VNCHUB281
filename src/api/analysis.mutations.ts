import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/client";
import { analysisReports, clients } from "../db/schema";
import { getSessionPersonId } from "./session";
import { findPersonById, loadDocuments } from "./repo";
import { generateId, toClient } from "./mappers";
import { buildRuleBasedReport, documentsForClient } from "../lib/documents";

async function requireCurrentUser() {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await findPersonById(personId);
  return person && person.status === "active" ? person : null;
}

const generateSchema = z.object({ clientId: z.string().min(1) });

export const generateAnalysisReportFn = createServerFn({ method: "POST" })
  .validator(generateSchema)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser();
    if (!user) return { ok: false as const, error: "You must be signed in." };

    const [clientRow] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, data.clientId))
      .limit(1);
    if (!clientRow) return { ok: false as const, error: "Client not found." };
    const client = toClient(clientRow);

    const allDocuments = await loadDocuments();
    const clientDocs = documentsForClient(allDocuments, client.id);
    const content = buildRuleBasedReport(client.name, clientDocs);

    const id = generateId("report");
    await db.insert(analysisReports).values({
      id,
      clientId: client.id,
      content,
      generatedBy: user.id,
    });

    return {
      ok: true as const,
      report: {
        id,
        clientId: client.id,
        content,
        createdAt: new Date().toISOString().slice(0, 10),
      },
    };
  });

const listReportsSchema = z.object({ clientId: z.string().min(1) });

export const listAnalysisReportsFn = createServerFn({ method: "GET" })
  .validator(listReportsSchema)
  .handler(async ({ data }) => {
    const rows = await db
      .select()
      .from(analysisReports)
      .where(eq(analysisReports.clientId, data.clientId))
      .orderBy(desc(analysisReports.createdAt));

    return rows.map((row: typeof analysisReports.$inferSelect) => ({
      id: row.id,
      clientId: row.clientId,
      content: row.content,
      createdAt: row.createdAt.toISOString().slice(0, 10),
    }));
  });
