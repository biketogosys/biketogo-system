import postgres from "postgres";

const rawUrl = process.env.DATABASE_URL ?? "";
let url = rawUrl.startsWith("DATABASE_URL=") ? rawUrl.slice("DATABASE_URL=".length) : rawUrl;
url = url.replace(/^"|"$/g, "");
// Strip bracket-wrapped passwords: :[pass]@ → :pass@
url = url.replace(/:(?:\[)([^\]]+)(?:\])@/, (_, pass) => `:${encodeURIComponent(pass)}@`);

const sql = postgres(url, { ssl: "require", max: 1 });

try {
  // Check if column already exists
  const rows = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'accessories' AND column_name = 'replacementValue'
  `;
  if (rows.length > 0) {
    console.log("✓ Column replacementValue already exists — skipping.");
  } else {
    await sql`ALTER TABLE accessories ADD COLUMN "replacementValue" DECIMAL(10,2) NULL`;
    console.log("✓ Column replacementValue added successfully.");
  }
} catch (err) {
  console.error("✗ Migration failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
