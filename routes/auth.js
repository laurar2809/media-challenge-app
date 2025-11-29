// routes/auth.js
const express = require('express');
const router = express.Router();

// Mock User Daten
const mockUsers = {
  '1': { id: 1, vorname: "Max", user_role_id: 1, rolle: "Schüler" },
  '2': { id: 2, vorname: "Lehrer", user_role_id: 2, rolle: "Lehrer" },
  '3': { id: 3, vorname: "Admin", user_role_id: 3, rolle: "Admin" }
};

// Login-Seite
router.get('/login', (req, res) => {
  res.render('login', {
    title: 'Anmelden',
    activePage: 'login'
  });
});


router.post('/login', (req, res) => {
  const { password } = req.body;
  console.log('🔐 Login versucht mit Passwort:', password);
  
  if (mockUsers[password]) {
    const user = mockUsers[password];
    req.session.userId = user.id;
    console.log('✅ Login erfolgreich:', user.vorname, user.rolle);
    req.flash('success', `Eingeloggt als ${user.rolle} (${user.vorname})!`);
    return res.redirect('/');
  }
  
  console.log('❌ Login fehlgeschlagen - ungültiges Passwort');
  req.flash('error', 'Ungültige Rolle! Verwende 1, 2 oder 3');
  res.redirect('/auth/login');
});


router.post('/logout', (req, res) => {
  console.log('🚪 Logout aufgerufen - Session vorher:', req.session.userId);
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.redirect('/');
    }
    console.log('✅ Session erfolgreich zerstört');
    res.redirect('/');
  });
});

// ✅ LOGOUT für GET (direkter Link)
router.get('/logout', (req, res) => {
  console.log('🚪 GET Logout aufgerufen');
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    res.redirect('/');
  });
});

module.exports = router;