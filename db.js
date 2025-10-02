// db.js
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.sqlite'));

// Initialize table
db.exec(`
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT
);
`);

// Seed if empty
const count = db.prepare('SELECT COUNT(*) as c FROM items').get().c;
if (count === 0) {
  const stmt = db.prepare('INSERT INTO items (title, description, icon) VALUES (?, ?, ?)');
  const seed = [
    ['Beispiel 1', 'Kurze Beschreibung für Datensatz 1', '💡'],
    ['Beispiel 2', 'Noch eine Beschreibung – mit etwas mehr Text.', 'https://cdn-icons-png.flaticon.com/512/1829/1829586.png'],
    ['Beispiel 3', 'Beschreibung 3', '⭐']
  ];
  const transaction = db.transaction((rows) => {
    for (const row of rows) stmt.run(row);
  });
  transaction(seed);
}

module.exports = db;
