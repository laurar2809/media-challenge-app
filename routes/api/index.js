const express = require('express');
const router = express.Router();
const { db } = require('../../db');

// API Routes für Challenges
router.get('/challenges/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    console.log(' API Search aufgerufen mit:', searchTerm);

    if (!searchTerm || searchTerm.length < 2) {
      console.log(' Search term zu kurz');
      return res.json([]);
    }

    const challenges = await db('challenges')
      .leftJoin('aufgabenpakete', 'challenges.aufgabenpaket_id', 'aufgabenpakete.id')
      .leftJoin('teams', 'challenges.team_id', 'teams.id')
      .where('aufgabenpakete.title', 'like', `%${searchTerm}%`)
      .orWhere('teams.name', 'like', `%${searchTerm}%`)
      .orWhere('aufgabenpakete.kategorie', 'like', `%${searchTerm}%`)
      .select(
        'challenges.*',
        'aufgabenpakete.title as aufgabenpaket_title',
        'aufgabenpakete.kategorie',
        'teams.name as team_name'
      )
      .limit(10);

    console.log(' Search Ergebnisse:', challenges.length, 'Challenges gefunden');
    res.json(challenges);

  } catch (error) {
    console.error(" Search error:", error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// API Routes für Schüler
router.get('/schueler/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    console.log(' Schüler-Suche:', searchTerm);

    if (!searchTerm || searchTerm.length < 2) {
      return res.json([]);
    }

    const schueler = await db('schueler')
      .leftJoin('klassen', 'schueler.klasse_id', 'klassen.id')
      .where('schueler.vorname', 'like', `%${searchTerm}%`)
      .orWhere('schueler.nachname', 'like', `%${searchTerm}%`)
      .orWhere('klassen.name', 'like', `%${searchTerm}%`)
      .select(
        'schueler.*',
        'klassen.name as klasse_name'
      )
      .limit(10);

    res.json(schueler);

  } catch (error) {
    console.error("Schüler Search error:", error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// API Routes für Aufgabenpakete
router.get('/aufgabenpakete/search', async (req, res) => {
  try {
    const searchTerm = req.query.q;

    if (!searchTerm || searchTerm.length < 2) {
      return res.json([]);
    }

    const aufgabenpakete = await db('aufgabenpakete')
      .where('title', 'like', `%${searchTerm}%`)
      .orWhere('description', 'like', `%${searchTerm}%`)
      .orWhere('kategorie', 'like', `%${searchTerm}%`)
      .select('*')
      .limit(10);

    res.json(aufgabenpakete);

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: 'Search failed' });
  }
});

