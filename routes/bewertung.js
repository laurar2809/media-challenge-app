// routes/bewertung.js

const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireLehrer } = require('../middleware/auth'); // Nur für Lehrer/Admin

//  1. ÜBERSICHT: Liste aller eingereichten Abgaben
// URL: /bewertung
router.get('/', requireLehrer, async (req, res) => {
    try {
        const abgaben = await db('challenge_abgaben')
            // Joins zur Anzeige der Titel und Teamnamen
            .leftJoin('challenges', 'challenge_abgaben.challenge_id', 'challenges.id')
            .leftJoin('teams', 'challenge_abgaben.team_id', 'teams.id')
            
            // Wähle nur die relevanten Spalten
            .select(
                'challenge_abgaben.*',
                'challenges.title as challenge_title',
                'teams.name as team_name'
            )
            // Nur eingereichte, bewertete oder abgelehnte Abgaben anzeigen (keine Entwürfe)
            .whereIn('challenge_abgaben.status', ['eingereicht', 'bewertet', 'abgelehnt'])
            .orderBy('challenge_abgaben.updated_at', 'desc');

        // Nutze den neuen, kurzen EJS-Namen
        res.render('bewertungUebersicht', {
            abgaben,
            activePage: 'bewertung' 
        });
    } catch (error) {
        console.error("Fehler beim Laden der Bewertungsübersicht:", error);
        res.render('bewertungUebersicht', {
            abgaben: [],
            activePage: 'bewertung'
        });
    }
});

//  2. DETAILANSICHT: Seite für die eigentliche Bewertung
// URL: /bewertung/:id
router.get('/:id', requireLehrer, async (req, res) => {
    try {
        const abgabeId = req.params.id;
        
        // Abgabe, Challenge und Team-Infos laden
        const abgabe = await db('challenge_abgaben')
            .where('challenge_abgaben.id', abgabeId)
            .leftJoin('challenges', 'challenge_abgaben.challenge_id', 'challenges.id')
            .leftJoin('teams', 'challenge_abgaben.team_id', 'teams.id')
            .select('challenge_abgaben.*', 
                    'challenges.title as challenge_title',
                    'teams.name as team_name')
            .first();

        if (!abgabe) {
            req.flash('error', 'Abgabe nicht gefunden.');
            return res.redirect('/bewertung');
        }

        // Alle hochgeladenen Medien für diese Abgabe laden
        const medien = await db('abgabe_medien')
            .where('abgabe_id', abgabeId)
            .orderBy('reihenfolge', 'asc');

        // Nutze den neuen, kurzen EJS-Namen
        res.render('bewertungDetail', {
            abgabe,
            medien,
            activePage: 'bewertung'
        });
    } catch (error) {
        console.error("Fehler beim Laden der Bewertungsdetails:", error);
        req.flash('error', 'Fehler beim Laden der Bewertungsdetails.');
        res.redirect('/bewertung');
    }
});


module.exports = router;