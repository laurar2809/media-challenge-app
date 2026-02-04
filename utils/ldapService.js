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
            // 1. Logik für LEHRER: Wir prüfen, ob im Distinguished Name "OU=Lehrer" vorkommt
            // Alternativ kannst du auch nach einer Gruppe "CN=G_Lehrer" suchen
            const dnString = entry.dn.toString().toLowerCase();
           const isLehrer = dnString.includes("ou=lehrer");
           
            if (isLehrer) {
              if (!allGroupsData["_LehrerImport"]) allGroupsData["_LehrerImport"] = [];

              // Wir trennen den vollen Namen grob in Vor- und Nachname
              const nameParts = fullName.split(' ');
              allGroupsData["_LehrerImport"].push({
                fullName,
                username: username.toLowerCase(),
                vorname: nameParts[1] || "",
                nachname: nameParts[0] || fullName,
                roleId: 2 // WICHTIG: Lehrer-ID
              });
            }

            // 2. Deine bestehende Logik für SCHÜLER (Klassen)
            memberOf.forEach(groupDn => {
              const match = groupDn.match(/^CN=([^,]+)/i);
              if (match) {
                const groupName = match[1];
                // Wenn Gruppe mit einer Zahl beginnt (z.B. 4BHELS), ist es eine Klasse
                if (/^\d/.test(groupName)) {
                  if (!allGroupsData[groupName]) allGroupsData[groupName] = [];
                  allGroupsData[groupName].push({
                    fullName,
                    username: username.toLowerCase(),
                    roleId: 1 // WICHTIG: Schüler-ID
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


