const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireLehrer } = require('../middleware/auth');

// Lehrer Übersicht - NUR Vorname und Nachname
router.get('/', requireAuth, requireLehrer , async (req, res) => {
  try {
    const { search } = req.query;

    let query = db('users')
      .leftJoin('user_roles', 'users.user_role_id', 'user_roles.id')
      .where('users.user_role_id', 2); // Nur Lehrer (role_id = 2)

    // Suche
    if (search && search.length >= 2) {
      query = query.where(function () {
        this.where('users.vorname', 'like', `%${search}%`)
          .orWhere('users.nachname', 'like', `%${search}%`);
      });
    }

    const lehrer = await query
      .select(
        'users.id',
        'users.vorname',
        'users.nachname',
        'user_roles.rolle'
      )
      .orderBy('users.nachname', 'asc')
      .orderBy('users.vorname', 'asc');

    res.render('admin/personen/lehrer', {
      lehrer,
      searchTerm: search || '',
      activePage: 'lehrer'
    });

  } catch (error) {
    console.error("Fehler beim Laden der Lehrer:", error);
    req.flash('error', 'Fehler beim Laden der Lehrerliste');
    res.redirect('/');
  }
});

// Neuer Lehrer Formular
router.get('/new',requireAuth, requireLehrer , async (req, res) => {
  res.render('admin/personen/lehrerForm', {
    item: {},
    action: '/lehrer',
    title: 'Neuen Lehrer anlegen',
    activePage: 'lehrer'
  });
});

// Lehrer speichern
router.post('/',requireAuth, requireLehrer , async (req, res) => {
  const { vorname, nachname } = req.body;

  if (!vorname || !nachname) {
    req.flash('error', 'Vorname und Nachname sind Pflichtfelder.');
    return res.redirect('/lehrer/new');
  }

  await db('users').insert({
    vorname: vorname.trim(),
    nachname: nachname.trim(),
    user_role_id: 2 // Lehrer-Rolle
  });

  req.flash('success', 'Lehrer erfolgreich angelegt.');
  res.redirect('/lehrer');
});

// Lehrer bearbeiten Formular
router.get('/:id/edit',requireAuth, requireLehrer , async (req, res) => {
  try {
    const lehrer = await db('users')
      .where({
        id: req.params.id,
        user_role_id: 2 // Nur Lehrer
      })
      .first();

    if (!lehrer) {
      req.flash('error', 'Lehrer nicht gefunden.');
      return res.redirect('/lehrer');
    }

    res.render('admin/personen/lehrerForm', {
      item: lehrer,
      action: `/lehrer/${lehrer.id}?_method=PUT`,
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
router.put('/:id', requireAuth, requireLehrer ,async (req, res) => {
  const { vorname, nachname } = req.body;

  if (!vorname || !nachname) {
    req.flash('error', 'Vorname und Nachname sind Pflichtfelder.');
    return res.redirect(`/lehrer/${req.params.id}/edit`);
  }

  try {
    await db('users')
      .where({
        id: req.params.id,
        user_role_id: 2 // Nur Lehrer aktualisieren
      })
      .update({
        vorname: vorname.trim(),
        nachname: nachname.trim()
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
router.delete('/:id',requireAuth, requireLehrer , async (req, res) => {
  await db('users')
    .where({
      id: req.params.id,
      user_role_id: 2 // Nur Lehrer löschen
    })
    .del();

  req.flash('success', 'Lehrer erfolgreich gelöscht.');
  res.redirect('/lehrer');
});

module.exports = router;