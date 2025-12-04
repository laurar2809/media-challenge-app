// routes/upload.js - VOLLSTÄNDIGE VERSION MIT DB-SPEICHERUNG
const express = require('express');
const router = express.Router();
const { uploadAbgabe } = require('../middleware/uploads');
const { db } = require('../db');

// Hilfsfunktion: Dateityp ermitteln
function getFileType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf') || mimetype.includes('document')) return 'document';
  return 'other';
}

// API: Datei hochladen UND in DB speichern
router.post('/api/abgaben/upload', uploadAbgabe.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, error: 'Keine Datei hochgeladen' });
    }
    
    // Prüfe ob Benutzer eingeloggt ist
    if (!req.currentUser) {
      return res.json({ success: false, error: 'Nicht angemeldet' });
    }
    
    const challengeId = req.body.challengeId || req.query.challengeId;
    
    if (!challengeId) {
      return res.json({ success: false, error: 'Challenge ID fehlt' });
    }
    
    // 1. Challenge mit Team-ID holen
    const challenge = await db('challenges')
      .where('id', challengeId)
      .select('team_id')
      .first();
    
    if (!challenge) {
      return res.json({ success: false, error: 'Challenge nicht gefunden' });
    }
    
    // 2. Prüfen ob Schüler im Team ist
    const isTeamMember = await db('team_mitglieder')
      .where({
        team_id: challenge.team_id,
        user_id: req.currentUser.id
      })
      .first();
    
    if (!isTeamMember && req.currentUser.user_role_id === 1) {
      return res.json({ success: false, error: 'Du bist nicht im Team dieser Challenge' });
    }
    
    // 3. Abgabe für dieses Team suchen oder erstellen
    let abgabe = await db('challenge_abgaben')
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
    
    // 4. Datei in Datenbank speichern
    const [mediaId] = await db('abgabe_medien').insert({
      abgabe_id: abgabe.id,
      original_name: req.file.originalname,
      datei_pfad: '/uploads/abgaben/' + req.file.filename,
      datei_typ: getFileType(req.file.mimetype),
      mime_type: req.file.mimetype,
      groesse_bytes: req.file.size,
      created_at: db.fn.now()
    });
    
    // 5. Erfolgs-Response mit allen Daten
    const fileData = {
      id: mediaId,
      original_name: req.file.originalname,
      datei_pfad: '/uploads/abgaben/' + req.file.filename,
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