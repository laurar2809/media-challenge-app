// routes/auth.js - MIT VOLLSTÄNDIGEN FEHLERMELDUNGEN
const express = require('express');
const router = express.Router();

// Login-Seite
router.get('/login', (req, res) => {
  res.render('login', {
    title: 'Anmelden',
    activePage: 'login'
  });
});

// Login-Prozess mit BEIDEN Optionen - MIT FEHLERMELDUNGEN
router.post('/login', async (req, res) => {
  const { password, vorname, nachname } = req.body;
  console.log(' Login versucht:', { password, vorname, nachname });

  // OPTION 1: Schnell-Login mit 1,2,3
  if (password && ['1', '2', '3'].includes(password)) {
    const roleMap = {
      '1': 1, // Schüler
      '2': 2, // Lehrer  
      '3': 3  // Admin
    };

    try {
      // Ersten User mit dieser Rolle finden
      const user = await req.db('users')
        .leftJoin('user_roles', 'users.user_role_id', 'user_roles.id')
        .where('users.user_role_id', roleMap[password])
        .select('users.*', 'user_roles.rolle')
        .first();

      if (user) {
        req.session.userId = user.id;
        console.log(' Schnell-Login erfolgreich:', user.vorname, user.nachname, user.rolle);
        req.flash('success', `Eingeloggt als ${user.rolle} (${user.vorname} ${user.nachname})!`);
        return res.redirect('/');
      } else {
        console.log(' Kein User gefunden für Rolle:', password);
        req.flash('error', `Kein Benutzer mit Rolle ${password} gefunden!`);
        return res.redirect('/auth/login');
      }
    } catch (error) {
      console.error('Schnell-Login DB Error:', error);
      req.flash('error', 'Datenbank-Fehler bei der Anmeldung');
      return res.redirect('/auth/login');
    }
  }

  // OPTION 2: Login mit Vor- und Nachname
  if (vorname && nachname) {
    try {
      // Exakten User mit Vor- UND Nachname finden
      const user = await req.db('users')
        .leftJoin('user_roles', 'users.user_role_id', 'user_roles.id')
        .where('users.vorname', 'like', `%${vorname}%`)
        .andWhere('users.nachname', 'like', `%${nachname}%`)
        .select('users.*', 'user_roles.rolle')
        .first();

      if (user) {
        req.session.userId = user.id;
        console.log(' Namens-Login erfolgreich:', user.vorname, user.nachname, user.rolle);
        req.flash('success', `Eingeloggt als ${user.rolle} (${user.vorname} ${user.nachname})!`);
        return res.redirect('/');
      } else {
        console.log(' Kein User gefunden mit:', vorname, nachname);
        req.flash('error', ` Kein Benutzer gefunden mit: "${vorname} ${nachname}"`);
        return res.redirect('/auth/login');
      }
    } catch (error) {
      console.error('Namens-Login DB Error:', error);
      req.flash('error', ' Datenbank-Fehler bei der Anmeldung');
      return res.redirect('/auth/login');
    }
  }

  // OPTION 3: Nur Vorname eingegeben
  if (vorname && !nachname) {
    console.log(' Nur Vorname eingegeben:', vorname);
    req.flash('error', ' Bitte gib sowohl Vorname als auch Nachname ein!');
    return res.redirect('/auth/login');
  }

  // OPTION 4: Nur Nachname eingegeben
  if (!vorname && nachname) {
    console.log(' Nur Nachname eingegeben:', nachname);
    req.flash('error', ' Bitte gib sowohl Vorname als auch Nachname ein!');
    return res.redirect('/auth/login');
  }

  // OPTION 5: Ungültiges Passwort (nicht 1,2,3)
  if (password && !['1', '2', '3'].includes(password)) {
    console.log(' Ungültiges Passwort:', password);
    req.flash('error', ' Ungültiges Passwort! Nur 1, 2 oder 3 sind erlaubt.');
    return res.redirect('/auth/login');
  }

  // OPTION 6: Keine Daten eingegeben
  console.log(' Keine Login-Daten eingegeben');
  req.flash('error', ' Bitte gib entweder 1, 2, 3 ODER Vor- und Nachname ein!');
  res.redirect('/auth/login');
});

// Logout
router.post('/logout', (req, res) => {
  console.log(' Logout aufgerufen - Session vorher:', req.session.userId);
  req.session.destroy((err) => {
    if (err) {
      console.error(' Logout error:', err);
      return res.redirect('/');
    }
    console.log(' Session erfolgreich zerstört');
    res.redirect('/auth/login');
  });
});

module.exports = router;