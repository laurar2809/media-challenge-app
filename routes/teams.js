// routes/teams.js

const express = require('express');
const router = express.Router();
const { requireAuth, requireLehrer } = require('../middleware/auth'); // Brauchen wir für die Sicherheit
const { db } = require('../db'); // Direkter DB-Import

router.get('/', requireAuth, requireLehrer, async (req, res) => {
  try {
    const teams = await db('teams')
      .leftJoin('schuljahre', 'teams.schuljahr_id', 'schuljahre.id')  // <-- schuljahrid!
      .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.teamid')  // teamid!
      .leftJoin('users', 'team_mitglieder.user_id', 'users.id')  // userid!
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')  // klasseid!
      .select(
        'teams.id',
        'teams.name',
        'schuljahre.name as schuljahr_name',
        db.raw('COUNT(DISTINCT team_mitglieder.id) as mitglieder_count'),
        db.raw('GROUP_CONCAT(DISTINCT CONCAT(users.vorname, " ", users.nachname, " (", COALESCE(klassen.name, "N/A"), ")") SEPARATOR ", ") as mitglieder')
      )
      .groupBy('teams.id', 'teams.name', 'schuljahre.id')
      .orderBy('teams.name');

    const schuljahre = await db('schuljahre').select('id', 'name');
    const kategorien = await db('categories').select('id', 'title');

    console.log('Teams geladen:', teams.length); // DEBUG

    res.render('admin/personen/teams', {
      teams,
      schuljahre,
      kategorien,
      activeSchuljahr: req.query.schuljahr || '',
      activeKategorie: req.query.kategorie || '',
      searchTerm: req.query.search || ''
    });
  } catch (error) {
    console.error('Teams Error:', error);
    res.status(500).redirect('/');
  }
});


module.exports = router;