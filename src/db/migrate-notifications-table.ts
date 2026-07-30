import { db } from "./client";
import { sql } from "drizzle-orm";

export async function migrateNotificationsTable() {
  console.log("Running migration for user_notifications table...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'permission_update',
      status TEXT NOT NULL DEFAULT 'warning',
      details_json TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_user_notif_person_id ON user_notifications(person_id);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_user_notif_is_read ON user_notifications(is_read);
  `);

  console.log("Migration completed: user_notifications table is ready.");
}

if (process.argv[1]?.includes("migrate-notifications-table")) {
  migrateNotificationsTable()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
