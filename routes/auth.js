const express = require('express');
const router = express.Router();
const { authenticateLDAP } = require('../utils/ldapService');

router.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login',
    activePage: 'login'
  });
});

router.post('/login', async (req, res) => {
  // PASSWORT-LOG ENTFERNT (req.body logging deaktiviert)
  const { quickId, username, password, vorname, nachname } = req.body;

  try {
    let user = null;

    // --- OPTION 1: Schnell-Login ---
    if (quickId && ['1', '2', '3'].includes(quickId)) {
      const roleMap = { '1': 1, '2': 2, '3': 3 };

      let query = req.db('users')
        .leftJoin('user_roles', 'users.user_role_id', 'user_roles.id')
        .where('users.user_role_id', roleMap[quickId]);

      if (quickId === '1') {
        // Nutze LIKE statt exaktem Match, falls der Vorname "Test Schüler" ist
        query = query.where('users.nachname', 'like', '%Test%');
      } else if (quickId === '3') {
        query = query.where('users.nachname', 'like', '%Nobis%');
      }

      user = await query.select('users.*', 'user_roles.rolle').first();

      // DEBUG-LOG (Nur für dich zum Prüfen im Terminal)
      if (!user) {
        console.log(`QuickLogin fehlgeschlagen: Kein User mit Rolle ${roleMap[quickId]} gefunden.`);
      }
    }

    // --- OPTION 2: SCHUL-LOGIN MIT LDAP ---
    else if (username && password) {
      user = await req.db('users')
        .leftJoin('user_roles', 'users.user_role_id', 'user_roles.id')
        .where('users.username', username)
        .select('users.*', 'user_roles.rolle')
        .first();

      if (user) {
        console.log(`LDAP Check für: ${username}`); // Nur Username loggen!
        const isAuthenticated = await authenticateLDAP(username, password);

        if (!isAuthenticated) {
          req.flash('error', 'Schul-Passwort ist nicht korrekt oder Server nicht erreichbar.');
          return res.redirect('/auth/login');
        }
      } else {
        req.flash('error', 'Kürzel nicht in lokaler Datenbank gefunden.');
        return res.redirect('/auth/login');
      }
    }

    // --- OPTION 3: Login mit Namen ---
    else if (vorname && nachname) {
      user = await req.db('users')
        .leftJoin('user_roles', 'users.user_role_id', 'user_roles.id')
        .where('users.vorname', 'like', `%${vorname}%`)
        .andWhere('users.nachname', 'like', `%${nachname}%`)
        .select('users.*', 'user_roles.rolle')
        .first();
    }

    if (user) {
      req.session.userId = user.id;
      req.flash('success', `Willkommen, ${user.vorname}!`);
      return res.redirect('/');
    } else {
      req.flash('error', 'Login fehlgeschlagen. Bitte Felder prüfen.');
      return res.redirect('/auth/login');
    }
  } catch (error) {
    console.error('Login Error:', error.message); // Password nicht im Error-Log
    req.flash('error', 'Technischer Fehler beim Login.');
    res.redirect('/auth/login');
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;