import postgres from "postgres";

let url = process.env.DATABASE_URL || '';
if (!url) {
  console.log("No DATABASE_URL found");
  process.exit(0);
}
// Same cleanDatabaseUrl as db.ts
if (url.startsWith('DATABASE_URL=')) url = url.slice('DATABASE_URL='.length);
url = url.replace(/^"|"$/g, '');
// Supabase URLs may wrap the password in brackets [pass] — strip them
url = url.replace(/:(?:\[)([^\]]+)(?:\])@/, (_, pass) => `:${encodeURIComponent(pass)}@`);
console.log("Connecting to database...");
const sql = postgres(url, { ssl: "require", max: 1 });

try {
  // Check if column exists
  const result = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'weight'
  `;
  
  if (result.length > 0) {
    console.log("Column 'weight' already exists in clients table.");
  } else {
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS weight varchar(10)`;
    console.log("Column 'weight' added to clients table successfully.");
  }
} catch (err) {
  console.error("Error:", err.message);
} finally {
  await sql.end();
}
