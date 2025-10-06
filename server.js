// server.js
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('express-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mime = require('mime-types');

const { db, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads dir
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Dateiendungen aus dem MIME-Typ auslesen und schreiben
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Endung zuverlässig aus dem MIME-Typ ableiten (z. B. "image/png" -> "png")
    const ext = mime.extension(file.mimetype) || 'bin';
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, `icon-${unique}.${ext}`);                        // z.B. icon-169652…-123456789.png
  }
});

const upload = multer({ storage });

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
app.use((req, res, next) => {
  res.locals.flash = {
    success: req.flash('success'),
    error: req.flash('error'),
    info: req.flash('info'),
    warning: req.flash('warning')
  };
  next();
});


// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); 

// Helpers
function isUrl(str) {
  return /^https?:\/\//i.test(str) || /^data:image\//i.test(str);
}
function isUploadPath(str) {
  return typeof str === 'string' && str.startsWith('/uploads/');
}

// ----- Web Views (Server-rendered) -----
app.get('/', async (req, res) => {
  const items = await db('items').select('*').orderBy('title', 'asc');
  res.render('index', { items, isUrl, isUploadPath });
});

app.get('/items/new', (req, res) => {
  res.render('form', { item: {}, action: '/items', method: 'POST', title: 'Neuen Datensatz anlegen' });
});

app.post('/items', upload.single('iconFile'), async (req, res) => {
  let { title, description, icon } = req.body;
  if (!title || !description) {
    req.flash('error', 'Titel und Beschreibung sind Pflichtfelder.');
    return res.redirect('/items/new');
  }
  if (req.file) icon = '/uploads/' + req.file.filename;

  await db('items').insert({ title: title.trim(), description: description.trim(), icon: icon ? icon.trim() : null });
  req.flash('success', 'Datensatz erfolgreich angelegt.');
  res.redirect('/');
});

app.get('/items/:id/edit', async (req, res) => {
  const item = await db('items').where({ id: req.params.id }).first();
  if (!item) {
    req.flash('error', 'Datensatz nicht gefunden.');
    return res.redirect('/');
  }
  res.render('form', { item, action: `/items/${item.id}?_method=PUT`, method: 'POST', title: 'Kategorie bearbeiten' });
});

app.put('/items/:id', upload.single('iconFile'), async (req, res) => {
  let { title, description, icon } = req.body;
  if (req.file) icon = '/uploads/' + req.file.filename;
  await db('items').where({ id: req.params.id }).update({
    title: title.trim(),
    description: description.trim(),
    icon: icon ? icon.trim() : null
  });
  req.flash('success', 'Änderungen gespeichert.');
  res.redirect('/');
});

app.delete('/items/:id', async (req, res) => {
  const item = await db('items').where({ id: req.params.id }).first();
  if (item && isUploadPath(item.icon)) {
    // try to remove uploaded file
    const filePath = path.join(__dirname, 'public', item.icon);
    fs.unlink(filePath, () => {});
  }
  await db('items').where({ id: req.params.id }).del();
  req.flash('success', 'Datensatz gelöscht.');
  res.redirect('/');
});

// ----- REST API -----
app.get('/api/items', async (req, res) => {
  const items = await db('items').select('*').orderBy('title', 'asc');
  res.json(items);
});

app.get('/api/items/:id', async (req, res) => {
  const item = await db('items').where({ id: req.params.id }).first();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.post('/api/items', async (req, res) => {
  const { title, description, icon } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Missing fields' });

  let insertQuery = db('items').insert({ title, description, icon });

  // For PostgreSQL we can return id; for others, we can get it in different ways
  try {
    let ret;
    if ((process.env.DB_CLIENT || 'sqlite').toLowerCase() === 'pg') {
      ret = await insertQuery.returning('id');
      const id = Array.isArray(ret) ? (ret[0]?.id || ret[0]) : ret;
      return res.json({ id });
    } else {
      ret = await insertQuery;
      // knex on sqlite/mysql returns [id]
      const id = Array.isArray(ret) ? ret[0] : ret;
      return res.json({ id });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Insert failed' });
  }
});

app.put('/api/items/:id', async (req, res) => {
  const { title, description, icon } = req.body;
  await db('items').where({ id: req.params.id }).update({ title, description, icon });
  res.json({ success: true });
});

app.delete('/api/items/:id', async (req, res) => {
  await db('items').where({ id: req.params.id }).del();
  res.json({ success: true });
});

// Start
init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('DB init error:', err);
  process.exit(1);
});
