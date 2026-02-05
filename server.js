// server.js 
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('express-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const { db, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true, limit: '100mb'}));
app.use(express.json({ limit: '100mb' }));
//  ERSETZEN SIE DIES MIT:
app.use(methodOverride(function (req, res) {
    let method = null;
    
    // 1. Suche im Body (für Schüler-Löschung, Challenge-Update, etc.)
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        method = req.body._method;
        delete req.body._method;
        return method;
    }

    // 2. Suche im Query-String (für Aufgabenpakete mit Datei-Upload)
    if (req.query && req.query._method) {
        method = req.query._method;
        // WICHTIG: Im Gegensatz zum Body darf der Query-Parameter NICHT gelöscht werden,
        // da er Teil des ursprünglichen URL-Pfads ist, den Express erwartet.
        return method;
    }
    
    // Wenn nichts gefunden wurde
    return null;
}));
app.use(express.static(path.join(__dirname, 'public')));

// Session & Flash
app.use(session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false,
}));
app.use(flash());

// DB zu allen Requests hinzufügen
app.use((req, res, next) => {
  req.db = db;
  next();
});

// User laden Middleware
const { loadUser } = require('./middleware/auth');
app.use(loadUser);

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Globale Template Variablen
app.use((req, res, next) => {
  res.locals.flash = {
    success: req.flash('success'),
    error: req.flash('error'),
    info: req.flash('info'),
    warning: req.flash('warning')
  };
  res.locals.activePage = '';
  res.locals.isUrl = (str) => /^https?:\/\//i.test(str) || /^data:image\//i.test(str);
  res.locals.isUploadPath = (str) => typeof str === 'string' && str.startsWith('/uploads/');
  next();
});

// // DEBUG Middleware - TEMPORÄR HINZUFÜGEN!
// app.use((req, res, next) => {
//   console.log('=== REQUEST ===');
//   console.log('Method:', req.method);
//   console.log('Original URL:', req.originalUrl);
//   console.log('Path:', req.path);
//   console.log('Body:', req.body);
//   console.log('Query:', req.query);
//   console.log('Override Method:', req.body._method || 'none');
//   console.log('================');
//   next();
// });

// Routen einbinden
app.use('/', require('./routes/ansichten'));
app.use('/challenges', require('./routes/challenges'));
app.use('/schueler', require('./routes/schueler'));
app.use('/aufgabenpakete', require('./routes/aufgabenpakete'));
app.use('/kategorien', require('./routes/kategorien'));
app.use('/api', require('./routes/api/searchApi'));
app.use('/lehrer', require('./routes/lehrer'));
app.use('/admin', require('./routes/admin'));
app.use('/auth', require('./routes/auth'));
app.use('/teams', require('./routes/teams'));
app.use('/', require('./routes/upload'));
app.use('/bewertung', require('./routes/bewertung'));

// ========== NUR EIN 404 HANDLER ==========
app.use((req, res) => {
  console.log('404 für:', req.method, req.originalUrl);
  res.status(404).render('404', {
    title: 'Seite nicht gefunden',
    activePage: ''
  });
});

// ========== NUR EIN ERROR HANDLER ==========
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).render('500', {
    title: 'Server Fehler',
    activePage: '',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Server starten
init().then(() => {
  app.listen(PORT, () => {
    console.log(` Server läuft auf http://localhost:${PORT}`);
    console.log(' Method-Override aktiviert für DELETE/PUT');
    console.log(' Debug-Logs für alle Requests aktiv');
  });
}).catch((err) => {
  console.error('DB init error:', err);
  process.exit(1);
});