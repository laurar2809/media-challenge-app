const { db } = require('./db');

async function addLehrerDummy() {
    console.log("--- Erstelle Lehrer-Dummy für SQLite ---");

    try {
        // Wir definieren einen festen Test-Lehrer
        const dummyLehrer = {
            vorname: 'Test',
            nachname: 'Lehrer',
            username: 'testlehrer',
            user_role_id: 2, // Rolle: Lehrer
            schuljahr_id: 3  // Entspricht 2025/26
        };

        // Prüfen, ob dieser Dummy schon existiert
        const existing = await db('users')
            .where('username', dummyLehrer.username)
            .first();

        if (existing) {
            console.log(" Dummy-Lehrer existiert bereits.");
        } else {
            // Einfügen in die SQLite Datenbank
            await db('users').insert(dummyLehrer);
            console.log(" Lehrer-Dummy ('Test Lehrer') erfolgreich hinzugefügt.");
        }

        console.log("--- Fertig! Du kannst dich jetzt mit der '2' anmelden. ---");
        process.exit(0);
    } catch (error) {
        console.error("Fehler beim Erstellen des Dummies:", error);
        process.exit(1);
    }
}

addLehrerDummy();