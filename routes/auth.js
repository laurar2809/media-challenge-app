// routes/auth.js
const express = require('express');
const router = express.Router();
// HIER: Deinen ldapService importieren (Pfad eventuell anpassen)
const { authenticateLDAP } = require('../utils/ldapService');





// === DIESE ROUTE FEHLTE ===
router.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login',
    activePage: 'login'
  });
});


router.post('/login', async (req, res) => {
  console.log("LOGIN TEST:", req.body);
  
  const { quickId, username, password, vorname, nachname } = req.body;

  try {
    let user = null;

    // --- OPTION 1: Schnell-Login (ID 1, 2 oder 3) ---
    if (quickId && ['1', '2', '3'].includes(quickId)) {
      const roleMap = { '1': 1, '2': 2, '3': 3 };
      user = await req.db('users')
        .leftJoin('user_roles', 'users.user_role_id', 'user_roles.id')
        .where('users.user_role_id', roleMap[quickId])
        .select('users.*', 'user_roles.rolle')
        .first();
    }

    // --- OPTION 2: SCHUL-LOGIN MIT LDAP ---
    else if (username && password) {
      // 1. In der eigenen Datenbank nach dem Kürzel suchen
      user = await req.db('users')
        .leftJoin('user_roles', 'users.user_role_id', 'user_roles.id')
        .where('users.username', username)
        .select('users.*', 'user_roles.rolle')
        .first();

      if (user) {
        // 2. LIVE-CHECK beim Schul-Server (LDAP)
        console.log(`Prüfe LDAP-Passwort für: ${username}`);
        const isAuthenticated = await authenticateLDAP(username, password);

        if (!isAuthenticated) {
          console.log("LDAP: Passwort falsch.");
          req.flash('error', 'Schul-Passwort ist nicht korrekt.');
          return res.redirect('/auth/login');
        }
        console.log("LDAP: Login erfolgreich!");
      } else {
        req.flash('error', 'Username in der lokalen Datenbank nicht gefunden.');
        return res.redirect('/auth/login');
      }
    }

    // --- OPTION 3: Login mit Namen (Legacy) ---
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
      req.flash('error', 'Bitte fülle die Login-Felder aus.');
      // KORREKTUR: Muss auf /auth/login leiten
      return res.redirect('/auth/login');
    }
  } catch (error) {
    console.error('Login Error:', error);
    req.flash('error', 'Technischer Fehler beim Login.');
    // KORREKTUR: Muss auf /auth/login leiten
    res.redirect('/auth/login');
  }
});

// === LOGOUT ROUTE HINZUFÜGEN ===
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});



module.exports = router;