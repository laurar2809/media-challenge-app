require('dotenv').config();
const { db } = require('./db');
const { getLdapData } = require('./utils/ldapService');

async function syncLdapToMySql() {
    console.log("--- Start LDAP-Sync (mit Eindeutigkeits-Check) ---");

    try {
        const ldapGroups = await getLdapData();
        console.log("LDAP-Daten erfolgreich geladen.");

        // Lösche alte Schüler (Role 1), behalte Lehrer/Admins (Role 2/3)
        console.log("Bereinige Schüler-Dummys...");
        await db('users').where('user_role_id', 1).del();

        const activeSchuljahr = await db('schuljahre').where('aktiv', 1).first() || { id: 3 };

        for (const [groupName, students] of Object.entries(ldapGroups)) {
            // Klasse prüfen/anlegen
            let klasse = await db('klassen').where('name', groupName).first();
            if (!klasse) {
                const [id] = await db('klassen').insert({ name: groupName });
                klasse = { id };
            }

            for (const student of students) {
                const parts = student.fullName.trim().split(' ');
                const nachname = parts.length > 1 ? parts.pop() : "Unbekannt";
                const vorname = parts.join(' ') || "Unbekannt";

                // Insert mit Kürzel (username) zur Eindeutigkeit
                await db('users').insert({
                    vorname: vorname,
                    nachname: nachname,
                    username: student.username, // Das eindeutige Kürzel (z.B. brunner12)
                    klasse_id: klasse.id,
                    user_role_id: 1,
                    schuljahr_id: activeSchuljahr.id,
                    created_at: db.fn.now()
                });
            }
            console.log(`Importiert: ${groupName} (${students.length} Schüler)`);
        }

        console.log(" Fertig! Alle Schüler sind jetzt mit ihren Schul-Kürzeln importiert.");
        process.exit(0);
    } catch (error) {
        console.error(" Fehler:", error);
        process.exit(1);
    }
}

syncLdapToMySql();