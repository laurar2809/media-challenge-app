const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Schüler Übersicht mit Filterung - VOLLSTÄNDIG KORRIGIERT
router.get('/', async (req, res) => {
  try {
    const { klasse, schuljahr, search } = req.query;

    let query = db('users')
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')  // ✅ users statt schueler
      .leftJoin('schuljahre', 'users.schuljahr_id', 'schuljahre.id')  // ✅ users statt schueler
      .where('users.user_role_id', 1)
      .select(
        'users.*',  // ✅ users statt schueler
        'klassen.name as klasse_name',
        'schuljahre.name as schuljahr_name'
      );

    // Filter nach Klasse
    if (klasse && klasse !== 'alle') {
      query = query.where('klassen.name', klasse);
    }

    if (schuljahr && schuljahr !== 'alle') {
      query = query.where('schuljahre.id', schuljahr); // ✅ 'name' durch 'id' ersetzen
    }

    // Suche nach Namen 
    if (search) {
      query = query.where(function () {
        this.where('users.vorname', 'like', `%${search}%`)  // ✅ users statt schueler
          .orWhere('users.nachname', 'like', `%${search}%`)  // ✅ users statt schueler
          .orWhere('klassen.name', 'like', `%${search}%`)
          .orWhere('schuljahre.name', 'like', `%${search}%`);
      });
    }

    const schueler = await query.orderBy('users.nachname', 'asc');  // ✅ users statt schueler

    // Alle Klassen für Filter-Dropdown
    const klassen = await db('klassen').select('*').orderBy('name', 'asc');
    // Alle Schuljahre für Filter-Dropdown
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    res.render('schueler', {
      schueler,
      klassen,
      schuljahre,
      activeKlasseFilter: klasse || 'alle',
      activeSchuljahrFilter: schuljahr || 'alle',
      searchTerm: search || '',
      activePage: 'schueler'
    });
  } catch (error) {
    console.error("Fehler beim Laden der Schüler:", error);
    res.render('schueler', {
      schueler: [],
      klassen: [],
      schuljahre: [],
      activeKlasseFilter: 'alle',
      activeSchuljahrFilter: 'alle',
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

  await db('users').insert({
    vorname: vorname.trim(),
    nachname: nachname.trim(),
    klasse_id: klasse_id || null,
    schuljahr_id: schuljahr_id,
    user_role_id: 1 // ✅ Immer als Schüler anlegen
  });

  req.flash('success', 'Schüler erfolgreich angelegt.');
  res.redirect('/schueler');
});

// Schüler bearbeiten Formular
router.get('/:id/edit', async (req, res) => {
  try {
    const schueler = await db('users')
      .where({
        id: req.params.id,
        user_role_id: 1 // ✅ Nur Schüler bearbeiten dürfen
      })
      .first();

    if (!schueler) {
      req.flash('error', 'Schüler nicht gefunden.');
      return res.redirect('/schueler');
    }

    const klassen = await db('klassen').select('*').orderBy('name', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

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
    await db('users')
      .where({
        id: req.params.id,
        user_role_id: 1 // ✅ Sicherstellen, dass nur Schüler aktualisiert werden
      })
      .update({
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
  await db('users')
    .where({
      id: req.params.id,
      user_role_id: 1 // ✅ Nur Schüler löschen dürfen
    })
    .del();

  req.flash('success', 'Schüler erfolgreich gelöscht.');
  res.redirect('/schueler');
});

module.exports = router;