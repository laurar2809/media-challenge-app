// test-ldap.js
require('dotenv').config(); // Lädt deine .env Variablen
const { getLdapData } = require('./utils/ldapService');

console.log("--- LDAP Test gestartet ---");
console.log("Verbinde zu:", process.env.LDAP_HOST);

async function runTest() {
    try {
        const data = await getLdapData();
        const gruppenNamen = Object.keys(data);
        
        console.log(" ERFOLG!");
        console.log(`Es wurden ${gruppenNamen.length} Gruppen gefunden.`);
        
        // Zeige die ersten 5 Gruppen als Stichprobe
        console.log("Stichprobe der Gruppen:", gruppenNamen.slice(0, 5));
        
        // Teste eine spezifische Klasse, falls bekannt (z.B. 4BHELS)
        const testKlasse = gruppenNamen.find(name => name.includes('4BHELS'));
        if (testKlasse) {
            console.log(`Mitglieder in ${testKlasse}:`, data[testKlasse]);
        }

        process.exit(0);
    } catch (error) {
        console.error(" FEHLER beim LDAP-Test:");
        console.error(error.message);
        process.exit(1);
    }
}

runTest();