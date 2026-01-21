// routes/teams.js

const express = require('express');
const router = express.Router();
const { requireAuth, requireLehrer } = require('../middleware/auth'); // Brauchen wir für die Sicherheit
const { db } = require('../db'); // Direkter DB-Import

router.get('/', requireAuth, requireLehrer, async (req, res) => {
    try {
        const { klasse, schuljahr, search } = req.query;
        
        const [klassen, schuljahre] = await Promise.all([
            db('klassen').select('id', 'name').orderBy('name'),
            db('schuljahre').select('id', 'name').orderBy('name', 'desc')
        ]);

        //  ERWEITERTE SUCHE: Teams + Mitglieder
        let teamsQuery;
        if (search && search.trim()) {
            // Suche in Team-Namen UND Mitglieder-Namen
            teamsQuery = db('teams')
                .leftJoin('schuljahre', 'teams.schuljahr_id', 'schuljahre.id')
                .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.team_id')
                .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
                .leftJoin('klassen as u_klassen', 'users.klasse_id', 'u_klassen.id')
                .where((qb) => {
                    qb.where('teams.name', 'like', `%${search}%`)
                      .orWhere('users.vorname', 'like', `%${search}%`)
                      .orWhere('users.nachname', 'like', `%${search}%`)
                      .orWhere('u_klassen.name', 'like', `%${search}%`);
                })
                .select(
                    'teams.id',
                    'teams.name',
                    'schuljahre.name as schuljahr_name',
                    db.raw('COUNT(DISTINCT team_mitglieder.id) as mitglieder_count')
                )
                .groupBy('teams.id', 'teams.name', 'schuljahre.name')
                .orderBy('teams.name');
        } else {
            // Normale Abfrage ohne Suche
            teamsQuery = db('teams')
                .leftJoin('schuljahre', 'teams.schuljahr_id', 'schuljahre.id')
                .select('teams.id', 'teams.name', 'schuljahre.name as schuljahr_name')
                .orderBy('teams.name');
        }

        // Filter hinzufügen
        if (schuljahr && schuljahr !== 'alle') {
            const sjId = schuljahre.find(s => s.name === schuljahr)?.id;
            if (sjId) teamsQuery.where('teams.schuljahr_id', sjId);
        }

        const teamsRaw = await teamsQuery;

        // Mitglieder laden (für gefundene Teams)
        const teamsWithMembers = await Promise.all(teamsRaw.map(async (team) => {
            const mitglieder = await db('team_mitglieder')
                .join('users', 'team_mitglieder.user_id', 'users.id')
                .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
                .where('team_mitglieder.team_id', team.id)
                .select('users.vorname', 'users.nachname', 'klassen.name as klasse_name');

            // Klasse-Filter nachladen
            if (klasse && klasse !== 'alle') {
                mitglieder = mitglieder.filter(m => m.klasse_name === klasse);
            }

            team.mitglieder = mitglieder;
            team.mitglieder_count = mitglieder.length;
            return team;
        }));

        res.render('admin/personen/teams', {
            title: 'Team Übersicht',
            activePage: 'teams',
            teams: teamsWithMembers,
            klassen, schuljahre,
            activeKlasse: klasse || 'alle',
            activeSchuljahr: schuljahr || 'alle',
            searchTerm: search || ''
        });
    } catch (error) {
        console.error('Teams Suche Fehler:', error);
        req.flash('error', 'Suche fehlgeschlagen.');
        res.redirect('/teams');
    }
});




module.exports = router;