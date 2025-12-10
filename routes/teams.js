// routes/teams.js

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth'); // Brauchen wir für die Sicherheit
const { db } = require('../db'); // Direkter DB-Import

// Teams Übersicht (Nur für Lehrer/Admin zugänglich)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        console.log('Zugriff auf Team Übersicht durch Admin/Lehrer.');

        // 1. Alle Teams laden
        const teamsRaw = await db('teams')
            .leftJoin('schuljahre', 'teams.schuljahr_id', 'schuljahre.id')
            .select('teams.id', 'teams.name', 'schuljahre.name as schuljahr_name')
            .orderBy('teams.name', 'asc');

        // 2. Mitglieder für jedes Team laden
        const teamsWithMembers = await Promise.all(
            teamsRaw.map(async (team) => {
                const mitglieder = await db('team_mitglieder')
                    .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
                    .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
                    .where('team_mitglieder.team_id', team.id)
                    .select(
                        'users.vorname',
                        'users.nachname',
                        'klassen.name as klasse_name',
                        'team_mitglieder.rolle'
                    );

                team.mitglieder = mitglieder;
                team.mitglieder_count = mitglieder.length;
                return team;
            })
        );

        res.render('teams', {
            title: 'Team Übersicht',
            activePage: 'teams', // Für die aktive Navigationsleiste
            teams: teamsWithMembers
        });

    } catch (error) {
        console.error(' Fehler beim Laden der Team Übersicht:', error);
        req.flash('error', 'Fehler beim Laden der Team Übersicht.');
        res.status(500).redirect('/');
    }
});

module.exports = router;