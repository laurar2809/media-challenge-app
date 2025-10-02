// server.js
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('express-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false,
}));
app.use(flash());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);

// Helpers
function isUrl(str) {
  return /^https?:\/\//i.test(str) || /^data:image\//i.test(str);
}

// Routes
app.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY id DESC').all();
  res.render('index', { items, isUrl });
});

app.get('/items/new', (req, res) => {
  res.render('form', { item: {}, action: '/items', method: 'POST', title: 'Neuen Datensatz anlegen' });
});

app.post('/items', (req, res) => {
  const { title, description, icon } = req.body;
  if (!title || !description) {
    req.flash('error', 'Titel und Beschreibung sind Pflichtfelder.');
    return res.redirect('/items/new');
  }
  const stmt = db.prepare('INSERT INTO items (title, description, icon) VALUES (?, ?, ?)');
  stmt.run(title.trim(), description.trim(), icon ? icon.trim() : null);
  req.flash('success', 'Datensatz erfolgreich angelegt.');
  res.redirect('/');
});

app.get('/items/:id/edit', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) {
    req.flash('error', 'Datensatz nicht gefunden.');
    return res.redirect('/');
  }
  res.render('form', { item, action: `/items/${item.id}?_method=PUT`, method: 'POST', title: 'Datensatz bearbeiten' });
});

app.put('/items/:id', (req, res) => {
  const { title, description, icon } = req.body;
  const stmt = db.prepare('UPDATE items SET title = ?, description = ?, icon = ? WHERE id = ?');
  stmt.run(title.trim(), description.trim(), icon ? icon.trim() : null, req.params.id);
  req.flash('success', 'Änderungen gespeichert.');
  res.redirect('/');
});

app.delete('/items/:id', (req, res) => {
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  req.flash('success', 'Datensatz gelöscht.');
  res.redirect('/');
});

// Start
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
