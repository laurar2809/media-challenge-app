const { db } = require('./db');
const { getLdapData } = require('./utils/ldapService');

async function runLehrerSync() {
    console.log("--- START: Lehrer-Synchronisierung ---");

    try {
        // 1. LDAP Daten abrufen
        const allData = await getLdapData();
        const lehrerListe = allData["_LehrerImport"] || [];

        if (lehrerListe.length === 0) {
            console.warn("⚠️ Keine Lehrer-Daten im LDAP gefunden. Pfad 'OU=Lehrer' prüfen!");
            process.exit(0);
        }

        console.log(` ${lehrerListe.length} Lehrer im LDAP gefunden.`);

        // 2. Bestehende Lehrer (Rolle 2) löschen
        // WICHTIG: Das löscht nur Lehrer, keine Admins (3) oder Schüler (1)
        const deletedCount = await db('users').where('user_role_id', 2).del();
        console.log(` ${deletedCount} alte Lehrer/Dummies aus DB entfernt.`);

        // 3. Neue Lehrer einfügen
        let successCount = 0;
        for (const l of lehrerListe) {
            try {
                await db('users').insert({
                    vorname: l.vorname,
                    nachname: l.nachname,
                    username: l.username,
                    user_role_id: 2, // Rolle: Lehrer
                    schuljahr_id: 3  // Dein aktuelles Schuljahr laut SQL-Dump
                });
                successCount++;
            } catch (insertErr) {
                console.error(` Fehler beim Import von ${l.username}:`, insertErr.message);
            }
        }

        console.log(` Sync beendet. ${successCount} Lehrer erfolgreich importiert.`);
        process.exit(0);

    } catch (error) {
        console.error("Kritischer Fehler beim Sync-Prozess:", error);
        process.exit(1);
    }
}

runLehrerSync();