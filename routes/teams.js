// routes/teams.js

const express = require('express');
const router = express.Router();
const { requireAuth, requireLehrer } = require('../middleware/auth'); // Brauchen wir für die Sicherheit
const { db } = require('../db'); // Direkter DB-Import

router.get('/', requireAuth, requireLehrer, async (req, res) => {
    try {
        const { search, klasse, schuljahr } = req.query;

        const klassen = await db('klassen').orderBy('name');
        const schuljahre = await db('schuljahre').orderBy('name');

        // --- SCHRITT 1: SCHÜLER FÜR DAS MODAL (IMMER ALLE) ---
        const schueler = await db('users')
            .leftJoin('klassen', 'users.klasse_id', 'klassen.id')
            .leftJoin('user_roles', 'users.user_role_id', 'user_roles.id')
            .where('user_roles.rolle', 'Schüler')
            .select(
                'users.id as id',
                'users.vorname',
                'users.nachname',
                'klassen.name as klasse_name',
                'users.schuljahr_id'
            );

        // --- SCHRITT 2: TEAMS FÜR DIE TABELLE (FILTERBAR) ---
        let teamsQuery = db('teams')
            .leftJoin('schuljahre', 'teams.schuljahr_id', 'schuljahre.id');

        // DER SCHLAUE FILTER:
        if (search) {
            teamsQuery.where(function() {
                // Entweder der Teamname passt...
                this.where('teams.name', 'like', `%${search}%`)
                // ...ODER es gibt ein Mitglied im Team, dessen Name passt
                .orWhereExists(function() {
                    this.select('*')
                        .from('team_mitglieder')
                        .join('users', 'team_mitglieder.user_id', 'users.id')
                        .whereRaw('team_mitglieder.team_id = teams.id')
                        .andWhere(function() {
                            this.where('users.vorname', 'like', `%${search}%`)
                                .orWhere('users.nachname', 'like', `%${search}%`);
                        });
                });
            });
        }

        // Jetzt erst joinen wir die Mitglieder für die ANZEIGE (COUNT/LISTE)
        // Dadurch zählen wir immer ALLE Mitglieder der gefundenen Teams
        const teams = await teamsQuery
            .leftJoin('team_mitglieder', 'teams.id', 'team_mitglieder.team_id')
            .leftJoin('users', 'team_mitglieder.user_id', 'users.id')
            .select(
                'teams.id',
                'teams.name',
                'schuljahre.name as schuljahr_name',
                db.raw('COUNT(DISTINCT team_mitglieder.user_id) as mitglieder_count'),
                db.raw("GROUP_CONCAT(DISTINCT CONCAT(users.vorname, ' ', users.nachname) SEPARATOR ', ') as mitglieder_liste"),
                db.raw("GROUP_CONCAT(DISTINCT team_mitglieder.user_id) as mitglieder_ids")
            )
            .groupBy('teams.id', 'teams.name', 'schuljahre.name');

        res.render('admin/personen/teams', {
            schueler, 
            teams,    
            klassen,
            schuljahre,
            searchTerm: search || '',
            activeKlasse: klasse || 'alle',
            activeSchuljahr: schuljahr || 'alle',
            title: 'Team Übersicht',
            activePage: 'teams'
        });

    } catch (error) {
        console.error('Fehler:', error);
        res.redirect('/dashboard');
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


router.put('/:id', requireAuth, requireLehrer, async (req, res) => {
    const teamId = req.params.id;
    const { name, members } = req.body;

    try {
        await db.transaction(async tr => {
            // 1. Team-Name aktualisieren
            await tr('teams').where('id', teamId).update({ name });

            // 2. Alle alten Mitglieder entfernen
            await tr('team_mitglieder').where('team_id', teamId).del();

            // 3. Neue Mitgliederliste einfügen
            if (members && members.length > 0) {
                const inserts = members.map(m => ({
                    team_id: teamId,
                    user_id: m.id,
                    rolle: 'mitglied'
                }));
                await tr('team_mitglieder').insert(inserts);
            }
        });

        res.json({ success: true, message: 'Team erfolgreich aktualisiert!' });
    } catch (error) {
        console.error('Update Fehler:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});




module.exports = router;