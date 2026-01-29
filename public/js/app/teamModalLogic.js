
class TeamModal {
    constructor(config) {
        this.modalId = config.modalId;
        this.onSave = config.onSave; // Hier übergeben wir die "Speichern"-Aktion!
        this.init();
    }

    init() {
        // Event-Listener für Drag & Drop, Filter etc.
        document.getElementById('modalSubmitBtn').addEventListener('click', () => {
            const data = this.collectData();
            this.onSave(data); // Führt entweder DB-Speichern oder Listen-Update aus
        });
    }
}