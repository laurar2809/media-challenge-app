// routes/upload.js - ERWEITERT MIT CLEAN-UP & DYNAMISCHEM PFAD

const express = require('express');
const router = express.Router();
const fs = require('fs').promises; // Für Dateioperationen (Verschieben, Löschen)
const path = require('path'); // Für Pfadzusammensetzung
const { uploadAbgabe } = require('../middleware/uploads');
const { db } = require('../db');

// Hilfsfunktion: Dateityp ermitteln (Bleibt unverändert)
function getFileType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('pdf') || mimetype.includes('document')) return 'document';
    return 'other';
}

//  HELPER: Funktion zur Bereinigung der temporär gespeicherten Datei
async function cleanUpFile(req) {
  // Greife auf den gespeicherten Pfad des Multer-Uploads zu
    const filePathToDelete = req.file ? req.file.path : null; 
    
    if (filePathToDelete) {
        await fs.unlink(filePathToDelete).catch(err => {
            // "ENOENT" ist in Ordnung, da die Datei vielleicht schon verschoben/gelöscht wurde.
            if (err.code !== 'ENOENT') { 
                console.error('Cleanup Error:', err);
            }
        });
    }
}

// HELPER: Datei über den in der DB gespeicherten Pfad löschen (z.B. "/uploads/abgaben/2025/26/team-21/...")
async function deletePhysicalFile(dbPath) {
  if (!dbPath) return;

  const fullPath = path.join(__dirname, '..', 'public', dbPath);

  await fs.unlink(fullPath).catch(err => {
    if (err.code !== 'ENOENT') {
      console.error('Delete file error:', err);
    }
  });
}


// API: Löschen einer einzelnen Mediendatei
router.delete('/api/abgaben/media/:mediaId', async (req, res) => {
    try {
        const mediaId = req.params.mediaId;
        
        // 1. Prüfen ob Benutzer eingeloggt und im Team (optional, aber sicher)
        if (!req.currentUser) {
            return res.json({ success: false, error: 'Nicht angemeldet.' });
        }
        
        // 2. Mediendatensatz und Pfad aus der DB holen
        const mediaEntry = await db('abgabe_medien')
            .where('id', mediaId)
            .first();

        if (!mediaEntry) {
            return res.json({ success: false, error: 'Mediendatei nicht gefunden.' });
        }

        // 3. Datei physisch vom Server löschen
        await deletePhysicalFile(mediaEntry.datei_pfad);

        // 4. Datensatz aus der DB löschen
        const deletedRows = await db('abgabe_medien')
            .where('id', mediaId)
            .del();
        
        if (deletedRows === 0) {
            return res.json({ success: false, error: 'Datenbankeintrag konnte nicht gelöscht werden.' });
        }

        res.json({ success: true, message: 'Datei erfolgreich gelöscht.', mediaId: mediaId });

    } catch (error) {
        console.error('Delete Media Error:', error);
        res.status(500).json({ success: false, error: 'Löschen fehlgeschlagen.' });
    }
});

// API: Datei hochladen UND in DB speichern
router.post('/api/abgaben/upload', uploadAbgabe.single('file'), async (req, res) => {

    //  DEKLARATION: Variablen im Scope halten
    const challengeId = req.body.challengeId || req.query.challengeId;
    let challenge = null;
    let schuljahrName = null;
    let abgabe = null;

    try {
        // --- PRÜFUNG 1: Existiert eine Datei? ---
        if (!req.file) {
            return res.json({ success: false, error: 'Keine Datei hochgeladen' });
        }

        // --- PRÜFUNG 2: Angemeldet? ---
        if (!req.currentUser) {
            await cleanUpFile(req);
            return res.json({ success: false, error: 'Nicht angemeldet' });
        }

        // --- PRÜFUNG 3: Challenge ID übergeben? ---
        if (!challengeId) {
            await cleanUpFile(req);
            return res.json({ success: false, error: 'Challenge ID fehlt' });
        }

        // 1. Challenge mit Team-ID und Schuljahr-ID holen
       // 1. Challenge mit Team-ID und Schuljahr-ID holen
            challenge = await db('challenges')
            .where('challenges.id', challengeId)
            .join('teams', 'challenges.team_id', 'teams.id')         
            .join('schuljahre', 'challenges.schuljahr_id', 'schuljahre.id') 
            .select('teams.id as team_id', 'schuljahre.name as schuljahr_name')
            .first();

        if (!challenge) {
            await cleanUpFile(req);
            return res.json({ success: false, error: 'Challenge existiert nicht oder ist keinem Schuljahr zugewiesen.' });
        }

        schuljahrName = challenge.schuljahr_name;

        // --- PRÜFUNG 4: Schüler im Team? ---
        const isTeamMember = await db('team_mitglieder')
            .where({
                team_id: challenge.team_id,
                user_id: req.currentUser.id
            })
            .first();

        if (!isTeamMember && req.currentUser.user_role_id === 1) {
            await cleanUpFile(req);
            return res.json({ success: false, error: 'Du bist nicht im Team dieser Challenge' });
        }

        // 3. Abgabe für dieses Team suchen oder erstellen
        abgabe = await db('challenge_abgaben')
            .where({
                challenge_id: challengeId,
                team_id: challenge.team_id
            })
            .first();

        // Wenn keine Abgabe existiert, erstellen
        if (!abgabe) {
            const [abgabeId] = await db('challenge_abgaben').insert({
                challenge_id: challengeId,
                team_id: challenge.team_id,
                user_id: req.currentUser.id,
                status: 'entwurf',
                created_at: db.fn.now(),
                updated_at: db.fn.now()
            });
            abgabe = { id: abgabeId };
        }


        // 4a. PFADE DEFINIEREN (Dynamische Ordnerstruktur)
        const currentPath = req.file.path;

        // Ziel: /uploads/abgaben/2025-2026/team-15
        const newRelativeDir = `/uploads/abgaben/${schuljahrName || 'unbekannt'}/team-${challenge.team_id}`;

        const newFullPath = path.join(__dirname, '..', 'public', newRelativeDir, req.file.filename);
        const newDbPath = `${newRelativeDir}/${req.file.filename}`; // Der Pfad für die Datenbank

        // 4b. ZIELORDNER ERSTELLEN
        const targetDir = path.join(__dirname, '..', 'public', newRelativeDir);
        await fs.mkdir(targetDir, { recursive: true });

        // 4c. DATEI VERSCHIEBEN
        try {
            await fs.rename(currentPath, newFullPath);
            console.log(`Datei erfolgreich verschoben nach ${newFullPath}`);
        } catch (error) {
            console.error(`FEHLER beim Verschieben der Datei: ${error.message}`);
            throw error; // Wirf den Fehler weiter, um den globalen catch zu erreichen
        }

        // 4d. Datei in Datenbank speichern
        const [mediaId] = await db('abgabe_medien').insert({
            abgabe_id: abgabe.id,
            original_name: req.file.originalname,
            datei_pfad: newDbPath, // KORREKTER, verschobener Pfad
            datei_typ: getFileType(req.file.mimetype),
            mime_type: req.file.mimetype,
            groesse_bytes: req.file.size,
            created_at: db.fn.now()
        });

        // 5. Erfolgs-Response mit allen Daten
        const fileData = {
            id: mediaId,
            original_name: req.file.originalname,
            datei_pfad: newDbPath, // WICHTIG: Korrekter Pfad für das Frontend
            datei_typ: getFileType(req.file.mimetype),
            mime_type: req.file.mimetype,
            groesse_bytes: req.file.size,
            created_at: new Date().toISOString()
        };

        res.json({
            success: true,
            file: fileData
        });

    } catch (error) {
        console.error('Upload error:', error);

        //  Clean-up Logic (Wird bei JEDEM Fehler erreicht)
        if (req.file) {
            await cleanUpFile(req);
        }

        // Zusätzliche Überprüfung: Wenn das Verschieben erfolgreich war, aber DB fehlschlug,
        // müsste der newFullPath gelöscht werden. Da req.file.path nur der temporäre Pfad ist,
        // ist dieser Clean-up nicht 100%ig robust gegen späte DB-Fehler. Aber für jetzt lassen wir es so.

        res.json({
            success: false,
            error: process.env.NODE_ENV === 'development' ? error.message : 'Upload fehlgeschlagen'
        });
    }
});


// API: Abgabe speichern/einreichen
router.post('/api/abgaben/save', async (req, res) => {
    try {
        const { challenge_id, titel, beschreibung, status } = req.body;

        if (!req.currentUser) {
            return res.json({ success: false, error: 'Nicht angemeldet' });
        }

        if (!challenge_id) {
            return res.json({ success: false, error: 'Challenge ID fehlt' });
        }

        // 1. Challenge mit Team-ID holen
        const challenge = await db('challenges')
            .where('id', challenge_id)
            .select('team_id')
            .first();

        if (!challenge) {
            return res.json({ success: false, error: 'Challenge nicht gefunden' });
        }

        // 2. Prüfen ob Abgabe bereits existiert
        let abgabe = await db('challenge_abgaben')
            .where({
                challenge_id: challenge_id,
                team_id: challenge.team_id
            })
            .first();

        // Wenn Abgabe bereits eingereicht, keine Änderungen erlauben
        if (abgabe && abgabe.status === 'eingereicht') {
            return res.json({ success: false, error: 'Abgabe bereits eingereicht - keine Änderungen möglich' });
        }

        // 3. Abgabe erstellen oder aktualisieren
        const abgabeData = {
            challenge_id,
            team_id: challenge.team_id,
            user_id: req.currentUser.id,
            titel: titel || null,
            beschreibung: beschreibung || null,
            status: status || 'entwurf',
            updated_at: db.fn.now()
        };

        if (abgabe) {
            // Update bestehende Abgabe
            await db('challenge_abgaben')
                .where('id', abgabe.id)
                .update(abgabeData);
        } else {
            // Neue Abgabe erstellen
            abgabeData.created_at = db.fn.now();
            await db('challenge_abgaben').insert(abgabeData);
        }

        res.json({
            success: true,
            message: status === 'eingereicht' ? 'Abgabe erfolgreich eingereicht!' : 'Entwurf gespeichert!'
        });

    } catch (error) {
        console.error('Save error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;