import { config as loadEnv } from "dotenv";
loadEnv();
import { db, queryClient } from "./client";
import { permissions, designationPermissions, designations } from "./schema";
import { ALL_PERMISSIONS, getDefaultPermissionsForDesignation } from "../lib/permissions";
import { generateId } from "../api/mappers";

export async function seedPermissionsData() {
  console.log("Seeding Enterprise Permissions...");

  // 1. Seed master permissions list
  const permissionsToInsert = ALL_PERMISSIONS.map((p) => ({
    id: p.id,
    category: p.category,
    name: p.name,
    description: p.description,
  }));

  console.log(`Seeding ${permissionsToInsert.length} granular permissions...`);
  await db
    .insert(permissions)
    .values(permissionsToInsert)
    .onConflictDoNothing({ target: permissions.id });

  // 2. Fetch designations from database
  const desigList = await db.select().from(designations);
  console.log(`Found ${desigList.length} designations to seed permissions for.`);

  let totalMapped = 0;
  for (const desig of desigList) {
    const defaults = getDefaultPermissionsForDesignation(desig.name || desig.id);
    const rows = ALL_PERMISSIONS.map((p) => ({
      id: `dp-${desig.id}-${p.id}`,
      designationId: desig.id,
      permissionId: p.id,
      isEnabled: defaults[p.id] ?? false,
    }));

    await db
      .insert(designationPermissions)
      .values(rows)
      .onConflictDoNothing();
    totalMapped += rows.length;
  }

  console.log(`Done: Enterprise Permissions seeded successfully (${totalMapped} designation-permission mappings).`);
}

// Standalone execution entry point
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed-permissions.ts")) {
  seedPermissionsData()
    .catch((error) => {
      console.error("Permission seed failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await queryClient.end();
    });
}
