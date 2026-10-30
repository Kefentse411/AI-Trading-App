import Database from 'better-sqlite3';

const db = new Database('database.db');

console.log('=== TABLES ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(table => console.log(table.name));

console.log('\n=== MIGRATIONS ===');
try {
  const migrations = db.prepare('SELECT * FROM migrations ORDER BY filename').all();
  migrations.forEach(m => console.log(`${m.filename} (${new Date(m.executed_at * 1000).toISOString()})`));
} catch (e) {
  console.log('No migrations table found');
}

if (tables.find(t => t.name === 'users')) {
  console.log('\n=== USERS ===');
  const users = db.prepare('SELECT * FROM users').all();
  console.log(users);
}

db.close();
