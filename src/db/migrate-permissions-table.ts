import postgres from "postgres";
import { config as loadEnv } from "dotenv";

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString);

async function runPermissionsMigration() {
  console.log("Migrating Enterprise Permission tables...");
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS permissions (
        id text PRIMARY KEY,
        category text NOT NULL,
        name text NOT NULL,
        description text,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS designation_permissions (
        id text PRIMARY KEY,
        designation_id text NOT NULL REFERENCES designations(id) ON DELETE CASCADE,
        permission_id text NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        is_enabled boolean DEFAULT false NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_desig_perm_unique ON designation_permissions(designation_id, permission_id);
      CREATE INDEX IF NOT EXISTS idx_desig_perm_desig_id ON designation_permissions(designation_id);
      CREATE INDEX IF NOT EXISTS idx_desig_perm_perm_id ON designation_permissions(permission_id);

      CREATE TABLE IF NOT EXISTS permission_audit_logs (
        id text PRIMARY KEY,
        changed_by text NOT NULL,
        changed_by_name text NOT NULL,
        designation_id text NOT NULL,
        designation_name text NOT NULL,
        permission_id text NOT NULL,
        permission_name text NOT NULL,
        previous_value boolean NOT NULL,
        new_value boolean NOT NULL,
        ip_address text,
        changed_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    console.log("SUCCESS: Enterprise Permission tables created / verified in PostgreSQL database.");
  } catch (err) {
    console.error("Error during permission tables migration:", err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

runPermissionsMigration();
