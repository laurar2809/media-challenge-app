// routes/bewertung.js

const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireLehrer } = require('../middleware/auth'); // Nur für Lehrer/Admin

// routes/bewertung.js - KORRIGIERTER router.get('/') mit Filtern und Suche

router.get('/', requireLehrer, async (req, res) => {
    //  NEU: Filter- und Suchparameter aus der URL holen
    const { status, search } = req.query;
    const activeStatus = status || 'alle';
    const searchTerm = search || '';
    
    try {
        // 1. Alle Challenges laden (Basis für die Anzeige)
        let challengesQuery = db('challenges')
            .leftJoin('teams', 'challenges.team_id', 'teams.id')
            .select(
                'challenges.id as challenge_id',
                'challenges.title as challenge_title',
                'challenges.abgabedatum',
                'teams.name as team_name',
                'teams.id as team_id'
            )
            .orderBy('challenges.created_at', 'desc');

        const allChallenges = await challengesQuery;

        // 2. Abgabe-Status und Metadaten zu jeder Challenge hinzufügen
        let challengesWithAbgaben = await Promise.all(
            allChallenges.map(async (challenge) => {
                
                const abgabe = await db('challenge_abgaben')
                    .where('challenge_id', challenge.challenge_id)
                    .where('team_id', challenge.team_id)
                    .select('id', 'status', 'created_at')
                    .first();

                // NEU: Challenge als "Abgabe" behandeln (für EJS-Template)
                return {
                    id: abgabe ? abgabe.id : null, // Abgabe ID
                    challenge_id: challenge.challenge_id, // Challenge ID
                    challenge_title: challenge.challenge_title,
                    team_name: challenge.team_name,
                    status: abgabe ? abgabe.status : 'offen', // 'offen' wenn keine Abgabe
                    created_at: abgabe ? abgabe.created_at : null 
                };
            })
        );
        
        // 3.  BACKEND-FILTERUNG ANWENDEN
        if (activeStatus !== 'alle' || searchTerm) {
            
            challengesWithAbgaben = challengesWithAbgaben.filter(abgabe => {
                let matchesStatus = true;
                let matchesSearch = true;

                // Status-Filter
                if (activeStatus !== 'alle') {
                    matchesStatus = abgabe.status === activeStatus;
                }

                // Such-Filter (Fall-unabhängig)
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    matchesSearch = abgabe.challenge_title.toLowerCase().includes(searchLower) ||
                                    (abgabe.team_name && abgabe.team_name.toLowerCase().includes(searchLower));
                    // Füge hier weitere suchbare Felder hinzu (z.B. Teammitglieder, falls geladen)
                }
                
                return matchesStatus && matchesSearch;
            });
        }
        
        // 4. Sortierung: 'eingereicht' oben (zur Bewertung)
        challengesWithAbgaben.sort((a, b) => {
            if (a.status === 'eingereicht' && b.status !== 'eingereicht') return -1;
            if (a.status !== 'eingereicht' && b.status === 'eingereicht') return 1;
            return 0;
        });

        res.render('bewertungUebersicht', {
            abgaben: challengesWithAbgaben, 
            activePage: 'bewertung',
            //  NEU: Filterwerte an das Frontend zurückgeben
            activeStatus,
            searchTerm,
            // Liste aller möglichen Status
            statusOptions: ['alle', 'offen', 'entwurf', 'eingereicht', 'bewertet', 'abgelehnt'] 
        });
    } catch (error) {
        console.error("Fehler beim Laden der Bewertungsübersicht:", error);
        res.render('bewertungUebersicht', {
            abgaben: [],
            activePage: 'bewertung',
            activeStatus: 'alle',
            searchTerm: '',
            statusOptions: ['alle', 'offen', 'entwurf', 'eingereicht', 'bewertet', 'abgelehnt'] 
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