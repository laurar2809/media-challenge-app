const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Lehrer Übersicht mit Filterung
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = db('users')
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
      .leftJoin('schuljahre', 'users.schuljahr_id', 'schuljahre.id')
      .where('users.user_role_id', 2) // Nur Lehrer anzeigen (role_id = 2)
      .select(
        'users.*', 
        'klassen.name as klasse_name',
        'schuljahre.name as schuljahr_name'
      );

    // Suche nach Namen
    if (search && search.length >= 2) {
      query = query.where(function() {
        this.where('users.vorname', 'like', `%${search}%`)
             .orWhere('users.nachname', 'like', `%${search}%`)
             .orWhere('klassen.name', 'like', `%${search}%`)
             .orWhere('schuljahre.name', 'like', `%${search}%`);
      });
    }

    const lehrer = await query.orderBy('users.nachname', 'asc');
    
    // Alle Klassen für Filter-Dropdown
    const klassen = await db('klassen').select('*').orderBy('name', 'asc');
    // Alle Schuljahre für Filter-Dropdown
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    res.render('lehrer', { 
      lehrer, 
      klassen,
      schuljahre,
      searchTerm: search || '',
      activePage: 'lehrer' 
    });
  } catch (error) {
    console.error("Fehler beim Laden der Lehrer:", error);
    res.render('lehrer', { 
      lehrer: [], 
      klassen: [],
      schuljahre: [],
      searchTerm: '',
      activePage: 'lehrer' 
    });
  }
});

// Neuer Lehrer Formular
router.get('/new', async (req, res) => {
  const klassen = await db('klassen').select('*').orderBy('name', 'asc');
  const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');
  res.render('formLehrer', {
    item: {},
    klassen,
    schuljahre,
    action: '/lehrer',
    title: 'Neuen Lehrer anlegen',
    activePage: 'lehrer'
  });
});

// Lehrer speichern
router.post('/', async (req, res) => {
  const { vorname, nachname, klasse_id, schuljahr_id } = req.body;
  
  if (!vorname || !nachname) {
    req.flash('error', 'Vorname und Nachname sind Pflichtfelder.');
    return res.redirect('/lehrer/new');
  }
  
  await db('users').insert({
    vorname: vorname.trim(),
    nachname: nachname.trim(),
    klasse_id: klasse_id || null,
    schuljahr_id: schuljahr_id || null,
    user_role_id: 2 // Immer als Lehrer anlegen
  });
  
  req.flash('success', 'Lehrer erfolgreich angelegt.');
  res.redirect('/lehrer');
});

// Lehrer bearbeiten Formular
router.get('/:id/edit', async (req, res) => {
  try {
    const lehrer = await db('users')
      .where({ 
        id: req.params.id,
        user_role_id: 2 // Nur Lehrer bearbeiten dürfen
      })
      .first();

    if (!lehrer) {
      req.flash('error', 'Lehrer nicht gefunden.');
      return res.redirect('/lehrer');
    }
    
    const klassen = await db('klassen').select('*').orderBy('name', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    res.render('formLehrer', {
      item: lehrer,
      klassen,
      schuljahre,
      action: `/lehrer/${lehrer.id}?_method=PUT`,
      method: 'POST',
      title: 'Lehrer bearbeiten',
      activePage: 'lehrer'
    });
  } catch (error) {
    console.error("Fehler:", error);
    req.flash('error', 'Fehler beim Laden des Lehrers.');
    res.redirect('/lehrer');
  }
});

// Lehrer aktualisieren
router.put('/:id', async (req, res) => {
  const { vorname, nachname, klasse_id, schuljahr_id } = req.body;
  
  if (!vorname || !nachname) {
    req.flash('error', 'Vorname und Nachname sind Pflichtfelder.');
    return res.redirect(`/lehrer/${req.params.id}/edit`);
  }
  
  try {
    await db('users')
      .where({ 
        id: req.params.id,
        user_role_id: 2 // Sicherstellen, dass nur Lehrer aktualisiert werden
      })
      .update({
        vorname: vorname.trim(),
        nachname: nachname.trim(),
        klasse_id: klasse_id || null,
        schuljahr_id: schuljahr_id || null
      });
    
    req.flash('success', 'Änderungen gespeichert.');
    res.redirect('/lehrer');
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Lehrers:", error);
    req.flash('error', 'Fehler beim Aktualisieren des Lehrers.');
    res.redirect(`/lehrer/${req.params.id}/edit`);
  }
});

// Lehrer löschen
router.delete('/:id', async (req, res) => {
  await db('users')
    .where({ 
      id: req.params.id,
      user_role_id: 2 // Nur Lehrer löschen dürfen
    })
    .del();
    
  req.flash('success', 'Lehrer erfolgreich gelöscht.');
  res.redirect('/lehrer');
});

module.exports = router;