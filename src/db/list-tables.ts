import postgres from "postgres";
import { config as loadEnv } from "dotenv";

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString);

async function listTables() {
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `;
  console.log("TABLES:", tables.map(t => t.table_name));
  await sql.end();
}

listTables();
