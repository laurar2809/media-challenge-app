// utils/fileHandler.js

const fs = require('fs');
const path = require('path');

// Definiert das Basisverzeichnis für Uploads
const UPLOADS_DIR = path.join(__dirname, '../public/uploads');

/**
 * Löscht eine Datei basierend auf ihrem URL-Pfad (z.B. /uploads/challenges/bild.jpg).
 * @param {string} filePath - Der relative Pfad der Datei, beginnend mit /uploads/.
 */
function deleteFile(filePath) {
    if (!filePath || typeof filePath !== 'string' || !filePath.startsWith('/uploads/')) {
        // Keine Aktion für leere oder nicht-Upload-Pfade
        return;
    }

    // Erstellt den absoluten Pfad zur Datei auf dem Server
    const absolutePath = path.join(UPLOADS_DIR, filePath.replace('/uploads/', ''));

    // Überprüfen, ob die Datei existiert, bevor versucht wird zu löschen
    if (fs.existsSync(absolutePath)) {
        try {
            fs.unlinkSync(absolutePath);
            console.log(` Datei erfolgreich gelöscht: ${filePath}`);
        } catch (error) {
            console.error(` Fehler beim Löschen der Datei ${filePath}:`, error.message);
            // Wir werfen hier keinen Fehler, damit die DB-Transaktion fortgesetzt wird.
        }
    } else {
        console.warn(` Datei nicht gefunden, konnte nicht gelöscht werden: ${filePath}`);
    }
}

module.exports = { deleteFile };