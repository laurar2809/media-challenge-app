const express = require('express');
const router = express.Router();
const { loadUser, requireAuth } = require('../middleware/auth'); 
const { db } = require('../db'); 

// Homepage
router.get('/', loadUser, requireAuth, async (req, res) => {
    
    // 1. UMLEITUNG NACH ROLLE
    if (req.currentUser.user_role_id === 1) {
        return res.redirect('/challenges');
    }
    
    // 2. FÜR ADMIN/LEHRER: Daten laden
    try {
        // Parallel laden für bessere Performance
        const [categories, stats] = await Promise.all([
            db('categories').select('*').orderBy('title', 'asc'),
            
            // NEU: Statistik-Abfrage
            db('users')
                .join('klassen', 'users.klasse_id', 'klassen.id')
                .where('users.user_role_id', 1) // Nur Schüler zählen
                .select('klassen.name as klasse')
                .count('users.id as anzahl')
                .groupBy('klassen.name')
                .orderBy('klassen.name', 'asc')
        ]);
        
        // Wir rendern jetzt die Kategorien-Seite, übergeben aber die Stats mit
        res.render('admin/kategorien/kategorien', {
            categories,
            stats, // <--- Hier sind deine neuen LDAP-Statistiken
            activePage: 'kategorien',
            title: 'Lehrer-Dashboard'
        });
        
    } catch (error) {
        console.error('Fehler beim Laden der Dashboard-Daten:', error);
        req.flash('error', 'Fehler beim Laden der Statistiken');
        return res.status(500).send("DB-Fehler: Startseite konnte nicht geladen werden.");
    }
});

// Test-Route bleibt gleich...
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