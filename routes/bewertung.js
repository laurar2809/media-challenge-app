// routes/bewertung.js - FINALER BEREINIGTER CONTROLLER

const express = require('express');
const router = express.Router();
const { db } = require('../db');
// Import der benötigten Middleware
const { requireAuth, requireLehrer } = require('../middleware/auth');

// =========================================================
// 1. ÜBERSICHT: Liste aller Challenges (mit Abgabestatus)
// URL: /bewertung
// =========================================================
router.get('/', requireLehrer, async (req, res) => {
    const { status, search } = req.query;
    const activeStatus = status || 'alle';
    const searchTerm = search || '';

    // Liste aller möglichen Status für das Frontend-Dropdown
    const statusOptions = ['alle', 'offen', 'entwurf', 'eingereicht', 'bewertet', 'abgelehnt'];

    try {
        // 1. Alle Challenges laden (Basis für die Anzeige)
        const allChallenges = await db('challenges')
            .leftJoin('teams', 'challenges.team_id', 'teams.id')
            .select(
                'challenges.id as challenge_id',
                'challenges.title as challenge_title',
                'teams.name as team_name',
                'teams.id as team_id'
            )
            .orderBy('challenges.created_at', 'desc');

        // 2. Abgabe-Status und Metadaten zu jeder Challenge hinzufügen
        let challengesWithAbgaben = await Promise.all(
            allChallenges.map(async (challenge) => {

                const abgabe = await db('challenge_abgaben')
                    .where('challenge_id', challenge.challenge_id)
                    .where('team_id', challenge.team_id)
                    .select('id', 'status', 'created_at')
                    .first();

                // Challenge als "Abgabe" behandeln (für EJS-Template)
                return {
                    id: abgabe ? abgabe.id : null,
                    challenge_id: challenge.challenge_id,
                    challenge_title: challenge.challenge_title,
                    team_name: challenge.team_name,
                    status: abgabe ? abgabe.status : 'offen',
                    created_at: abgabe ? abgabe.created_at : null
                };

            })
        );

        // 3. BACKEND-FILTERUNG ANWENDEN
        if (activeStatus !== 'alle' || searchTerm) {

            challengesWithAbgaben = challengesWithAbgaben.filter(abgabe => {
                let matchesStatus = true;
                let matchesSearch = true;
                const searchLower = searchTerm.toLowerCase();

                // Status-Filter
                if (activeStatus !== 'alle') {
                    matchesStatus = abgabe.status === activeStatus;
                }

                // Such-Filter (Robuste Null-Checks für Titel/Teamnamen)
                if (searchTerm) {
                    const title = abgabe.challenge_title ? abgabe.challenge_title.toLowerCase() : '';
                    const team = abgabe.team_name ? abgabe.team_name.toLowerCase() : '';

                    matchesSearch = title.includes(searchLower) || team.includes(searchLower);
                }

                return matchesStatus && matchesSearch;
            });
        }

        // 4. Sortierung: 'eingereicht' (zur Bewertung) oben
        challengesWithAbgaben.sort((a, b) => {
            if (a.status === 'eingereicht' && b.status !== 'eingereicht') return -1;
            if (a.status !== 'eingereicht' && b.status === 'eingereicht') return 1;
            return 0;
        });

        res.render('admin/bewertung/bewertungUebersicht', {
            abgaben: challengesWithAbgaben,
            activePage: 'bewertung',
            activeStatus,
            searchTerm,
            statusOptions
        });
    } catch (error) {
        console.error("Fehler beim Laden der Bewertungsübersicht:", error);
        req.flash('error', 'Fehler beim Laden der Bewertungsübersicht.');
        res.render('admin/bewertung/bewertungUebersicht', {
            abgaben: [],
            activePage: 'bewertung',
            activeStatus: 'alle',
            searchTerm: '',
            statusOptions: statusOptions
        });
    }
});

// =========================================================
// 2. DETAILANSICHT: Abgabe prüfen
// URL: /bewertung/:id
// =========================================================
router.get('/:id', requireLehrer, async (req, res) => {
    try {
        const abgabeId = req.params.id;

        // 1. Abgabe, Challenge und Team-Infos laden (Joins ergänzen, falls nötig)
        const abgabe = await db('challenge_abgaben')
            .where('challenge_abgaben.id', abgabeId)
            // Füge hier Joins hinzu, um Challenge Titel und Team Name zu laden!
            .leftJoin('challenges', 'challenge_abgaben.challenge_id', 'challenges.id')
            .leftJoin('teams', 'challenge_abgaben.team_id', 'teams.id')
            .select('challenge_abgaben.*', 'challenges.title as challenge_title', 'teams.name as team_name')
            .first();

        if (!abgabe) {
            req.flash('error', 'Abgabe nicht gefunden.');
            return res.redirect('/bewertung');
        }

        // 2. Alle hochgeladenen Medien
        const medien = await db('abgabe_medien')
            .where('abgabe_id', abgabeId)
            .orderBy('reihenfolge', 'asc');

        // 3. Bestehende Bewertung laden
        const bewertung = await db('abgabe_bewertungen')
            .where('abgabe_id', abgabeId)
            .first();

        // 4. Teammitglieder laden
        const teamMitglieder = await db('team_mitglieder')
            .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
            .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
            .where('team_mitglieder.team_id', abgabe.team_id)
            .select('users.vorname', 'users.nachname', 'klassen.name as klasse_name');

        res.render('admin/bewertung/bewertungDetail', {
            abgabe,
            medien,
            bewertung: bewertung || null,
            teamMitglieder,
            activePage: 'bewertung'
        });
    } catch (error) {
        console.error("Fehler beim Laden der Bewertungsdetails:", error);
        req.flash('error', 'Fehler beim Laden der Bewertungsdetails.');
        res.redirect('/bewertung');
    }
});

// routes/bewertung.js - KORRIGIERTER POST-HANDLER (angepasst an die SQL-Struktur)

router.post('/:id', requireAuth, requireLehrer, async (req, res) => {
    const abgabeId = req.params.id;
    let { punkte, feedback, status } = req.body;
    const lehrerId = req.currentUser.id;

    // 1. Validierung (bleibt gleich, status wird vom Button gesetzt)
    if (!status || (status !== 'bewertet' && status !== 'abgelehnt')) {
        req.flash('error', 'Ungültiger Status übermittelt.');
        return res.redirect(`/bewertung/${abgabeId}`);
    }
    if (!feedback || feedback.trim() === '') {
        req.flash('error', 'Feedback ist zwingend erforderlich.');
        return res.redirect(`/bewertung/${abgabeId}`);
    }

    // Punkte sind nur Pflicht, wenn die Abgabe BEWERTET wird
    let punkteZuSpeichern = 0; // Standardwert auf 0 setzen, da NOT NULL verlangt wird

    if (status === 'bewertet') {
        const parsedPunkte = parseInt(punkte);

        if (isNaN(parsedPunkte) || parsedPunkte < 0 || parsedPunkte > 100) {
            req.flash('error', 'Punkte sind bei Status "Bewertet" erforderlich und müssen zwischen 0 und 100 liegen.');
            return res.redirect(`/bewertung/${abgabeId}`);
        }
        punkteZuSpeichern = parsedPunkte;
    } else {
        // Status ist 'abgelehnt' -> Punktezahl muss 0 sein, um den NOT NULL Constraint zu erfüllen
        punkteZuSpeichern = 0;
    }

    const trx = await db.transaction();

    try {
        // 2. Punkte in 'abgabe_bewertungen' speichern/aktualisieren
        // HINWEIS: WIR SPEICHERN HIER NUR DIE EXISTIERENDEN SPALTEN DER TABELLE!
        await trx('abgabe_bewertungen')
            .insert({
                abgabe_id: abgabeId,
                lehrer_id: lehrerId,
                punkte: punkteZuSpeichern, //  Nun korrekt NULL bei Ablehnung
                feedback: feedback,
                bewertet_am: db.fn.now() //  Nur 'bewertet_am' verwenden
            })
            // UPDATE bei Konflikt
            .onConflict(['abgabe_id', 'lehrer_id'])
            .merge(['punkte', 'feedback', 'bewertet_am']);


        // 3. Status und erreichte Punkte in der Haupt-Abgabe 'challenge_abgaben' aktualisieren
        // DIES IST DER ORT, WO STATUS UND ERREICHTE PUNKTE WIRKLICH HINGEHÖREN!
        await trx('challenge_abgaben')
            .where({ id: abgabeId })
            .update({
                status: status, //  Status wird in der challenge_abgaben Tabelle aktualisiert
                erreichte_punkte: punkteZuSpeichern, //  Punkte werden hier aktualisiert (NULL bei Ablehnung)
                updated_at: db.fn.now()
            });

        await trx.commit();
        req.flash('success', ` Abgabe ${abgabeId} erfolgreich als '${status}' markiert.`);
        res.redirect('/bewertung');

    } catch (error) {
        await trx.rollback();
        console.error(" Fehler beim Speichern der Bewertung:", error);
        req.flash('error', `Datenbank-Fehler beim Speichern der Bewertung: ${error.message}`);
        res.redirect(`/bewertung/${abgabeId}`);
    }
});


module.exports = router;