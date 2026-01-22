// routes/teams.js

const express = require('express');
const router = express.Router();
const { requireAuth, requireLehrer } = require('../middleware/auth'); // Brauchen wir für die Sicherheit
const { db } = require('../db'); // Direkter DB-Import

router.get('/', requireAuth, requireLehrer, async (req, res) => {
    try {
        const { klasse, schuljahr, search } = req.query;

        // Basis-Daten für Dropdowns
        const klassen = await db('klassen').orderBy('name');
        const schuljahre = await db('schuljahre').orderBy('name');

        // In routes/teams.js
        const schueler = await db('users')
            .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
            .leftJoin('user_roles', 'users.user_role_id', 'user_roles.id')
            .where('user_roles.rolle', 'Schüler')
            .select(
                'users.id',
                'users.vorname',
                'users.nachname',
                'klassen.name as klasse_name', // Dieser Name muss fix sein!
                'users.schuljahr_id'
            );
        // TEAMS-QUERY MIT SUCHE
        let teamsQuery = db('teams')
            .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.team_id')
            .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
            .leftJoin('schuljahre', 'teams.schuljahr_id', 'schuljahre.id');

        if (search) {
            teamsQuery.where(builder => {
                builder.where('teams.name', 'like', `%${search}%`)
                    .orWhere('users.vorname', 'like', `%${search}%`)
                    .orWhere('users.nachname', 'like', `%${search}%`);
            });
        }

        const teams = await teamsQuery
            .select(
                'teams.id',
                'teams.name',
                'schuljahre.name as schuljahr_name',
                db.raw('COUNT(DISTINCT team_mitglieder.user_id) as mitglieder_count'),
                db.raw("GROUP_CONCAT(DISTINCT CONCAT(users.vorname, ' ', users.nachname) SEPARATOR ', ') as mitglieder_liste")
            )
            .groupBy('teams.id', 'teams.name', 'schuljahre.name');

        res.render('admin/personen/teams', {
            schueler,
            teams,
            klassen,
            schuljahre,
            activeKlasse: klasse || 'alle',
            activeSchuljahr: schuljahr || 'alle',
            searchTerm: search || '', // Suchbegriff zurück an EJS geben
            title: 'Team Übersicht',
            activePage: 'teams'
        });
    } catch (error) {
        console.error('Teams Fehler:', error);
        res.redirect('/teams');
    }
});



router.post('/', requireAuth, requireLehrer, async (req, res) => {
    const { name, members } = req.body;

    try {
        const [insertId] = await db('teams').insert({ name });
        // Falls dein DB-Treiber ein Objekt zurückgibt, nutzt man insertId
        const teamId = insertId;

        for (const member of members) {
            await db('team_mitglieder').insert({
                team_id: teamId, // Spaltenname aus SQL
                user_id: member.id, // Spaltenname aus SQL
                rolle: 'mitglied'
            }).catch(err => {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.log(`User ${member.id} schon im Team`);
                }
            });
        }

        res.json({
            success: true,
            teamId: teamId, // Konsistent zum Variablennamen oben
            name,
            message: `"${name}" (${members.length} Mitglieder) gespeichert!`
        });
    } catch (error) {
        console.error('Team POST Fehler:', error);
        res.status(500).json({ error: error.message });
    }
});



module.exports = router;