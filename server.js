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



// ----- CHALLENGES ROUTES -----

// Challenges Übersicht - KORRIGIERT
// Vereinfachte Version für SQLite und MySQL
// ----- CHALLENGES ROUTES MIT LIVE-FILTERING -----

// Challenges Übersicht mit Filterung
app.get('/challenges', async (req, res) => {
  try {
    const { kategorie, search } = req.query;
    
    let query = db('challenges')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id');

    // Filter nach Kategorie
    if (kategorie && kategorie !== 'alle') {
      query = query.where('aufgabenpakete.kategorie', kategorie);
    }

    // Suche nach Teams/Aufgabenpaketen
    if (search && search.length >= 2) {
      query = query.where(function() {
        this.where('aufgabenpakete.title', 'like', `%${search}%`)
             .orWhere('teams.name', 'like', `%${search}%`)
             .orWhere('aufgabenpakete.kategorie', 'like', `%${search}%`);
      });
    }

    // Kategorien für Filter-Dropdown
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    let challenges;
    const dbClient = process.env.DB_CLIENT || 'sqlite';
    
    if (dbClient === 'sqlite') {
      // SQLITE VERSION
      challenges = await query
        .select(
          'challenges.*',
          'aufgabenpakete.title as aufgabenpaket_title',
          'aufgabenpakete.kategorie',
          'teams.name as team_name',
          'teams.beschreibung as team_beschreibung'
        )
        .orderBy('challenges.created_at', 'desc');
      
      // Team-Mitglieder separat abfragen
      for (let challenge of challenges) {
        if (challenge.team_id) {
          const mitglieder = await db('team_mitglieder')
            .leftJoin('schueler', 'team_mitglieder.schueler_id', 'schueler.id')
            .where('team_mitglieder.team_id', challenge.team_id)
            .select('schueler.vorname', 'schueler.nachname');
          
          challenge.team_mitglieder_names = mitglieder
            .map(m => `${m.vorname} ${m.nachname}`)
            .join(', ');
        }
      }
    } else {
      // MYSQL VERSION
      challenges = await query
        .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.team_id')
        .leftJoin('schueler', 'team_mitglieder.schueler_id', 'schueler.id')
        .select(
          'challenges.*',
          'aufgabenpakete.title as aufgabenpaket_title',
          'aufgabenpakete.kategorie',
          'teams.name as team_name',
          'teams.beschreibung as team_beschreibung',
          db.raw("GROUP_CONCAT(CONCAT(schueler.vorname, ' ', schueler.nachname) SEPARATOR ', ') as team_mitglieder_names")
        )
        .groupBy('challenges.id')
        .orderBy('challenges.created_at', 'desc');
    }
    
    res.render('challenges', { 
      challenges, 
      kategorien,
      activeKategorie: kategorie || 'alle',
      searchTerm: search || '',
      activePage: 'challenges' 
    });
    
  } catch (error) {
    console.error("Fehler beim Laden der challenges:", error);
    res.render('challenges', { 
      challenges: [], 
      kategorien: [],
      activeKategorie: 'alle',
      searchTerm: '',
      activePage: 'challenges' 
    });
  }
});


// Challenges nach Kategorie filtern
app.get('/challenges/filter/:kategorie', async (req, res) => {
  try {
    const kategorie = req.params.kategorie;
    
    let query = db('challenges')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id')
      .where('aufgabenpakete.kategorie', kategorie);

    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    let challenges;
    const dbClient = process.env.DB_CLIENT || 'sqlite';
    
    if (dbClient === 'sqlite') {
      // SQLITE VERSION
      challenges = await query
        .select(
          'challenges.*',
          'aufgabenpakete.title as aufgabenpaket_title',
          'aufgabenpakete.kategorie',
          'teams.name as team_name',
          'teams.beschreibung as team_beschreibung'
        )
        .orderBy('challenges.created_at', 'desc');
      
      // Team-Mitglieder separat abfragen
      for (let challenge of challenges) {
        if (challenge.team_id) {
          const mitglieder = await db('team_mitglieder')
            .leftJoin('schueler', 'team_mitglieder.schueler_id', 'schueler.id')
            .where('team_mitglieder.team_id', challenge.team_id)
            .select('schueler.vorname', 'schueler.nachname');
          
          challenge.team_mitglieder_names = mitglieder
            .map(m => `${m.vorname} ${m.nachname}`)
            .join(', ');
        }
      }
    } else {
      // MYSQL VERSION
      challenges = await query
        .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.team_id')
        .leftJoin('schueler', 'team_mitglieder.schueler_id', 'schueler.id')
        .select(
          'challenges.*',
          'aufgabenpakete.title as aufgabenpaket_title',
          'aufgabenpakete.kategorie',
          'teams.name as team_name',
          'teams.beschreibung as team_beschreibung',
          db.raw("GROUP_CONCAT(CONCAT(schueler.vorname, ' ', schueler.nachname) SEPARATOR ', ') as team_mitglieder_names")
        )
        .groupBy('challenges.id')
        .orderBy('challenges.created_at', 'desc');
    }
    
    res.render('challenges', { 
      challenges, 
      kategorien,
      activeKategorie: kategorie,
      activePage: 'challenges' 
    });
    
  } catch (error) {
    console.error("Fehler beim Filtern der challenges:", error);
    req.flash('error', 'Fehler beim Filtern der Challenges');
    res.redirect('/challenges');
  }
});


// Challenges Search API - MIT DEBUG
app.get('/api/challenges/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    console.log('🔍 API Search aufgerufen mit:', searchTerm);

    if (!searchTerm || searchTerm.length < 2) {
      console.log('❌ Search term zu kurz');
      return res.json([]);
    }

    const challenges = await db('challenges')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id')
      .where('aufgabenpakete.title', 'like', `%${searchTerm}%`)
      .orWhere('teams.name', 'like', `%${searchTerm}%`)
      .orWhere('aufgabenpakete.kategorie', 'like', `%${searchTerm}%`)
      .select(
        'challenges.*',
        'aufgabenpakete.title as aufgabenpaket_title',
        'aufgabenpakete.kategorie',
        'teams.name as team_name'
      )
      .limit(10);

    console.log('📊 Search Ergebnisse:', challenges.length, 'Challenges gefunden');
    console.log('📋 Ergebnisse:', challenges);

    res.json(challenges);

  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({ error: 'Search failed' });
  }
});


// Neues Challenge Formular
app.get('/challenges/new', async (req, res) => {
  try {
    const aufgabenpakete = await db('aufgabenpakete').select('*').orderBy('title', 'asc');
    const teams = await db('teams').select('*').orderBy('name', 'asc');
    const schueler = await db('schueler')
      .leftJoin('klassen', 'schueler.klasse_id', 'klassen.id')
      .select('schueler.*', 'klassen.name as klasse_name')
      .orderBy('schueler.nachname', 'asc');
    
    res.render('formChallenges', {
      item: {},
      aufgabenpakete,
      teams,
      schueler,
      action: '/challenges',
      title: 'Neue Challenge erstellen',
      activePage: 'challenges'
    });
  } catch (error) {
    console.error("Fehler:", error);
    req.flash('error', 'Fehler beim Laden des Formulars.');
    res.redirect('/challenges');
  }
});

// Challenge speichern
// Challenge speichern - MIT MEHREREN TEAMS
app.post('/challenges', async (req, res) => {
  try {
    const { aufgabenpaket_id, teams_data, zusatzinfos, abgabedatum } = req.body;
    
    console.log('📝 Empfangene Daten:', req.body); // DEBUG
    
    // Validierung
    if (!aufgabenpaket_id) {
      req.flash('error', 'Aufgabenpaket ist erforderlich.');
      return res.redirect('/challenges/new');
    }
    
    if (!teams_data) {
      req.flash('error', 'Mindestens ein Team ist erforderlich.');
      return res.redirect('/challenges/new');
    }
    
    // Parse teams data
    let teams;
    try {
      teams = JSON.parse(teams_data);
    } catch (e) {
      console.error('❌ Fehler beim Parsen der Team-Daten:', e);
      req.flash('error', 'Ungültige Team-Daten.');
      return res.redirect('/challenges/new');
    }
    
    if (!Array.isArray(teams) || teams.length === 0) {
      req.flash('error', 'Mindestens ein Team ist erforderlich.');
      return res.redirect('/challenges/new');
    }
    
    // Hole das ausgewählte Aufgabenpaket
    const aufgabenpaket = await db('aufgabenpakete').where({ id: aufgabenpaket_id }).first();
    if (!aufgabenpaket) {
      req.flash('error', 'Ausgewähltes Aufgabenpaket nicht gefunden.');
      return res.redirect('/challenges/new');
    }
    
    // TRANSACTION START
    const trx = await db.transaction();
    
    try {
      const challengeIds = [];
      
      // Für jedes Team eine Challenge erstellen
      for (const teamData of teams) {
        console.log('👥 Erstelle Team:', teamData.name, 'Mitglieder:', teamData.mitglieder.length);
        
        // 1. Team erstellen
        const [teamId] = await trx('teams').insert({
          name: teamData.name,
          beschreibung: teamData.beschreibung || null
        });
        
        // 2. Schüler dem Team zuweisen
        const teamMitglieder = teamData.mitglieder.map((mitglied, index) => ({
          team_id: teamId,
          schueler_id: mitglied.id,
          rolle: index === 0 ? 'teamleiter' : 'mitglied'
        }));
        
        await trx('team_mitglieder').insert(teamMitglieder);
        
        // 3. Challenge erstellen
        const [challengeId] = await trx('challenges').insert({
          title: aufgabenpaket.title,
          beschreibung: aufgabenpaket.description,
          kategorie: aufgabenpaket.kategorie,
          icon: aufgabenpaket.icon,
          zusatzinfos: zusatzinfos || null,
          abgabedatum: abgabedatum || null,
          team_id: teamId,
          aufgabenpaket_id: aufgabenpaket_id,
        });
        
        challengeIds.push(challengeId);
      }
      
      // Alles erfolgreich - Commit
      await trx.commit();
      
      req.flash('success', `Erfolgreich ${teams.length} Team(s) mit Challenges erstellt!`);
      res.redirect('/challenges');
      
    } catch (error) {
      // Bei Fehler - Rollback
      await trx.rollback();
      console.error(' Datenbank-Fehler:', error);
      req.flash('error', 'Datenbank-Fehler: ' + error.message);
      res.redirect('/challenges/new');
    }
    
  } catch (error) {
    console.error(' Allgemeiner Fehler:', error);
    req.flash('error', 'Fehler beim Erstellen: ' + error.message);
    res.redirect('/challenges/new');
  }
});

// Challenge löschen
app.delete('/challenges/:id', async (req, res) => {
  try {
    const challengeId = parseInt(req.params.id);
    
    // TRANSACTION START - Alles oder nichts
    const trx = await db.transaction();
    
    try {
      // 1. Challenge finden (mit Team-ID)
      const challenge = await trx('challenges').where({ id: challengeId }).first();
      
      if (!challenge) {
        await trx.rollback();
        req.flash('error', 'Challenge nicht gefunden.');
        return res.redirect('/challenges');
      }
      
      const teamId = challenge.team_id;
      
      // 2. Challenge löschen
      await trx('challenges').where({ id: challengeId }).del();
      
      // 3. Team-Mitglieder löschen
      await trx('team_mitglieder').where({ team_id: teamId }).del();
      
      // 4. Team löschen
      await trx('teams').where({ id: teamId }).del();
      
      // Alles erfolgreich - Commit
      await trx.commit();
      
      req.flash('success', 'Challenge und Team erfolgreich gelöscht.');
      res.redirect('/challenges');
      
    } catch (error) {
      // Bei Fehler - Rollback
      await trx.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error(' Fehler beim Löschen:', error);
    req.flash('error', 'Fehler beim Löschen: ' + error.message);
    res.redirect('/challenges');
  }
});


// Challenge bearbeiten Formular
// Challenge bearbeiten Formular - KORRIGIERT
app.get('/challenges/:id/edit', async (req, res) => {
  try {
    // 1. Challenge mit allen notwendigen Joins laden
    const challenge = await db('challenges')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id')
      .where('challenges.id', req.params.id)
      .first();
    
    if (!challenge) {
      req.flash('error', 'Challenge nicht gefunden.');
      return res.redirect('/challenges');
    }
    
    // 2. Team-Mitglieder mit ihren IDs laden
    const teamMitglieder = await db('team_mitglieder')
      .where({ team_id: challenge.team_id })
      .select('schueler_id');
    
    const schuelerIds = teamMitglieder.map(m => m.schueler_id.toString()); // WICHTIG: als Strings
    
    // 3. Alle benötigten Daten für das Formular laden
    const aufgabenpakete = await db('aufgabenpakete').select('*').orderBy('title', 'asc');
    const schueler = await db('schueler')
      .leftJoin('klassen', 'schueler.klasse_id', 'klassen.id')
      .select('schueler.*', 'klassen.name as klasse_name')
      .orderBy('schueler.nachname', 'asc');
    
    // 4. ALLE Daten an das Template übergeben
    res.render('formChallenges', {
      item: {
        // Challenge Daten
        id: challenge.id,
        aufgabenpaket_id: challenge.aufgabenpaket_id,
        zusatzinfos: challenge.zusatzinfos,
        abgabedatum: challenge.abgabedatum, // ← JETZT WIRD DAS DATUM GELADEN
      
        
        // Team Daten
        team_name: challenge.name, // aus teams Tabelle
        team_beschreibung: challenge.beschreibung, // aus teams Tabelle
        
        // Schüler IDs als Array
        schueler_ids: schuelerIds // ← JETZT WERDEN DIE SCHÜLER GELADEN
      },
      aufgabenpakete,
      schueler,
      action: `/challenges/${challenge.id}?_method=PUT`,
      title: 'Challenge bearbeiten',
      activePage: 'challenges'
    });
    
  } catch (error) {
    console.error("Fehler beim Laden der Challenge:", error);
    req.flash('error', 'Fehler beim Laden der Challenge.');
    res.redirect('/challenges');
  }
});

// Challenge aktualisieren - KORRIGIERT
app.put('/challenges/:id', async (req, res) => {
  try {
    const { aufgabenpaket_id, team_name, team_beschreibung, schueler_ids, zusatzinfos, abgabedatum } = req.body;
    
    // Validierung
    if (!aufgabenpaket_id || !team_name || !schueler_ids) {
      req.flash('error', 'Aufgabenpaket, Team Name und Teammitglieder sind erforderlich.');
      return res.redirect(`/challenges/${req.params.id}/edit`);
    }
    
    // TRANSACTION START
    const trx = await db.transaction();
    
    try {
      // 1. Challenge finden
      const challenge = await trx('challenges').where({ id: req.params.id }).first();
      if (!challenge) {
        await trx.rollback();
        req.flash('error', 'Challenge nicht gefunden.');
        return res.redirect('/challenges');
      }
      
      // 2. Team aktualisieren
      await trx('teams').where({ id: challenge.team_id }).update({
        name: team_name,
        beschreibung: team_beschreibung || null
      });
      
      // 3. Alte Team-Mitglieder löschen
      await trx('team_mitglieder').where({ team_id: challenge.team_id }).del();
      
      // 4. Neue Team-Mitglieder hinzufügen
      const schuelerArray = Array.isArray(schueler_ids) ? schueler_ids : [schueler_ids];
      const teamMitglieder = schuelerArray.map((schuelerId, index) => ({
        team_id: challenge.team_id,
        schueler_id: parseInt(schuelerId),
        rolle: index === 0 ? 'teamleiter' : 'mitglied'
      }));
      
      await trx('team_mitglieder').insert(teamMitglieder);
      
      // 5. Challenge aktualisieren (MIT DATUM)
      await trx('challenges').where({ id: req.params.id }).update({
        aufgabenpaket_id: aufgabenpaket_id,
        zusatzinfos: zusatzinfos || null,
        abgabedatum: abgabedatum || null, // ← DATUM WIRD AKTUALISIERT
      
      });
      
      // Alles erfolgreich - Commit
      await trx.commit();
      
      req.flash('success', 'Challenge erfolgreich aktualisiert.');
      res.redirect('/challenges');
      
    } catch (error) {
      // Bei Fehler - Rollback
      await trx.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error(' Fehler:', error);
    req.flash('error', 'Fehler beim Aktualisieren: ' + error.message);
    res.redirect(`/challenges/${req.params.id}/edit`);
  }
});
// Weitere Routes für Bearbeiten, Löschen, Details...
// (Ähnlich wie bei Schüler/Aufgabenpakete)




// ----- SCHUELER ROUTES -----

// Schüler Übersicht
// Schüler Übersicht - MIT JOIN für Klassen-Namen
// Schüler Übersicht mit Filterung
app.get('/schueler', async (req, res) => {
  try {
    const { klasse, search } = req.query;
    
    let query = db('schueler')
      .leftJoin('klassen', 'schueler.klasse_id', 'klassen.id')
      .select(
        'schueler.*', 
        'klassen.name as klasse_name'
      );

    // Filter nach Klasse
    if (klasse && klasse !== 'alle') {
      query = query.where('klassen.name', klasse);
    }

    // Suche nach Namen
    if (search && search.length >= 2) {
      query = query.where(function() {
        this.where('schueler.vorname', 'like', `%${search}%`)
             .orWhere('schueler.nachname', 'like', `%${search}%`)
             .orWhere('klassen.name', 'like', `%${search}%`);
      });
    }

    const schueler = await query.orderBy('schueler.nachname', 'asc');
    
    // Alle Klassen für Filter-Dropdown
    const klassen = await db('klassen').select('*').orderBy('name', 'asc');

    res.render('schueler', { 
      schueler, 
      klassen,
      activeFilter: klasse || 'alle',
      searchTerm: search || '',
      activePage: 'schueler' 
    });
  } catch (error) {
    console.error("Fehler beim Laden der Schüler:", error);
    res.render('schueler', { 
      schueler: [], 
      klassen: [],
      activeFilter: 'alle',
      searchTerm: '',
      activePage: 'schueler' 
    });
  }
});


// Schüler Search API
app.get('/api/schueler/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    console.log(' Schüler-Suche:', searchTerm);

    if (!searchTerm || searchTerm.length < 2) {
      return res.json([]);
    }

    const schueler = await db('schueler')
      .leftJoin('klassen', 'schueler.klasse_id', 'klassen.id')
      .where('schueler.vorname', 'like', `%${searchTerm}%`)
      .orWhere('schueler.nachname', 'like', `%${searchTerm}%`)
      .orWhere('klassen.name', 'like', `%${searchTerm}%`)
      .select(
        'schueler.*',
        'klassen.name as klasse_name'
      )
      .limit(10);

    res.json(schueler);

  } catch (error) {
    console.error("Schüler Search error:", error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Neuer Schüler Formular
app.get('/schueler/new', async (req, res) => {
  const klassen = await db('klassen').select('*').orderBy('name', 'asc');
  res.render('formSchueler', {
    item: {},
    klassen,
    action: '/schueler',
    title: 'Neuen Schüler anlegen',
    activePage: 'schueler'
  });
});

// Schüler speichern
app.post('/schueler', async (req, res) => {
  const { vorname, nachname, klasse_id } = req.body;
  
  if (!vorname || !nachname) {
    req.flash('error', 'Vorname und Nachname sind Pflichtfelder.');
    return res.redirect('/schueler/new');
  }
  
  await db('schueler').insert({
    vorname: vorname.trim(),
    nachname: nachname.trim(),
    klasse_id: klasse_id || null
  });
  
  req.flash('success', 'Schüler erfolgreich angelegt.');
  res.redirect('/schueler');
});

// Schüler bearbeiten Formular
app.get('/schueler/:id/edit', async (req, res) => {
  try {
    const schueler = await db('schueler').where({ id: req.params.id }).first();
    const klassen = await db('klassen').select('*').orderBy('name', 'asc');
    
    if (!schueler) {
      req.flash('error', 'Schüler nicht gefunden.');
      return res.redirect('/schueler');
    }
    
    res.render('formSchueler', {
      item: schueler,
      klassen,
      action: `/schueler/${schueler.id}?_method=PUT`,
      method: 'POST',
      title: 'Schüler bearbeiten',
      activePage: 'schueler'
    });
  } catch (error) {
    console.error("Fehler:", error);
    req.flash('error', 'Fehler beim Laden des Schülers.');
    res.redirect('/schueler');
  }
});

// Schüler aktualisieren
app.put('/schueler/:id', async (req, res) => {
  const { vorname, nachname, klasse_id } = req.body;
  
  await db('schueler').where({ id: req.params.id }).update({
    vorname: vorname.trim(),
    nachname: nachname.trim(),
    klasse_id: klasse_id || null
  });
  
  req.flash('success', 'Änderungen gespeichert.');
  res.redirect('/schueler');
});

// Schüler löschen
app.delete('/schueler/:id', async (req, res) => {
  await db('schueler').where({ id: req.params.id }).del();
  req.flash('success', 'Schüler erfolgreich gelöscht.');
  res.redirect('/schueler');
});





// Datensatz aus Datenbank
// ----- AUFGABENPAKETE ROUTES MIT LIVE-FILTERING -----

// Aufgabenpakete Übersicht mit Filterung
app.get('/aufgabenpakete', async (req, res) => {
  try {
    const { kategorie, search } = req.query;
    
    let query = db('aufgabenpakete').select('*');

    // Filter nach Kategorie
    if (kategorie && kategorie !== 'alle') {
      query = query.where('kategorie', kategorie);
    }

    // Suche nach Titel/Beschreibung
    if (search && search.length >= 2) {
      query = query.where(function() {
        this.where('title', 'like', `%${search}%`)
             .orWhere('description', 'like', `%${search}%`)
             .orWhere('kategorie', 'like', `%${search}%`);
      });
    }

    const aufgabenpakete = await query.orderBy('title', 'asc');
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    res.render('aufgabenpakete', {
      aufgabenpakete: aufgabenpakete,
      kategorien: kategorien,
      activeKategorie: kategorie || 'alle',
      searchTerm: search || '',
      activePage: 'aufgabenpakete'
    });
  } catch (error) {
    console.error("Fehler beim Laden der aufgabenpakete:", error);
    res.render('aufgabenpakete', {
      aufgabenpakete: [],
      kategorien: [],
      activeKategorie: 'alle',
      searchTerm: '',
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