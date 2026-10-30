import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'database.db');
const migrationsPath = path.join(__dirname, '..', 'migrations');

// Ensure database exists
const db = new Database(dbPath);

// Create migrations tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    filename TEXT PRIMARY KEY,
    executed_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

function runMigrations() {
  if (!fs.existsSync(migrationsPath)) {
    console.log('No migrations folder found');
    return;
  }

  const migrationFiles = fs.readdirSync(migrationsPath)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const executedMigrations = db.prepare('SELECT filename FROM migrations').all()
    .map(row => row.filename);

  const pendingMigrations = migrationFiles.filter(file => 
    !executedMigrations.includes(file)
  );

  if (pendingMigrations.length === 0) {
    console.log('No pending migrations');
    return;
  }

  console.log(`Running ${pendingMigrations.length} pending migration(s)...`);

  for (const migrationFile of pendingMigrations) {
    console.log(`Running migration: ${migrationFile}`);
    
    const migrationPath = path.join(migrationsPath, migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    try {
      db.exec(migrationSQL);
      
      // Mark as executed
      db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(migrationFile);
      
      console.log(`✓ ${migrationFile} completed`);
    } catch (error) {
      console.error(`✗ ${migrationFile} failed:`, error.message);
      process.exit(1);
    }
  }

  console.log('Migration completed successfully.');
}

runMigrations();
db.close();