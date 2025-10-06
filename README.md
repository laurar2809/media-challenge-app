# Node.js + Bootstrap CRUD 

**Features**
- CRUD für **Titel**, **Beschreibung**, **Icon**
- **Mehrere Datenbanken** via Knex: SQLite (default), PostgreSQL, MySQL
- **REST-API** zusätzlich zu Server-rendered Views
- **Datei-Upload** für Icons (Multer) neben Emoji/URL
- Bootstrap 5 UI

## Schnellstart

```bash
npm install
npm run start          # oder: npm run dev
```

Öffne: http://localhost:3000  
API: http://localhost:3000/api/items

## DB-Konfiguration (.env)

```ini
# DB Backend: sqlite | pg | mysql
DB_CLIENT=sqlite

# SQLite
DB_FILE=./data.sqlite

# PostgreSQL
# DB_CLIENT=pg
# DB_HOST=localhost
# DB_USER=postgres
# DB_PASS=yourpassword
# DB_NAME=postgres
# DB_PORT=5432

# MySQL
# DB_CLIENT=mysql
# DB_HOST=localhost
# DB_USER=root
# DB_PASS=yourpassword
# DB_NAME=test
# DB_PORT=3306
```

## Icon-Optionen
- **Emoji** (z. B. `⭐`) → Text/Emoji wird angezeigt
- **Bild-URL** (z. B. `https://...png`) → als Bild angezeigt
- **Datei-Upload** → liegt in `/public/uploads`, wird als Icon angezeigt

## REST-Endpunkte
- `GET /api/items` – Liste
- `GET /api/items/:id` – Detail
- `POST /api/items` – anlegen `{ title, description, icon? }`
- `PUT /api/items/:id` – ändern `{ title, description, icon? }`
- `DELETE /api/items/:id` – löschen

> Hinweis: Für `POST /api/items` wird für PostgreSQL `returning('id')` genutzt; bei SQLite/MySQL gibt Knex die neue ID als Array zurück.

## Datenbank
Es wird die sqlite Datenbank `data.sqlite` verwendet.
Visualisierung und Abfragen: https://sqliteviz.com/app/


# Auführliche Beschreibung

## 1. Genereller Aufbau: Verzeichnisstruktur & Zuständigkeiten

```
node-bootstrap-crud/
├─ server.js                # Haupteinstieg: Express-App, Routen, Middleware, Start
├─ db.js                    # DB-Setup via Knex, Tabellenerstellung, Seed, Export { db, init }
├─ package.json             # Abhängigkeiten und npm-Skripte
├─ .env                     # Umgebungsvariablen
├─ .env                     # Beispieldatei für Umgebungsvariablen
├─ README.md                # Kurz-Doku
├─ public/                  # Statische Dateien (per Express serviert)
│  ├─ style.css             # Optionales CSS
│  └─ uploads/              # Upload-Ziel für Icons (Multer legt Dateien hier ab)
└─ views/                   # EJS-Templates (Server-rendered UI)
   ├─ layout.ejs            # Basislayout (Header/Nav/Flash/Footer)
   ├─ index.ejs             # Liste aller Datensätze (CRUD-Übersicht)
   └─ form.ejs              # Formular für Neu/Bearbeiten inkl. Datei-Upload
```

### Wichtige Dateien im Detail

* **server.js**

  * Initialisiert Express, Session, Flash, Logging (morgan), Body-Parser, Method Override (`?_method=PUT/DELETE`), statische Assets.
  * Bindet `express-ejs-layouts` ein und setzt `layout.ejs` als Standardlayout.
  * Definiert **Server-rendered Routen** (`/`, `/items/new`, `/items/:id/edit`, POST/PUT/DELETE auf `/items`) und die **REST-API** (`/api/items...`).
  * Richtet **Multer** ein (`dest: public/uploads`) für Icon-Uploads.
  * Startet den Server, nachdem `init()` aus `db.js` die DB sicher vorbereitet hat.

* **db.js**

  * Liest `.env`, baut eine Knex-Instanz für **SQLite** oder **PostgreSQL (pg)** oder **MySQL (mysql2)**.
  * Erstellt die Tabelle `items` (falls nicht vorhanden) und füllt Seed-Daten ein.
  * Exportiert `db` (Knex) und `init()` (einmalige Initialisierung).

* **views/** (EJS)

  * `layout.ejs`: globales Grundgerüst, Bootstrap, Navbar, Flash-Meldungen (`res.locals.flash`), `<%- body %>` für den Seiteninhalt.
  * `index.ejs`: Tabelle mit **Icon, Titel, Beschreibung** + Buttons Bearbeiten/Löschen.
  * `form.ejs`: Formular für Titel/Beschreibung + **Datei-Upload** und **Emoji/URL-Feld**.

* **public/**

  * Statische Auslieferung durch Express (`app.use(express.static(...))`).
  * **uploads/**: hier landen Icon-Bilddateien; Pfade werden wie `/uploads/<filename>` im HTML genutzt.

---

## 2. Ablauf beim Aufruf einer Seite (Request Lifecycle)

Nehmen wir den Aufruf der Startseite `/`:

1. **Client → Server**: Browser ruft `GET /` auf.
2. **Middleware-Kette** (in `server.js`):

   * `morgan` protokolliert die Anfrage.
   * `express.static` bedient ggf. statische Dateien (CSS/Icons).
   * `express-session` stellt `req.session` bereit.
   * `express-flash` liest/schreibt Flash-Meldungen (z. B. nach POST/PUT/DELETE).
   * `res.locals.flash` Middleware macht `flash.success/error` in Templates sichtbar.
   * `express-ejs-layouts` bereitet Rendering mit `layout.ejs` vor.
3. **Route Handler**: `app.get('/', ...)`

   * Holt Datensätze: `const items = await db('items').select('*').orderBy('id', 'desc')`.
   * Rendered `index.ejs` → wird in `layout.ejs` eingebettet.
4. **Response**: Server sendet HTML zurück; Browser zeigt die Liste.

**Beispiel „Speichern“ (POST `/items`)**:

* Formular sendet Titel/Beschreibung und optional Datei (`multipart/form-data`).
* `multer` parst Upload → Datei landet in `public/uploads/…`.
* Route entscheidet: Wenn Datei vorhanden, setze `icon = '/uploads/<filename>'`, sonst übernehme Emoji/URL.
* `db('items').insert(...)`, `req.flash('success', ...)`, Redirect auf `/` (PRG-Pattern).
* Auf `/` wird Flash-Meldung angezeigt.

**REST-API**:

* `GET /api/items` → JSON-Liste
* `POST /api/items` → JSON-Antwort mit `id` (bei Postgres via `.returning('id')`)

---

## 3. Upload der Dateien (Icons)

* **Middleware**:

  ```js
  const multer = require('multer');
  const upload = multer({ dest: path.join(__dirname, 'public/uploads') });
  ```
* **Formular** (`form.ejs`):

  ```html
  <form action="..." method="POST" enctype="multipart/form-data">
    <input type="file" name="iconFile">
    <input type="text"  name="icon"> <!-- Emoji oder URL -->
  </form>
  ```
* **Route**:

  ```js
  app.post('/items', upload.single('iconFile'), async (req, res) => {
    let { title, description, icon } = req.body;
    if (req.file) icon = '/uploads/' + req.file.filename;
    await db('items').insert({ title, description, icon });
    req.flash('success', 'Datensatz erfolgreich angelegt.');
    res.redirect('/');
  });
  ```
* **Anzeige**: In der Liste wird unterschieden:

  * **URL** (`https://…`) → `<img src="...">`
  * **Upload-Pfad** (`/uploads/...`) → `<img src="...">`
  * **Emoji/Text** → `<span>⭐</span>`

**Hinweis zur Sicherheit/Robustheit (für später):**

* Dateityp prüfen (MIME/Endung), Max-Größe setzen.
* Sinnvolleren Dateinamen speichern (z. B. Originalname + Hash).
* Alte Dateien beim Ersetzen/Löschen aufräumen (wird beim Löschen bereits versucht).
* Optional: CDN/S3 statt lokalem Filesystem.



---

## 4. MySQL oder PostgreSQL verwenden

Die App unterstützt das bereits – wird über `.env` eingestellt.
MySQL oder PostgreSQL musst erst installiert werden.

**SQLite (einfachster Start):**

```ini
PORT=3000
SESSION_SECRET=geheim123
DB_CLIENT=sqlite
DB_FILE=./data.sqlite
```

**PostgreSQL (Docker/Homebrew):**

```ini
PORT=3000
SESSION_SECRET=geheim123
DB_CLIENT=pg
DB_HOST=localhost
DB_USER=postgres
DB_PASS=pass123
DB_NAME=testdb
DB_PORT=5432
```

**MySQL (Docker/Homebrew):**

```ini
PORT=3000
SESSION_SECRET=geheim123
DB_CLIENT=mysql
DB_HOST=localhost
DB_USER=root
DB_PASS=pass123
DB_NAME=testdb
DB_PORT=3306
```


