const Database = require('better-sqlite3');
const db = new Database('sqlite.db');
const tickets = db.prepare('SELECT * FROM tickets ORDER BY createdAt DESC LIMIT 5').all();
const messages = db.prepare('SELECT * FROM messages ORDER BY createdAt DESC LIMIT 5').all();
console.log('Tickets:', tickets);
console.log('Messages:', messages);
