import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const projectRoot = 'C:/Users/SAMA/OneDrive/Desktop/Web-Development/Email Job Scheduler';
const require = createRequire(path.join(projectRoot, 'backend', 'package.json'));
const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(projectRoot, 'backend', '.env') });

const { Pool } = pg;

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL is not set in backend/.env.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();
  try {
    console.log('Connecting to PostgreSQL database...');
    const schemaPath = path.join(projectRoot, 'database', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying database schema...');
    await client.query(sql);
    console.log('Schema applied successfully.');

    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('Verified public tables in database:');
    res.rows.forEach((row) => console.log(`  - ${row.table_name}`));
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
