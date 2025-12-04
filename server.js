// server.js - Vereinfachte Hauptdatei
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('express-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');



const {db, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
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
  req.db = db;  // Database connection zu allen Routes hinzufügen
  next();
});

// UND die loadUser Middleware KORREKT einbinden (VOR den Routes!)
const { loadUser } = require('./middleware/auth');
app.use(loadUser);  // Diese Zeile einfügen!


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


// Routen einbinden
app.use('/', require('./routes/index'));
app.use('/challenges', require('./routes/challenges'));
app.use('/schueler', require('./routes/schueler'));
app.use('/aufgabenpakete', require('./routes/aufgabenpakete'));
app.use('/categories', require('./routes/categories'));
app.use('/api', require('./routes/api'));
app.use('/lehrer', require('./routes/lehrer'));
app.use('/auth', require('./routes/auth'));  // AUCH DIE AUTH ROUTE!


// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'Seite nicht gefunden',
    activePage: '' 
  });
});

// Error Handler
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
    console.log(' Routen strukturiert in:');
    console.log('   - /routes/index.js');
    console.log('   - /routes/challenges.js');
    console.log('   - /routes/schueler.js');
    console.log('   - /routes/aufgabenpakete.js');
    console.log('   - /routes/categories.js');
    console.log('   - /routes/api/index.js');
  });
}).catch((err) => {
  console.error('DB init error:', err);
  process.exit(1);
});

// 404 Handler - EINFACHERE VERSION
app.use((req, res) => {
  res.status(404).send(`
    <div style="text-align: center; margin-top: 50px;">
      <h1> 404 - Seite nicht gefunden</h1>
      <p>Die angeforderte Seite existiert nicht.</p>
      <a href="/">Zur Startseite</a>
    </div>
  `);
});

// Error Handler - EINFACHERE VERSION  
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).send(`
    <div style="text-align: center; margin-top: 50px;">
      <h1>500 - Server Fehler</h1>
      <p>Es ist ein interner Serverfehler aufgetreten.</p>
      <a href="/">Zur Startseite</a>
    </div>
  `);
});


