import postgres from "postgres";
import { config as loadEnv } from "dotenv";

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(connectionString);

async function inspectPeopleSchema() {
  const columns = await sql`
    SELECT 
      column_name, 
      data_type, 
      udt_name,
      is_nullable, 
      column_default
    FROM information_schema.columns
    WHERE table_name = 'people'
    ORDER BY ordinal_position;
  `;

  const constraints = await sql`
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_name = 'people';
  `;

  const indexes = await sql`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'people';
  `;

  console.log("=== COLUMNS ===");
  console.log(JSON.stringify(columns, null, 2));
  console.log("=== CONSTRAINTS ===");
  console.log(JSON.stringify(constraints, null, 2));
  console.log("=== INDEXES ===");
  console.log(JSON.stringify(indexes, null, 2));

  await sql.end();
}

inspectPeopleSchema();
