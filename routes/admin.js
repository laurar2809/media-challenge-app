const express = require('express');
const router = express.Router();
const { db } = require('../db');
// Nutze deine vorhandenen Middlewares für den Schutz
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Übersicht aller Admins (Rolle 3)
router.get('/', requireAuth, async (req, res) => {
  try {
    const searchTerm = req.query.search || '';
    
    // Holt alle User mit der role_id 3 (Admin)
    const admins = await db('users')
      .where('user_role_id', 3)
      .andWhere(function() {
        if (searchTerm) {
          this.where('vorname', 'like', `%${searchTerm}%`)
              .orWhere('nachname', 'like', `%${searchTerm}%`);
        }
      })
      .orderBy('nachname', 'asc');

    res.render('admin/personen/admin', {
      admins: admins,
      searchTerm: searchTerm,
      user: req.session.user // Falls du den eingeloggten User für den "Selbst-Lösch-Schutz" brauchst
    });
  } catch (error) {
    console.error("Fehler beim Laden der Admins:", error);
    res.status(500).send("Server Fehler");
  }
});

module.exports = router;