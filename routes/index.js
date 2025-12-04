const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Homepage
router.get('/', async (req, res) => {
  try {
    const categories = await db('categories').select('*').orderBy('title', 'asc');
    res.render('kategorien', {
      categories,
      activePage: 'kategorien'
    });
  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error);
    req.flash('error', 'Fehler beim Laden der Kategorien');
    res.render('index', {
      categories: [],
      activePage: 'kategorien'
    });
  }
});

// Test-Route für Environment Variables
router.get('/test-env', (req, res) => {
  res.json({
    dbHost: process.env.DB_HOST,
    dbUser: process.env.DB_USER,
    dbName: process.env.DB_NAME,
    dbClient: process.env.DB_CLIENT,
    envFile: 'Werte werden aus .env gelesen'
  });
});

module.exports = router;