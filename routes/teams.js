// routes/teams.js

const express = require('express');
const router = express.Router();
const { requireAuth, requireLehrer } = require('../middleware/auth'); // Brauchen wir für die Sicherheit
const { db } = require('../db'); // Direkter DB-Import

router.get('/', requireAuth, requireLehrer, async (req, res) => {
  try {
    // Filter-Params
    const { klasse, schuljahr, search } = req.query;

    // Queries (wie schueler.js – wiederverwendbar)
    const klassen = await db('klassen').orderBy('name');
    const schuljahre = await db('schuljahre').orderBy('name');
    
    let schuelerQuery = db('users')
      .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
      .leftJoin('user_roles', 'users.user_role_id', 'user_roles.id')
      .where('user_roles.rolle', 'Schüler');

    // Filter anwenden (wie Challenges)
    if (klasse && klasse !== 'alle') schuelerQuery.where('klassen.id', klasse);
    if (schuljahr && schuljahr !== 'alle') schuelerQuery.where('users.schuljahr_id', schuljahr);
    if (search) schuelerQuery.where('users.vorname', 'like', `%${search}%`).orWhere('users.nachname', 'like', `%${search}%`);

    const schueler = await schuelerQuery.select(
      'users.id as id',
      'users.vorname',
      'users.nachname',
      'klassen.name as klasse'
    );

    const teams = await db('teams');

    console.log(` ${schueler.length} Schüler, ${teams.length} Teams geladen`);

    res.render('admin/personen/teams', {
      schueler,
      teams,
      klassen,
      schuljahre,
      activeKlasse: klasse || 'alle',
      activeSchuljahr: schuljahr || 'alle',
      searchTerm: search || '',
      title: 'Team Übersicht',
      activePage: 'teams'
    });
  } catch (error) {
    console.error('Teams Fehler:', error);
    req.flash('error', 'Laden fehlgeschlagen');
    res.redirect('/teams');
  }
});



router.post('/', async (req, res) => {
    const { name, members } = req.body;

    try {
        // Neues Team
        const [teamResult] = await db('teams').insert({ name });
        const teamId = teamResult.insertId;

        // Bestehende teammitglieder prüfen (unique!)
        for (const member of members) {
            await db('teammitglieder').insert({
                teamid: teamId,
                userid: member.id,
                rolle: 'mitglied'  // Default
            }).catch(err => {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.log(`User ${member.id} schon in Team`);
                }
            });
        }

        res.json({
            success: true,
            teamId,
            name,
            message: `"${name}" (${members.length} Mitglieder) gespeichert!`
        });
    } catch (error) {
        console.error('Team POST Fehler:', error);
        res.status(500).json({ error: error.message });
    }
});



module.exports = router;