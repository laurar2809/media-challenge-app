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
// Storage für aufgabenpakete
const aufgabenpaketeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadDir, 'aufgabenpakete');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = mime.extension(file.mimetype) || 'bin';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `aufgabenpaket-${unique}.${ext}`);
  }
});

// Storage für Kategorien
const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadDir, 'categories');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = mime.extension(file.mimetype) || 'bin';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `category-${unique}.${ext}`);
  }
});

const uploadAufgabenpaket = multer({ storage: aufgabenpaketeStorage });
const uploadCategory = multer({ storage: categoryStorage });

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
  const categories = await db('categories').select('*').orderBy('title', 'asc');
  res.render('index', { categories, isUrl, isUploadPath, activePage: 'kategorien' });
});



// Datensatz aus Datenbank
app.get('/aufgabenpakete', async (req, res) => {
  try {
    const aufgabenpakete = await db('aufgabenpakete').select('*').orderBy('title', 'asc');
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    res.render('aufgabenpakete', {
      aufgabenpakete: aufgabenpakete,
      kategorien: kategorien,
      activePage: 'aufgabenpakete'
    });
  } catch (error) {
    console.error("Fehler beim Laden der aufgabenpakete:", error);
    res.render('aufgabenpakete', {
      aufgabenpakete: [],  //Leere Array falls Fehler
      kategorien: [],
      activePage: 'aufgabenpakete'
    });
  }
});


// Test-Route für Environment Variables
app.get('/test-env', (req, res) => {
  res.json({
    dbHost: process.env.DB_HOST,
    dbUser: process.env.DB_USER,
    dbName: process.env.DB_NAME,
    dbClient: process.env.DB_CLIENT,
    envFile: 'Werte werden aus .env gelesen'
  });
});



app.get('/aufgabenpakete/new', async (req, res) => {
  const kategorien = await db('categories').select('*').orderBy('title', 'asc');
  res.render('formAufgabenpakete', {
    item: {},
    kategorien,
    action: '/aufgabenpakete',
    title: 'Neues Aufgabenpaket anlegen',
    activePage: 'aufgabenpakete'
  });
});


// Aufgabenpaket speichern
app.post('/aufgabenpakete', uploadAufgabenpaket.single('iconFile'), async (req, res) => {
  let { kategorie, description, icon, title } = req.body;

  if (!kategorie || !description || !title) {
    req.flash('error', 'Titel, Kategorie und Beschreibung sind Pflichtfelder.');
    return res.redirect('/aufgabenpakete/new');
  }

  // BILD VERARBEITUNG HINZUFÜGEN
  if (req.file) {
    icon = '/uploads/aufgabenpakete/' + req.file.filename;
  }

  await db('aufgabenpakete').insert({
    title: title.trim(),
    description: description.trim(),
    kategorie: kategorie.trim(),
    icon: icon ? icon.trim() : null
  });

  req.flash('success', 'Aufgabenpaket erfolgreich angelegt.');
  res.redirect('/aufgabenpakete');
});


// DEBUG ROUTE - GANZ OBEN einfügen 
app.get('/aufgabenpakete/:id/edit', async (req, res) => {

  try {
    const aufgabenpaket = await db('aufgabenpakete').where({ id: req.params.id }).first();
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    console.log("Aufgabenpaket gefunden:", aufgabenpaket);
    console.log("Kategorien gefunden:", kategorien.length);

    if (!aufgabenpaket) {
      req.flash('error', 'Aufgabenpaket nicht gefunden.');
      return res.redirect('/aufgabenpakete');
    }

    res.render('formAufgabenpakete', {
      item: aufgabenpaket,
      kategorien,
      action: `/aufgabenpakete/${aufgabenpaket.id}?_method=PUT`,
      method: 'POST',
      title: 'Aufgabenpakete bearbeiten',
      activePage: 'aufgabenpakete'
    });

  } catch (error) {
    console.log("FEHLER:", error);
    req.flash('error', 'Fehler beim Laden des Aufgabenpaketes.');
    res.redirect('/aufgabenpakete');
  }
});


app.put('/aufgabenpakete/:id', uploadAufgabenpaket.single('iconFile'), async (req, res) => {
  let { kategorie, description, icon, title } = req.body;

  const currentAufgabenpaket = await db('aufgabenpakete').where({ id: req.params.id }).first();
  if (!req.file) icon = currentAufgabenpaket.icon;

  // BILD VERARBEITUNG HINZUFÜGEN
  if (req.file) {
    icon = '/uploads/aufgabenpakete/' + req.file.filename;
  }

  await db('aufgabenpakete').where({ id: req.params.id }).update({
    title: title.trim(),
    description: description.trim(),
    kategorie: kategorie.trim(),
    icon: icon ? icon.trim() : null
  });

  req.flash('success', 'Änderungen gespeichert.');
  res.redirect('/aufgabenpakete');  // Zurück zu aufgabenpakete, nicht zur Startseite!
});


// DETAILED DELETE DEBUG
app.delete('/aufgabenpakete/:id', async (req, res) => {

  try {
    // 1. ID in Zahl umwandeln (wichtig!)
    const aufgabenpaketId = parseInt(req.params.id);

    // 2. ALLE aufgabenpakete anzeigen (vorher)
    const allaufgabenpaketeBefore = await db('aufgabenpakete').select('*');

    // 3. Spezifische Aufgabenpaket suchen
    const aufgabenpaketToDelete = await db('aufgabenpakete').where({ id: aufgabenpaketId }).first();

    if (!aufgabenpaketToDelete) {
      req.flash('error', `Aufgabenpaket mit ID ${aufgabenpaketId} nicht gefunden.`);
      return res.redirect('/aufgabenpakete');
    }

    // 4. LÖSCHEN versuchen
    const deleteResult = await db('aufgabenpakete').where({ id: aufgabepaketId }).del();

    // 5. ALLE aufgabenpakete anzeigen (nachher)
    const allaufgabenpaketeAfter = await db('aufgabenpakete').select('*');

    // 6. Spezifisch prüfen ob noch da
    const checkIfStillExists = await db('aufgabenpakete').where({ id: aufgabenpaketId }).first();

    if (deleteResult > 0 && !checkIfStillExists) {
      console.log("🎉 ERFOLG: Aufgabenpaket wurde gelöscht!");
      req.flash('success', 'Aufgabenpaket erfolgreich gelöscht.');
    } else {
      req.flash('error', 'Löschen fehlgeschlagen.');
    }

  } catch (error) {
    console.error("FEHLER:", error);
    req.flash('error', 'Datenbank-Fehler: ' + error.message);
  }

  res.redirect('/aufgabenpakete');
});

// ----- Aufgabenpaket Filter nach Kategorie -----
app.get('/aufgabenpakete/filter/:kategorie', async (req, res) => {
  try {
    const kategorie = req.params.kategorie;

    // Alle aufgabenpakete der gewählten Kategorie
    const aufgabenpakete = await db('aufgabenpakete')
      .where({ kategorie: kategorie })
      .orderBy('title', 'asc');

    // Alle Kategorien für das Dropdown
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    res.render('aufgabenpakete', {
      aufgabenpakete: aufgabenpakete,
      kategorien: kategorien,
      activeKategorie: kategorie,
      activePage: 'aufgabenpakete'

    });

  } catch (error) {
    console.error("Fehler beim Filtern:", error);
    req.flash('error', 'Fehler beim Filtern der aufgabenpakete');
    res.redirect('/aufgabenpakete');
  }
});

// ----- Aufgabenpaket Search API -----
app.get('/api/aufgabenpakete/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;

    if (!searchTerm || searchTerm.length < 2) {
      return res.json([]);
    }

    const aufgabenpakete = await db('aufgabenpakete')
      .where('title', 'like', `%${searchTerm}%`)
      .orWhere('description', 'like', `%${searchTerm}%`)
      .orWhere('kategorie', 'like', `%${searchTerm}%`)
      .select('*')
      .limit(10);

    res.json(aufgabenpakete);

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: 'Search failed' });
  }
});


app.get('/aufgabenpakete/:id', async (req, res) => {
  try {
    const aufgabenpaket = await db('aufgabenpakete').where({ id: req.params.id }).first();

    if (!aufgabenpaket) {
      req.flash('error', 'Aufgabenpaket nicht gefunden.');
      return res.redirect('/aufgabenpakete');
    }

    res.render('aufgabenpaketeDetail', {
      aufgabenpaket: aufgabenpaket,
      activePage: 'aufgabenpakete',
      isUrl: isUrl,
      isUploadPath: isUploadPath
    });

  } catch (error) {
    console.error("Fehler:", error);
    req.flash('error', 'Fehler beim Laden des Aufgabenpaketes.');
    res.redirect('/aufgabenpakete');
  }
});


app.get('/categories/new', (req, res) => {
  res.render('formKategorien', {
    item: {},
    action: '/categories',
    method: 'POST',
    title: 'Neue Kategorie anlegen',
    activePage: 'kategorien'
  });
});

app.post('/categories', uploadCategory.single('iconFile'), async (req, res) => {
  let { title, description, icon } = req.body;  // AUS req.body HOLEN!

  if (!title || !description) {
    req.flash('error', 'Titel und Beschreibung sind Pflichtfelder.');
    return res.redirect('/categories/new');
  }
  if (req.file) icon = '/uploads/categories/' + req.file.filename;

  await db('categories').insert({ title: title.trim(), description: description.trim(), icon: icon ? icon.trim() : null });
  req.flash('success', 'Kategorie erfolgreich angelegt.');
  res.redirect('/');
});


app.get('/categories/:id/edit', async (req, res) => {
  const item = await db('categories').where({ id: req.params.id }).first();
  if (!item) {
    req.flash('error', 'Kategorie nicht gefunden.');
    return res.redirect('/');
  }
  res.render('formKategorien', { item, action: `/categories/${item.id}?_method=PUT`, method: 'POST', title: 'Kategorie bearbeiten', activePage: 'kategorien' });
});



app.put('/categories/:id', uploadCategory.single('iconFile'), async (req, res) => {
  let { title, description, icon } = req.body;
  const currentItem = await db('categories').where({ id: req.params.id }).first();
  if (!req.file) icon = currentItem.icon;

  if (req.file) icon = '/uploads/categories/' + req.file.filename;

  await db('categories').where({ id: req.params.id }).update({
    title: title.trim(),
    description: description.trim(),
    icon: icon ? icon.trim() : null
  });

  req.flash('success', 'Änderungen gespeichert.');
  res.redirect('/');
});

app.delete('/categories/:id', async (req, res) => {
  const item = await db('categories').where({ id: req.params.id }).first();
  if (item && isUploadPath(item.icon)) {
    // try to remove uploaded file
    const filePath = path.join(__dirname, 'public', item.icon);
    fs.unlink(filePath, () => { });
  }
  await db('categories').where({ id: req.params.id }).del();
  req.flash('success', 'Kategorie gelöscht.');
  res.redirect('/');
});

// ----- CHALLENGES ROUTES -----

// Challenges Liste
app.get('/challenges', async (req, res) => {
  try {
    const challenges = await db('challenges').select('*').orderBy('title', 'asc');
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    res.render('challenges', {
      challenges: challenges,
      kategorien: kategorien,
      activePage: 'challenges'
    });
  } catch (error) {
    console.error("Fehler beim Laden der Challenges:", error);
    res.render('challenges', {
      challenges: [],
      kategorien: [],
      activePage: 'challenges'
    });
  }
});

// Neue Challenge erstellen
app.get('/challenges/new', async (req, res) => {
  const kategorien = await db('categories').select('*').orderBy('title', 'asc');
  res.render('formChallenges', {
    item: {},
    kategorien,
    action: '/challenges',
    title: 'Neue Challenge anlegen',
    activePage: 'challenges'
  });
});

// Challenge speichern
app.post('/challenges', uploadAufgabenpaket.single('iconFile'), async (req, res) => {
  let { kategorie, description, icon, title } = req.body;

  if (!kategorie || !description || !title) {
    req.flash('error', 'Titel, Kategorie und Beschreibung sind Pflichtfelder.');
    return res.redirect('/challenges/new');
  }

  if (req.file) {
    icon = '/uploads/aufgabenpakete/' + req.file.filename;
  }

  await db('challenges').insert({
    title: title.trim(),
    description: description.trim(),
    kategorie: kategorie.trim(),
    icon: icon ? icon.trim() : null
  });

  req.flash('success', 'Challenge erfolgreich angelegt.');
  res.redirect('/challenges');
});

// Challenge bearbeiten
app.get('/challenges/:id/edit', async (req, res) => {
  try {
    const challenge = await db('challenges').where({ id: req.params.id }).first();
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    if (!challenge) {
      req.flash('error', 'Challenge nicht gefunden.');
      return res.redirect('/challenges');
    }

    res.render('formChallenges', {
      item: challenge,
      kategorien,
      action: `/challenges/${challenge.id}?_method=PUT`,
      method: 'POST',
      title: 'Challenge bearbeiten',
      activePage: 'challenges'
    });
  } catch (error) {
    console.log("FEHLER:", error);
    req.flash('error', 'Fehler beim Laden der Challenge.');
    res.redirect('/challenges');
  }
});

// Challenge updaten
app.put('/challenges/:id', uploadAufgabenpaket.single('iconFile'), async (req, res) => {
  let { kategorie, description, icon, title } = req.body;

  const currentChallenge = await db('challenges').where({ id: req.params.id }).first();
  if (!req.file) icon = currentChallenge.icon;

  if (req.file) {
    icon = '/uploads/aufgabenpakete/' + req.file.filename;
  }

  await db('challenges').where({ id: req.params.id }).update({
    title: title.trim(),
    description: description.trim(),
    kategorie: kategorie.trim(),
    icon: icon ? icon.trim() : null
  });

  req.flash('success', 'Änderungen gespeichert.');
  res.redirect('/challenges');
});

// Challenge löschen
app.delete('/challenges/:id', async (req, res) => {
  try {
    const challengeId = parseInt(req.params.id);
    await db('challenges').where({ id: challengeId }).del();
    req.flash('success', 'Challenge erfolgreich gelöscht.');
  } catch (error) {
    console.error("FEHLER:", error);
    req.flash('error', 'Datenbank-Fehler: ' + error.message);
  }
  res.redirect('/challenges');
});

// Challenge Filter
app.get('/challenges/filter/:kategorie', async (req, res) => {
  try {
    const kategorie = req.params.kategorie;
    const challenges = await db('challenges')
      .where({ kategorie: kategorie })
      .orderBy('title', 'asc');
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    res.render('challenges', {
      challenges: challenges,
      kategorien: kategorien,
      activeKategorie: kategorie,
      activePage: 'challenges'
    });
  } catch (error) {
    console.error("Fehler beim Filtern:", error);
    req.flash('error', 'Fehler beim Filtern der Challenges');
    res.redirect('/challenges');
  }
});

// Challenge Search API
app.get('/api/challenges/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm || searchTerm.length < 2) return res.json([]);

    const challenges = await db('challenges')
      .where('title', 'like', `%${searchTerm}%`)
      .orWhere('description', 'like', `%${searchTerm}%`)
      .orWhere('kategorie', 'like', `%${searchTerm}%`)
      .select('*')
      .limit(10);

    res.json(challenges);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ----- REST API -----
app.get('/api/categories', async (req, res) => {
  const categories = await db('categories').select('*').orderBy('title', 'asc');
  res.json(categories);
});

app.get('/api/categories/:id', async (req, res) => {
  const item = await db('categories').where({ id: req.params.id }).first();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.post('/api/categories', async (req, res) => {
  const { title, description, icon } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Missing fields' });

  let insertQuery = db('categories').insert({ title, description, icon });

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

app.put('/api/categories/:id', async (req, res) => {
  const { title, description, icon } = req.body;
  await db('categories').where({ id: req.params.id }).update({ title, description, icon });
  res.json({ success: true });
});

app.delete('/api/categories/:id', async (req, res) => {
  await db('categories').where({ id: req.params.id }).del();
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




// db init erstellen lassen für datenbank struktur