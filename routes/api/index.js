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

// API Routes für Kategorien
router.get('/categories', async (req, res) => {
  const categories = await db('categories').select('*').orderBy('title', 'asc');
  res.json(categories);
});

router.get('/categories/:id', async (req, res) => {
  const item = await db('categories').where({ id: req.params.id }).first();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/categories', async (req, res) => {
  const { title, description, icon } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Missing fields' });

  let insertQuery = db('categories').insert({ title, description, icon });

  try {
    let ret;
    if ((process.env.DB_CLIENT || 'sqlite').toLowerCase() === 'pg') {
      ret = await insertQuery.returning('id');
      const id = Array.isArray(ret) ? (ret[0]?.id || ret[0]) : ret;
      return res.json({ id });
    } else {
      ret = await insertQuery;
      const id = Array.isArray(ret) ? ret[0] : ret;
      return res.json({ id });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Insert failed' });
  }
});

router.put('/categories/:id', async (req, res) => {
  const { title, description, icon } = req.body;
  await db('categories').where({ id: req.params.id }).update({ title, description, icon });
  res.json({ success: true });
});

router.delete('/categories/:id', async (req, res) => {
  await db('categories').where({ id: req.params.id }).del();
  res.json({ success: true });
});

module.exports = router;