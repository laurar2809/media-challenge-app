
const express = require('express');
const router = express.Router();
const { loadUser, requireAuth } = require('../middleware/auth'); // 🛑 requireAuth HINZUFÜGEN
const { db } = require('../db'); 

// Homepage
// Der LoadUser MUSS zuerst laufen, dann wird requireAuth angewendet.
router.get('/', loadUser, requireAuth, async (req, res) => {
    
    //  1. UMLEITUNG NACH ROLLE (Wird nur für eingeloggte Benutzer ausgeführt)
    // Wenn Schüler (ID 1), leite direkt zu Challenges weiter.
    if (req.currentUser.user_role_id === 1) {
        console.log("Schüler eingeloggt, leite direkt zu Challenges weiter.");
        return res.redirect('/challenges');
    }
    
    //  2. FÜR ADMIN/LEHRER: Normale Startseite rendern (mit Kategorien)
    try {
        const categories = await db('categories').select('*').orderBy('title', 'asc');
        
        res.render('kategorien', {
            categories,
            activePage: 'kategorien'
        });
        
    } catch (error) {
        console.error('Fehler beim Laden der Kategorien für Admin/Lehrer:', error);
        req.flash('error', 'Fehler beim Laden der Kategorien');
        // Sicherer Fallback bei DB-Fehler
        return res.status(500).send("DB-Fehler: Startseite konnte nicht geladen werden.");
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