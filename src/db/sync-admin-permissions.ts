import { config as loadEnv } from "dotenv";
loadEnv();
import { db } from "./client";
import { designationPermissions, designations } from "./schema";
import { ALL_PERMISSIONS, getDefaultPermissionsForDesignation } from "../lib/permissions";

export async function syncAdminPermissions() {
  console.log("Syncing Admin permissions in database...");
  const desigs = await db.select().from(designations);
  
  for (const d of desigs) {
    const desigName = d.name.toLowerCase();
    const isDesigAdmin = desigName.includes("admin") || desigName.includes("it admin");
    const defaults = getDefaultPermissionsForDesignation(d.name);
    
    for (const p of ALL_PERMISSIONS) {
      const defaultVal = defaults[p.id] ?? false;
      const rowId = `dp-${d.id}-${p.id}`;

      const existing = await db
        .select()
        .from(designationPermissions)
        .where(
          eq(designationPermissions.designationId, d.id)
        );
      
      // Upsert default state if missing or if Admin has client permissions enabled
      if (isDesigAdmin && p.id.startsWith("client.")) {
        const clientRow = existing.find((r) => r.permissionId === p.id);
        if (clientRow) {
          await db
            .update(designationPermissions)
            .set({ isEnabled: false, updatedAt: new Date() })
            .where(eq(designationPermissions.id, clientRow.id));
        } else {
          await db.insert(designationPermissions).values({
            id: rowId,
            designationId: d.id,
            permissionId: p.id,
            isEnabled: false,
          });
        }
      }
    }
  }
  console.log("Admin permissions sync completed.");
}

import { eq } from "drizzle-orm";

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("sync-admin-permissions.ts")) {
  syncAdminPermissions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Admin sync failed:", err);
      process.exit(1);
    });
}
