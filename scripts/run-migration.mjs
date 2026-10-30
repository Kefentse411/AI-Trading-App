import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runMigrations() {
  const projectRoot = path.join(__dirname, "..");
  const dbPath = path.join(projectRoot, "sqlite.db");
  const migrationsDir = path.join(projectRoot, "drizzle");

  console.log(`Database path: ${dbPath}`);
  console.log(`Migrations directory: ${migrationsDir}`);

  if (!fs.existsSync(migrationsDir)) {
    console.log("❌ No migrations directory found at", migrationsDir);
    return;
  }

  if (!fs.existsSync(dbPath)) {
    console.log("❌ No database found at", dbPath);
    console.log("Please ensure db.sqlite exists in your project root");
    return;
  }

  const db = new Database(dbPath);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No SQL migration files found in drizzle/");
    db.close();
    return;
  }

  console.log(`\nFound ${files.length} migration file(s)\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`Running: ${file}`);

    try {
      // Split by semicolon and execute each statement
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        db.exec(statement);
      }

      console.log(`✅ ${file} completed\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${file} failed:`);
      console.error(`   ${error.message}\n`);
      failureCount++;
    }
  }

  db.close();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Migration Summary:`);
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failureCount}`);
  console.log(`${"=".repeat(60)}\n`);

  if (failureCount > 0) {
    process.exit(1);
  }
}

runMigrations();