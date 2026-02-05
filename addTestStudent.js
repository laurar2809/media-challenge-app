const { db } = require('./db'); // Importiert deine Datenbank-Verbindung

async function addStudent() {
  try {
    console.log('Versuche, Test-Schüler hinzuzufügen...');

    // 1. Wir prüfen, ob die Klasse 'Testklasse' existiert, sonst erstellen wir sie
    let klasse = await db('klassen').where('name', 'TEST').first();
    let klasseId;

    if (!klasse) {
      const [id] = await db('klassen').insert({ name: 'TEST' });
      klasseId = id;
      console.log('Neue Test-Klasse erstellt.');
    } else {
      klasseId = klasse.id;
    }

    // 2. Schüler 'Schüler Test' hinzufügen
    // user_role_id 1 ist bei dir wahrscheinlich 'Schüler'
    await db('users').insert({
      vorname: 'Schüler',
      nachname: 'Test',
      username: 'testschueler', // Das Kürzel für den Login
      user_role_id: 1, 
      klasse_id: klasseId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    console.log(' Erfolg: "Schüler Test" wurde zur Datenbank hinzugefügt!');
    process.exit(0);
  } catch (error) {
    console.error(' Fehler beim Hinzufügen:', error.message);
    process.exit(1);
  }
}

addStudent();