const ldap = require("ldapjs");

async function getLdapData() {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({
      url: `ldap://${process.env.LDAP_HOST}:${process.env.LDAP_PORT}`,
      timeout: 10000,
      connectTimeout: 10000,
    });

    // WICHTIG: Absturz verhindern, wenn der Server nicht erreichbar ist
    client.on('error', (err) => {
      console.error('LDAP-Verbindungsfehler (Sync):', err.message);
    });

    client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASS, (err) => {
      if (err) { client.destroy(); return reject(err); }

      const allGroupsData = {};
      const opts = {
        filter: "(sAMAccountName=*)",
        scope: "sub",
        attributes: ["cn", "sAMAccountName", "memberOf"],
        paged: true,
        sizeLimit: 1000
      };

      client.search(process.env.LDAP_BASE_DN, opts, (err, search) => {
        if (err) return reject(err);

        search.on("searchEntry", (entry) => {
          const fullName = entry.attributes.find(a => a.type === "cn")?.values?.[0];
          const username = entry.attributes.find(a => a.type === "sAMAccountName")?.values?.[0];
          const memberOf = entry.attributes.find(a => a.type === "memberOf")?.values || [];

          if (fullName && username) {
            const dnString = entry.dn.toString().toLowerCase();
            const isLehrer = dnString.includes("ou=lehrer");

            if (isLehrer) {
              if (!allGroupsData["_LehrerImport"]) allGroupsData["_LehrerImport"] = [];

              // Korrektur: Wir gehen davon aus, dass im LDAP "Nachname Vorname" steht
              const nameParts = fullName.split(' ');
              allGroupsData["_LehrerImport"].push({
                fullName,
                username: username.toLowerCase(),
                nachname: nameParts[0] || fullName, // Erster Teil ist meist Nachname
                vorname: nameParts[1] || "",        // Zweiter Teil Vorname
                roleId: 2
              });
            }

            memberOf.forEach(groupDn => {
              const match = groupDn.match(/^CN=([^,]+)/i);
              if (match) {
                const groupName = match[1];
                if (/^\d/.test(groupName)) {
                  if (!allGroupsData[groupName]) allGroupsData[groupName] = [];
                  allGroupsData[groupName].push({
                    fullName,
                    username: username.toLowerCase(),
                    roleId: 1
                  });
                }
              }
            });
          }
        });

        search.on("end", () => {
          client.unbind();
          resolve(allGroupsData);
        });

        search.on("error", (e) => {
          client.unbind();
          reject(e);
        });
      });
    });
  });
}

async function authenticateUser(username, password) {
  return new Promise((resolve) => {
    // Port mitsenden, falls in .env definiert
    const url = process.env.LDAP_PORT ? `ldap://${process.env.LDAP_HOST}:${process.env.LDAP_PORT}` : `ldap://${process.env.LDAP_HOST}`;
    const client = ldap.createClient({
      url: url,
      connectTimeout: 5000 // Kurzer Timeout für Login
    });

    // Absturz-Schutz für Login-Check
    client.on('error', (err) => {
      console.error('LDAP Login-Verbindungsfehler:', err.message);
      resolve(false);
    });

    const userPrincipalName = `${username}@ad.htl-braunau.at`;

    client.bind(userPrincipalName, password, (err) => {
      client.unbind();
      if (err) {
        console.log(`LDAP-Bind fehlgeschlagen für ${username}: ${err.message}`);
        return resolve(false);
      }
      resolve(true);
    });
  });
}

module.exports = {
  getLdapData,
  authenticateLDAP: authenticateUser
};