const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.sqlite');

db.serialize(() => {
    console.log("Starte Bereinigung der SQLite-Datenbank...");

    // 1. Die überflüssige Tabelle 'schueler' löschen
    db.run(`DROP TABLE IF EXISTS schueler;`, (err) => {
        if (err) console.error("Fehler beim Löschen von 'schueler':", err.message);
        else console.log("Tabelle 'schueler' wurde gelöscht.");
    });

    // 2. Tabelle 'teams' auf MySQL-Stand bringen
    // Wir erstellen sie neu, damit sie exakt die Spalten: id, name, created_at, updated_at, schuljahr_id hat
    db.run(`CREATE TABLE IF NOT EXISTS teams_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        schuljahr_id INTEGER
    );`);
    
    // Daten aus der alten teams-Tabelle retten
    db.run(`INSERT INTO teams_new (id, name, created_at, updated_at, schuljahr_id) 
            SELECT id, name, created_at, updated_at, schuljahr_id FROM teams;`, (err) => {
        if (!err) {
            db.run(`DROP TABLE teams;`);
            db.run(`ALTER TABLE teams_new RENAME TO teams;`);
            console.log("Tabelle 'teams' wurde an MySQL angepasst.");
        }
    });

    // 3. Tabelle 'team_mitglieder' korrigieren (user_id statt schueler_id)
    db.run(`CREATE TABLE IF NOT EXISTS team_mitglieder_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rolle VARCHAR(20) DEFAULT 'mitglied',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Daten migrieren: Wir nehmen die ID, egal ob sie in user_id oder schueler_id stand
    db.run(`INSERT INTO team_mitglieder_new (id, team_id, user_id, rolle, created_at, updated_at)
            SELECT id, team_id, COALESCE(user_id, schueler_id), rolle, created_at, updated_at FROM team_mitglieder;`, (err) => {
        if (!err) {
            db.run(`DROP TABLE team_mitglieder;`);
            db.run(`ALTER TABLE team_mitglieder_new RENAME TO team_mitglieder;`);
            console.log("Tabelle 'team_mitglieder' wurde korrigiert (nutzt jetzt user_id).");
        } else {
            console.error("Fehler bei Migration team_mitglieder:", err.message);
        }
    });

    console.log("Fertig! SQLite ist jetzt synchron zu MySQL (nur noch 'users', keine 'schueler').");
});

db.close();