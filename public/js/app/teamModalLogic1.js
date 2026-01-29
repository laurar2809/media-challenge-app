class TeamModal {
    constructor(config = {}) {
        this.modalId = config.modalId || 'teamModal';
        this.schuelerData = config.schueler || [];
        this.onSave = config.onSave || (() => { });
        this.init();
    }

    init() {
        const modal = document.getElementById(this.modalId);
        if (!modal) return;

        this.availableMembers = document.getElementById('availableMembers');
        this.teamDropZone = document.getElementById('teamDropZone');
        this.nameFilter = document.getElementById('nameFilter');
        this.classFilter = document.getElementById('classFilter');
        this.schuljahrFilter = document.getElementById('teamSchuljahrFilter');
        this.createBtn = document.getElementById('createTeamBtn');

        // NEU: Den Speicher-Button registrieren
        this.saveBtn = document.getElementById('saveTeamBtn');

        this.newTeamName = document.getElementById('newTeamName');
        this.filterHint = document.getElementById('filterHint');
        this.availableContainer = document.getElementById('availableMembersContainer');
        this.memberCount = document.getElementById('memberCount');

        this.bindEvents();
    }

    bindEvents() {
        // 1. Event-Listener für alle Filter (Suche im Modal)
        this.nameFilter?.addEventListener('input', () => this.filterSchueler());
        this.classFilter?.addEventListener('change', () => this.filterSchueler());
        this.schuljahrFilter?.addEventListener('change', () => this.filterSchueler());

        // 2. Event für "Team erstellen" (POST)
        this.createBtn?.addEventListener('click', () => {
            this.submitData();
        });

        // 3. Event für "Änderungen speichern" (PUT)
        this.saveBtn?.addEventListener('click', () => {
            this.submitData();
        });

        // 4. RESET-Logik beim Klick auf den "Neues Team erstellen" Button in der EJS
        const openBtn = document.getElementById('openCreateTeamModal');
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                this.resetModal();
            });
        }
    }

    // Hilfsmethode zum Leeren des Modals
    resetModal() {
        this.currentEditId = null;
        this.newTeamName.value = '';
        this.teamDropZone.innerHTML = '<p class="text-muted text-center mb-0 w-100">Schüler hierher ziehen oder klicken</p>';
        document.querySelector('#teamModalLabel').textContent = 'Neues Team erstellen';
        this.createBtn.style.display = 'block';
        if (this.saveBtn) this.saveBtn.style.display = 'none';
        this.updateCounts();
    }

    submitData() {
        const name = this.newTeamName.value.trim();
        const members = Array.from(this.teamDropZone.querySelectorAll('button[data-id]')).map(btn => ({
            id: parseInt(btn.dataset.id)
        }));

        if (!name || members.length === 0) {
            alert('Bitte Team-Namen vergeben und Mitglieder auswählen!');
            return;
        }

        this.onSave({ name, members });
    }

    filterSchueler() {


        const nameTerm = this.nameFilter.value.toLowerCase();
        const klasseTerm = this.classFilter.value;
        const schuljahrTerm = this.schuljahrFilter?.value;

        // Nur anzeigen, wenn mindestens ein Filter aktiv ist
        if (!nameTerm && !klasseTerm && !schuljahrTerm) {
            this.availableContainer.style.display = 'none';
            this.filterHint.style.display = 'block';
            return;
        }

        this.availableContainer.style.display = 'block';
        this.filterHint.style.display = 'none';

        const filtered = this.schuelerData.filter(s => {
            // 1. Suche nach Vorname + Nachname
            const fullName = `${s.vorname} ${s.nachname}`.toLowerCase();
            const matchesName = !nameTerm || fullName.includes(nameTerm);

            // 2. Suche nach Klasse (Muss s.klasse_name sein!)
            const matchesKlasse = !klasseTerm || s.klasse_name === klasseTerm;

            // 3. Suche nach Schuljahr (Wichtig: s.schuljahr_id prüfen und null abfangen)
            const sSchuljahr = s.schuljahr_id ? String(s.schuljahr_id) : '';
            const matchesSchuljahr = !schuljahrTerm || sSchuljahr === schuljahrTerm;

            return matchesName && matchesKlasse && matchesSchuljahr;
        });

        this.renderSchueler(filtered);
    }

    renderSchueler(filtered) {
        this.availableMembers.innerHTML = '';
        filtered.forEach(s => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-sm btn-outline-primary me-1 mb-1';
            btn.dataset.id = s.id;
            btn.innerHTML = `${s.vorname} ${s.nachname} <small>(${s.klasse_name || '?'})</small>`;
            btn.onclick = () => this.addMemberToDropZone(s);
            this.availableMembers.appendChild(btn);
        });
    }

    addMemberToDropZone(s) {
        if (this.teamDropZone.querySelector(`[data-id="${s.id}"]`)) return;

        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-success me-1 mb-1';
        btn.dataset.id = s.id;
        btn.innerHTML = `${s.vorname} ${s.nachname} <span class="ms-1">&times;</span>`;
        btn.onclick = () => {
            btn.remove();
            this.updateCounts();
        };

        this.teamDropZone.appendChild(btn);
        this.updateCounts();
    }

    updateCounts() {
        const count = this.teamDropZone.querySelectorAll('button[data-id]').length;
        if (this.memberCount) this.memberCount.textContent = `${count} Mitglieder ausgewählt`;
    }

    // Füge diese Methode zu deiner TeamModal Klasse hinzu:
    editTeam(team) {
        this.currentEditId = team.id;
        this.newTeamName.value = team.name;

        // 1. Die DropZone leeren, damit keine Reste vom vorherigen Mal da sind
        this.teamDropZone.innerHTML = '';

        // 2. Jedes Mitglied des Teams einzeln zur Auswahl hinzufügen
        if (team.members && team.members.length > 0) {
            team.members.forEach(member => {
                // Wir nutzen deine bestehende Funktion, um den grünen Button zu erstellen
                this.addMemberToDropZone(member);
            });
        } else {
            // Falls keine Mitglieder da sind, den Platzhalter zeigen
            this.teamDropZone.innerHTML = '<p class="text-muted text-center mb-0 w-100">Schüler hierher ziehen oder klicken</p>';
        }

        // Buttons anpassen
        document.querySelector('#teamModalLabel').textContent = 'Team bearbeiten';
        this.createBtn.style.display = 'none';
        document.getElementById('saveTeamBtn').style.display = 'block';

        const modalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById(this.modalId));
        modalInstance.show();

        // Counter aktualisieren
        this.updateCounts();
    }


}