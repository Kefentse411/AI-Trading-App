import Database from 'better-sqlite3';

const db = new Database('database.db');

const email = 'kefentsecharlie5@gmail.com';

const result = db.prepare(`
  UPDATE users 
  SET role_id = (SELECT id FROM roles WHERE name = 'admin')
  WHERE email = ?
`).run(email);

console.log(`Updated ${result.changes} user(s) to admin role`);

const user = db.prepare(`
  SELECT u.email, u.name, r.name as role
  FROM users u 
  JOIN roles r ON u.role_id = r.id 
  WHERE u.email = ?
`).get(email);

console.log('User is now:', user);
db.close();