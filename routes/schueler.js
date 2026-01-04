const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireLehrer } = require('../middleware/auth');

// Schüler Übersicht mit Filterung - VOLLSTÄNDIG KORRIGIERT
router.get('/', requireAuth, requireLehrer, async (req, res) => {
  try {
    const { klasse, schuljahr, search } = req.query;

    let query = db('users')
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')  // users statt schueler
      .leftJoin('schuljahre', 'users.schuljahr_id', 'schuljahre.id')  //  users statt schueler
      .where('users.user_role_id', 1)
      .select(
        'users.*',  // users statt schueler
        'klassen.name as klasse_name',
        'schuljahre.name as schuljahr_name'
      );

    // Filter nach Klasse
    if (klasse && klasse !== 'alle') {
      query = query.where('klassen.name', klasse);
    }

    if (schuljahr && schuljahr !== 'alle') {
      query = query.where('schuljahre.id', schuljahr); //  'name' durch 'id' ersetzen
    }

    // Suche nach Namen 
    if (search) {
      query = query.where(function () {
        this.where('users.vorname', 'like', `%${search}%`)  //  users statt schueler
          .orWhere('users.nachname', 'like', `%${search}%`)  //  users statt schueler
          .orWhere('klassen.name', 'like', `%${search}%`)
          .orWhere('schuljahre.name', 'like', `%${search}%`);
      });
    }

    const schueler = await query.orderBy('users.nachname', 'asc');  // users statt schueler

    // Alle Klassen für Filter-Dropdown
    const klassen = await db('klassen').select('*').orderBy('name', 'asc');
    // Alle Schuljahre für Filter-Dropdown
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    res.render('admin/personen/schueler', {
      schueler,
      klassen,
      schuljahre,
      activeKlasse: klasse || 'alle',
      activeSchuljahr: schuljahr || 'alle',
      searchTerm: search || '',
      activePage: 'schueler'
    });
  } catch (error) {
    console.error("Fehler beim Laden der Schüler:", error);
    res.render('admin/personen/schueler', {
      schueler: [],
      klassen: [],
      schuljahre: [],
      activeKlasse: 'alle',
      activeSchuljahr: 'alle',
      searchTerm: '',
      activePage: 'schueler'
    });
  }
});

// Neuer Schüler Formular
router.get('/new', requireAuth, requireLehrer, async (req, res) => {
  const klassen = await db('klassen').select('*').orderBy('name', 'asc');
  const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');
  res.render('admin/personen/formSchueler', {
    item: {},
    klassen,
    schuljahre,
    action: '/schueler',
    title: 'Neuen Schüler anlegen',
    activePage: 'schueler'
  });
});

// Schüler speichern
router.post('/', requireAuth, requireLehrer, async (req, res) => {
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
    user_role_id: 1 // Immer als Schüler anlegen
  });

  req.flash('success', 'Schüler erfolgreich angelegt.');
  res.redirect('/schueler');
});

// Schüler bearbeiten Formular
router.get('/:id/edit', requireAuth, requireLehrer, async (req, res) => {
  try {
    const schueler = await db('users')
      .where({
        id: req.params.id,
        user_role_id: 1 // Nur Schüler bearbeiten dürfen
      })
      .first();

    if (!schueler) {
      req.flash('error', 'Schüler nicht gefunden.');
      return res.redirect('/schueler');
    }

    const klassen = await db('klassen').select('*').orderBy('name', 'asc');
    const schuljahre = await db('schuljahre').orderBy('startjahr', 'desc');

    res.render('admin/personen/formSchueler', {
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
router.put('/:id', requireAuth, requireLehrer, async (req, res) => {
  const { vorname, nachname, klasse_id, schuljahr_id } = req.body;

  if (!vorname || !nachname || !schuljahr_id) {
    req.flash('error', 'Vorname, Nachname und Schuljahr sind Pflichtfelder.');
    return res.redirect(`/schueler/${req.params.id}/edit`);
  }

  try {
    await db('users')
      .where({
        id: req.params.id,
        user_role_id: 1 // Sicherstellen, dass nur Schüler aktualisiert werden
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

// routes/schueler.js - KORRIGIERTER DELETE CONTROLLER

// routes/schueler.js - Fügen Sie DIESEN BLOCK hinzu oder überprüfen Sie ihn

router.delete('/:id', requireAuth, requireLehrer, async (req, res) => {
    const userId = req.params.id;
    const trx = await db.transaction();

    try {
        // 1. Abhängigkeiten auflösen: TEAM-Mitgliedschaften löschen
        await trx('team_mitglieder')
            .where('user_id', userId)
            .del();
        
        // 2. LÖSCHE DEN USER (Schüler)
        const deletedRows = await trx('users')
            .where({
                id: userId,
                user_role_id: 1
            })
            .del();

        if (deletedRows === 0) {
            await trx.rollback();
            req.flash('error', 'Schüler nicht gefunden.');
            return res.redirect('/schueler');
        }

        await trx.commit();
        req.flash('success', ` Schüler ${userId} erfolgreich und sauber gelöscht.`);
        res.redirect('/schueler');

    } catch (error) {
        await trx.rollback();
        console.error(' Fehler beim Löschen des Schülers:', error);
        
        let errorMessage = 'Fehler beim Löschen aufgetreten.';
        if (error.code === 'SQLITE_CONSTRAINT' || error.errno === 1451) {
            errorMessage = 'Der Schüler kann nicht gelöscht werden, da er noch in einer Abgabe oder Challenge als Urheber referenziert wird.';
        }
        
        req.flash('error', errorMessage);
        res.redirect('/schueler');
    }
});

module.exports = router;