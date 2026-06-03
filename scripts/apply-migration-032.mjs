import postgres from "postgres";

let url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL"); process.exit(1); }
if (url.startsWith('DATABASE_URL=')) url = url.slice('DATABASE_URL='.length);
url = url.replace(/^"|"$/g, '');
url = url.replace(/:(?:\[)([^\]]+)(?:\])@/, (_, pass) => `:${encodeURIComponent(pass)}@`);

const client = postgres(url, { ssl: 'require' });

try {
  await client`ALTER TABLE accessories ADD COLUMN IF NOT EXISTS obrigatorio boolean DEFAULT false NOT NULL`;
  console.log("✓ accessories.obrigatorio added");
  await client`ALTER TABLE accessory_units ADD COLUMN IF NOT EXISTS variante varchar(100)`;
  console.log("✓ accessory_units.variante added");
} catch (e) {
  console.error("Migration error:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
