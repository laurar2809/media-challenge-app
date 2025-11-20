const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Schüler Übersicht mit Filterung
router.get('/', async (req, res) => {
  try {
    const { klasse, schuljahr, search } = req.query; // ✅ schuljahr hinzugefügt
    
    let query = db('schueler')
      .leftJoin('klassen', 'schueler.klasse_id', 'klassen.id')
      .leftJoin('schuljahre', 'schueler.schuljahr_id', 'schuljahre.id')
      .select(
        'schueler.*', 
        'klassen.name as klasse_name',
        'schuljahre.name as schuljahr_name'
      );

    // Filter nach Klasse
    if (klasse && klasse !== 'alle') {
      query = query.where('klassen.name', klasse);
    }

    // ✅ NEU: Filter nach Schuljahr
    if (schuljahr && schuljahr !== 'alle') {
      query = query.where('schuljahre.name', schuljahr);
    }

    // Suche nach Namen
    if (search && search.length >= 2) {
      query = query.where(function() {
        this.where('schueler.vorname', 'like', `%${search}%`)
             .orWhere('schueler.nachname', 'like', `%${search}%`)
             .orWhere('klassen.name', 'like', `%${search}%`)
             .orWhere('schuljahre.name', 'like', `%${search}%`);
      });
    }

    const schueler = await query.orderBy('schueler.nachname', 'asc');
    
    // Alle Klassen für Filter-Dropdown
    const klassen = await db('klassen').select('*').orderBy('name', 'asc');
    // ✅ NEU: Alle Schuljahre für Filter-Dropdown
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    res.render('schueler', { 
      schueler, 
      klassen,
      schuljahre, // ✅ NEU
      activeKlasseFilter: klasse || 'alle', // ✅ Umbenannt
      activeSchuljahrFilter: schuljahr || 'alle', // ✅ NEU
      searchTerm: search || '',
      activePage: 'schueler' 
    });
  } catch (error) {
    console.error("Fehler beim Laden der Schüler:", error);
    res.render('schueler', { 
      schueler: [], 
      klassen: [],
      schuljahre: [], // ✅ NEU
      activeKlasseFilter: 'alle',
      activeSchuljahrFilter: 'alle', // ✅ NEU
      searchTerm: '',
      activePage: 'schueler' 
    });
  }
});

// Neuer Schüler Formular
router.get('/new', async (req, res) => {
  const klassen = await db('klassen').select('*').orderBy('name', 'asc');
const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');
  res.render('formSchueler', {
    item: {},
    klassen,
    schuljahre,
    action: '/schueler',
    title: 'Neuen Schüler anlegen',
    activePage: 'schueler'
  });
});

// Schüler speichern
router.post('/', async (req, res) => {
  const { vorname, nachname, klasse_id, schuljahr_id } = req.body;
  
  if (!vorname || !nachname || !schuljahr_id) {
    req.flash('error', 'Vorname, Nachname und Schuljahr sind Pflichtfelder.');
    return res.redirect('/schueler/new');
  }
  
  await db('schueler').insert({
    vorname: vorname.trim(),
    nachname: nachname.trim(),
    klasse_id: klasse_id || null,
    schuljahr_id: schuljahr_id
  });
  
  req.flash('success', 'Schüler erfolgreich angelegt.');
  res.redirect('/schueler');
});

// Schüler bearbeiten Formular
router.get('/:id/edit', async (req, res) => {
  try {
    const schueler = await db('schueler').where({ id: req.params.id }).first();
    const klassen = await db('klassen').select('*').orderBy('name', 'asc');
   const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    if (!schueler) {
      req.flash('error', 'Schüler nicht gefunden.');
      return res.redirect('/schueler');
    }
    
    res.render('formSchueler', {
      item: schueler,
      klassen,
      schuljahre,
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
router.put('/:id', async (req, res) => {
  const { vorname, nachname, klasse_id, schuljahr_id } = req.body;
  
  if (!vorname || !nachname || !schuljahr_id) {
    req.flash('error', 'Vorname, Nachname und Schuljahr sind Pflichtfelder.');
    return res.redirect(`/schueler/${req.params.id}/edit`);
  }
  
  try {
    await db('schueler').where({ id: req.params.id }).update({
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      klasse_id: klasse_id || null,
      schuljahr_id: schuljahr_id
    });
    
    req.flash('success', 'Änderungen gespeichert.');
    res.redirect('/schueler');
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Schülers:", error);
    req.flash('error', 'Fehler beim Aktualisieren des Schülers.');
    res.redirect(`/schueler/${req.params.id}/edit`);
  }
});

// Schüler löschen
router.delete('/:id', async (req, res) => {
  await db('schueler').where({ id: req.params.id }).del();
  req.flash('success', 'Schüler erfolgreich gelöscht.');
  res.redirect('/schueler');
});

module.exports = router;