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

// routes/bewertung.js - KORRIGIERTE DETAILANSICHT
router.get('/:id', requireLehrer, async (req, res) => {
    try {
        const abgabeId = req.params.id;
        
        // 1. Abgabe, Challenge und Team-Infos laden
        const abgabe = await db('challenge_abgaben')
            .where('challenge_abgaben.id', abgabeId)
            // ... (restliche Joins) ...
            .first();

        if (!abgabe) {
            req.flash('error', 'Abgabe nicht gefunden.');
            return res.redirect('/bewertung');
        }

        // 2. Alle hochgeladenen Medien für diese Abgabe laden
        const medien = await db('abgabe_medien')
            .where('abgabe_id', abgabeId)
            .orderBy('reihenfolge', 'asc');
            
        //  NEU: 3. Bestehende Bewertung laden (falls vorhanden)
        const bewertung = await db('abgabe_bewertungen')
            .where('abgabe_id', abgabeId)
            .first();

        //  NEU: 4. Teammitglieder laden
        const teamMitglieder = await db('team_mitglieder')
            .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
            .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
            .where('team_mitglieder.team_id', abgabe.team_id)
            .select('users.vorname', 'users.nachname', 'klassen.name as klasse_name');

        res.render('bewertungDetail', {
            abgabe,
            medien,
            bewertung: bewertung || null, // Übergibt die Bewertung
            teamMitglieder, // Übergibt die Mitglieder
            activePage: 'bewertung'
        });
    } catch (error) {
        console.error("Fehler beim Laden der Bewertungsdetails:", error);
        req.flash('error', 'Fehler beim Laden der Bewertungsdetails.');
        res.redirect('/bewertung');
    }
});

// routes/bewertung.js - FEHLENDER POST HANDLER
//  3. POST: Bewertung speichern und Status aktualisieren
// Die Route muss genau auf POST und den Parameter :id lauten
router.post('/:id', requireLehrer, async (req, res) => {
    const abgabeId = req.params.id;
    const { punkte, feedback, status } = req.body; 
    const lehrerId = req.currentUser.id;
    
    // Einfache Validierung und Status-Check...
    if (!punkte || !feedback || !status || (status !== 'bewertet' && status !== 'abgelehnt')) {
        req.flash('error', 'Ungültige oder fehlende Daten für die Bewertung.');
        return res.redirect(`/bewertung/${abgabeId}`);
    }

    const trx = await db.transaction();

    try {
        // 1. Punkte in 'abgabe_bewertungen' speichern/aktualisieren
        // Nutzt ON CONFLICT, um Duplikate bei Bearbeitung zu vermeiden
        await trx('abgabe_bewertungen')
            .insert({
                abgabe_id: abgabeId,
                lehrer_id: lehrerId,
                punkte: parseInt(punkte),
                feedback: feedback,
                bewertet_am: db.fn.now()
            })
            // Knex-spezifisch für UPDATE bei Konflikt (erfordert, dass lehrer_id und abgabe_id UNIQUE sind)
            .onConflict(['abgabe_id', 'lehrer_id']) 
            .merge(['punkte', 'feedback', 'bewertet_am']);


        // 2. Status und erreichte Punkte in der Haupt-Abgabe 'challenge_abgaben' aktualisieren
        await trx('challenge_abgaben')
            .where({ id: abgabeId })
            .update({
                status: status,
                erreichte_punkte: parseInt(punkte),
                updated_at: db.fn.now()
            });

        await trx.commit();
        req.flash('success', ` Abgabe ${abgabeId} als '${status}' markiert und bewertet.`);
        res.redirect('/bewertung'); 

    } catch (error) {
        await trx.rollback();
        console.error(" Fehler beim Speichern der Bewertung:", error);
        req.flash('error', `Datenbank-Fehler beim Speichern der Bewertung.`);
        res.redirect(`/bewertung/${abgabeId}`);
    }
});



module.exports = router;