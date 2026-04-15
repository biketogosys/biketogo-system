import fs from 'fs';
import mysql from 'mysql2/promise';

async function main() {
  const sql = fs.readFileSync('./drizzle/0003_nice_centennial.sql', 'utf-8');
  const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log(`Executing ${statements.length} statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    try {
      await conn.query(stmt);
      console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME') {
        console.log(`⚠️  [${i + 1}/${statements.length}] Skipped (already exists): ${preview}...`);
      } else {
        console.error(`❌ [${i + 1}/${statements.length}] FAILED: ${preview}...`);
        console.error(`   Error: ${err.message}`);
      }
    }
  }
  
  // Insert default system settings
  const defaults = [
    ['delivery_fee', '30.00'],
    ['whatsapp_notification_number', ''],
    ['business_hours_start', '09:00'],
    ['business_hours_end', '19:00'],
    ['delivery_margin_minutes', '30'],
  ];
  
  for (const [key, value] of defaults) {
    try {
      await conn.query(
        'INSERT INTO system_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `key`=`key`',
        [key, value]
      );
      console.log(`✅ Setting: ${key} = ${value}`);
    } catch (err) {
      console.log(`⚠️  Setting ${key}: ${err.message}`);
    }
  }
  
  await conn.end();
  console.log('\n✅ Migration complete!');
}

main().catch(console.error);
