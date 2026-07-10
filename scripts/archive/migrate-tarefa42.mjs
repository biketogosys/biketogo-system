import postgres from "postgres";

let rawUrl = process.env.DATABASE_URL || "";
if (rawUrl.startsWith("DATABASE_URL=")) rawUrl = rawUrl.slice("DATABASE_URL=".length);
rawUrl = rawUrl.replace(/^"|"$/g, "");
// Supabase: strip brackets around password [pass] → encode
rawUrl = rawUrl.replace(/:(?:\[)([^\]]+)(?:\])@/, (_, pass) => `:${encodeURIComponent(pass)}@`);

const sql = postgres(rawUrl, { ssl: "require", prepare: false, max: 1 });

try {
  // 1. ADD VALUE to enum (Postgres — must run outside transaction)
  await sql.unsafe(`ALTER TYPE "public"."client_status" ADD VALUE IF NOT EXISTS 'recusado'`);
  console.log("✓ ALTER TYPE client_status ADD VALUE recusado");
} catch (e) {
  console.log("⚠ ALTER TYPE skipped (may already exist):", e.message);
}

try {
  // 2. ADD COLUMN motivoRecusa
  await sql.unsafe(`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "motivoRecusa" text`);
  console.log("✓ ADD COLUMN motivoRecusa");
} catch (e) {
  console.log("⚠ ADD COLUMN skipped:", e.message);
}

await sql.end();
console.log("Migration done.");
