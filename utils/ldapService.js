const ldap = require("ldapjs");

async function getLdapData() {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({
      url: `ldap://${process.env.LDAP_HOST}:${process.env.LDAP_PORT}`,
      timeout: 15000,
      connectTimeout: 15000,
    });

    client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASS, (err) => {
      if (err) { client.destroy(); return reject(err); }

      const allGroupsData = {};
      // utils/ldapService.js
      const opts = {
        filter: "(sAMAccountName=*)", // Sucht JEDEN Eintrag mit einem Kürzel
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
            // DEBUG: Wir schauen uns an, was in memberOf steht
            // Du kannst das löschen, sobald es funktioniert!
            console.log(`User: ${fullName} (${username}) -> Gruppen: ${memberOf.length}`);

            memberOf.forEach(groupDn => {
              // Wir extrahieren den Namen nach CN=
              const match = groupDn.match(/^CN=([^,]+)/i);
              if (match) {
                const groupName = match[1];

                // HTL Braunau spezifisch: Klassen fangen oft mit Ziffern an
                // Falls die Klassen anders heißen (z.B. "Klasse_4BHELS"), 
                // müssen wir das Regex /^\d/ anpassen.
                if (/^\d/.test(groupName)) {
                  if (!allGroupsData[groupName]) allGroupsData[groupName] = [];
                  allGroupsData[groupName].push({ fullName, username });
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
    // Tipp: Nutze auch hier Port und Host aus der .env
    const client = ldap.createClient({ url: `ldap://${process.env.LDAP_HOST}` });
    const userPrincipalName = `${username}@ad.htl-braunau.at`;

    client.bind(userPrincipalName, password, (err) => {
      client.unbind();
      if (err) return resolve(false);
      resolve(true);
    });
  });
}

module.exports = { 
    getLdapData, 
    authenticateLDAP: authenticateUser 
};


