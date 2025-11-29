// middleware/auth.js - KOMPLETT KORRIGIERT
const mockUsers = {
  1: { id: 1, vorname: "Max Schüler", user_role_id: 1, rolle: "Schüler" },
  2: { id: 2, vorname: "Lisa Lehrer", user_role_id: 2, rolle: "Lehrer" },
  3: { id: 3, vorname: "Admin User", user_role_id: 3, rolle: "Admin" }
};

function loadUser(req, res, next) {
  try {
    console.log('🔍 Session userId:', req.session.userId);
    
    // 1. NUR Session prüfen - kein Fallback!
    if (req.session.userId && mockUsers[req.session.userId]) {
      res.locals.currentUser = mockUsers[req.session.userId];
      req.currentUser = mockUsers[req.session.userId];
      console.log(`✅ User geladen: ${req.currentUser.vorname} (${req.currentUser.rolle})`);
      return next();
    }
    
    // 2. KEIN Fallback - wirklich null setzen
    res.locals.currentUser = null;
    req.currentUser = null;
    console.log('❌ Kein User eingeloggt');
    
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.locals.currentUser = null;
    req.currentUser = null;
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.currentUser) {
    req.flash('error', 'Bitte melde dich zuerst an!');
    return res.redirect('/auth/login');
  }
  next();
}

function requireRole(roleIds) {
  return (req, res, next) => {
    if (!req.currentUser) {
      req.flash('error', 'Bitte melde dich zuerst an!');
      return res.redirect('/auth/login');
    }
    
    if (!roleIds.includes(req.currentUser.user_role_id)) {
      req.flash('error', 'Keine Berechtigung für diese Aktion!');
      return res.redirect('/');
    }
    
    next();
  };
}

// Convenience Functions
const requireSchueler = requireRole([1]);
const requireLehrer = requireRole([2, 3]);
const requireAdmin = requireRole([3]);

module.exports = {
  loadUser,
  requireAuth,
  requireRole,
  requireSchueler,
  requireLehrer,
  requireAdmin
};