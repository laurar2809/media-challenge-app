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
            .andWhere(function () {
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



// GET: Admin bearbeiten Formular
router.get('/:id/edit', requireAuth, requireAdmin, async (req, res) => {
    try {
        const adminId = req.params.id;

        // Admin aus DB holen (Rolle 3)
        const admin = await db('users')
            .where({ id: adminId, user_role_id: 3 })
            .first();

        if (!admin) {
            req.flash('error', 'Administrator nicht gefunden.');
            return res.redirect('/admin');
        }

        res.render('admin/personen/adminForm', {
            title: 'Administrator bearbeiten',
            action: `/admin/${admin.id}?_method=PUT`, // Wichtig für Method-Override
            item: admin,
            activePage: 'admin'
        });
    } catch (error) {
        console.error("Fehler beim Laden des Admin-Formulars:", error);
        res.redirect('/admin');
    }
});

// PUT: Änderungen speichern
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { vorname, nachname, username } = req.body;

        await db('users')
            .where({ id: req.params.id, user_role_id: 3 })
            .update({
                vorname,
                nachname,
                username,
                updated_at: db.fn.now()
            });

        req.flash('success', 'Admin-Daten wurden aktualisiert.');
        res.redirect('/admin');
    } catch (error) {
        console.error("Update Fehler:", error);
        req.flash('error', 'Fehler beim Speichern.');
        res.redirect('/admin');
    }
});

// GET: Formular für einen neuen Administrator
router.get('/new', requireAuth, requireAdmin, (req, res) => {
    res.render('admin/personen/adminForm', {
        title: 'Neuen Administrator anlegen',
        action: '/admin/new', // Ziel für das Formular
        item: {}, // Leeres Objekt, damit die Felder im EJS leer sind
        activePage: 'admin'
    });
});

// POST: Neuen Administrator in der Datenbank speichern
router.post('/new', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { vorname, nachname, username } = req.body;

        // 1. Prüfen, ob der User bereits existiert (anhand des Kürzels)
        const existingUser = await db('users').where('username', username).first();

        if (existingUser) {
            // Falls der User existiert, befördern wir ihn einfach zum Admin
            await db('users')
                .where('id', existingUser.id)
                .update({
                    user_role_id: 3, // Admin-Rolle
                    vorname: vorname, // Namen ggf. aktualisieren
                    nachname: nachname,
                    updated_at: db.fn.now()
                });
            req.flash('success', `${vorname} ${nachname} wurde zum Administrator befördert.`);
        } else {
            // Falls der User ganz neu ist, legen wir ihn neu an
            await db('users').insert({
                vorname,
                nachname,
                username,
                user_role_id: 3, // Rolle: Admin
                created_at: db.fn.now(),
                updated_at: db.fn.now()
            });
            req.flash('success', `Neuer Administrator ${vorname} ${nachname} wurde erstellt.`);
        }

        res.redirect('/admin');
    } catch (error) {
        console.error("Fehler beim Erstellen des Admins:", error);
        req.flash('error', 'Technischer Fehler beim Erstellen.');
        res.redirect('/admin/new');
    }
});



module.exports = router;