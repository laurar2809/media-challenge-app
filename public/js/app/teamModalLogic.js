class TeamModal {
    constructor(config) {
        this.modalElement = document.getElementById(config.modalId);
        if (!this.modalElement) return;

        this.schueler = config.schueler || [];
        this.onSave = config.onSave;
        this.bsModal = null;

        // DOM Elemente suchen
        this.nameInput = this.modalElement.querySelector('#newTeamName');
        this.availableContainer = this.modalElement.querySelector('#availableMembers');
        this.dropZone = this.modalElement.querySelector('#teamDropZone');
        this.submitBtn = this.modalElement.querySelector('#modalSubmitBtn');
        this.memberCountText = this.modalElement.querySelector('#memberCount');
        this.nameFilter = this.modalElement.querySelector('#nameFilter');
        this.classFilter = this.modalElement.querySelector('#classFilter');

        this.init();
    }

    init() {
        // Event Listener für Filter (Suchen & Klasse)
        this.nameFilter?.addEventListener('input', () => this.renderAvailable());
        this.classFilter?.addEventListener('change', () => this.renderAvailable());

        // Speichern-Button
        this.submitBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSave();
        });

        // Cleanup-Logik wenn das Modal geschlossen wird
        this.modalElement.addEventListener('hidden.bs.modal', () => {
            this.cleanup();
        });
    }

    // Zeigt die verfügbaren Schüler an (links im Modal)
    renderAvailable() {
        if (!this.availableContainer) return;

        const query = this.nameFilter?.value.toLowerCase() || "";
        const klasse = this.classFilter?.value || "";

        this.availableContainer.innerHTML = '';

        const filtered = this.schueler.filter(s => {
            const matchesName = `${s.vorname} ${s.nachname}`.toLowerCase().includes(query);
            const matchesKlasse = !klasse || s.klasse_name === klasse;
            // Nur anzeigen, wenn noch nicht ausgewählt
            const isSelected = !!this.dropZone.querySelector(`[data-id="${s.id}"]`);
            return matchesName && matchesKlasse && !isSelected;
        });

        if (filtered.length === 0) {
            this.availableContainer.innerHTML = '<div class="text-muted small p-2">Keine Schüler gefunden</div>';
            return;
        }

        filtered.forEach(s => {
            const btn = document.createElement('button');
            btn.type = "button";
            btn.className = 'btn btn-sm btn-outline-primary m-1';
            btn.innerHTML = `${s.vorname} ${s.nachname} <small class="opacity-75">(${s.klasse_name || '?'})</small>`;
            btn.onclick = () => this.addMember(s);
            this.availableContainer.appendChild(btn);
        });
    }

    // Fügt einen Schüler zur Auswahl hinzu (rechts im Modal)
    addMember(s) {
        // Platzhalter-Text entfernen
        const placeholder = this.dropZone.querySelector('p');
        if (placeholder) placeholder.remove();

        // Duplikate verhindern
        if (this.dropZone.querySelector(`[data-id="${s.id}"]`)) return;

        const badge = document.createElement('div');
        badge.className = 'badge bg-primary p-2 m-1 d-flex align-items-center justify-content-between';
        badge.style.fontSize = '0.9rem';
        badge.dataset.id = s.id;
        badge.dataset.vorname = s.vorname;
        badge.dataset.nachname = s.nachname;
        badge.dataset.klasse = s.klasse_name;

        badge.innerHTML = `
            <span>${s.vorname} ${s.nachname}</span>
            <i class="bi bi-x-circle ms-2 cursor-pointer" style="cursor:pointer"></i>
        `;

        badge.querySelector('i').onclick = () => {
            badge.remove();
            this.updateUI();
        };

        this.dropZone.appendChild(badge);
        this.updateUI();
    }

    updateUI() {
        this.renderAvailable();
        const count = this.dropZone.querySelectorAll('[data-id]').length;
        if (this.memberCountText) {
            this.memberCountText.textContent = `${count} Mitglieder ausgewählt`;
        }
    }

    // Modal öffnen & Reset
    prepareCreate() {
        this.nameInput.value = '';
        this.dropZone.innerHTML = '<p class="text-muted text-center w-100 mt-3 small">Noch keine Mitglieder hinzugefügt</p>';
        if (this.nameFilter) this.nameFilter.value = '';
        if (this.classFilter) this.classFilter.value = '';

        this.updateUI();
        this.show();
    }

    // Modal öffnen für Bearbeitung
    prepareEdit(team) {
        this.nameInput.value = team.name;
        this.dropZone.innerHTML = '';

        // Mitglieder wiederherstellen
        const ids = team.mitglieder_ids ? String(team.mitglieder_ids).split(',') : [];
        ids.forEach(id => {
            const s = this.schueler.find(sch => String(sch.id) === String(id));
            if (s) this.addMember(s);
        });

        this.updateUI();
        this.show();
    }

    show() {
        this.bsModal = new bootstrap.Modal(this.modalElement, {
            backdrop: 'static',
            keyboard: true
        });
        this.bsModal.show();
    }

    hide() {
        if (this.bsModal) this.bsModal.hide();
    }

    handleSave() {
        const members = Array.from(this.dropZone.querySelectorAll('[data-id]')).map(el => ({
            id: el.dataset.id,
            vorname: el.dataset.vorname,
            nachname: el.dataset.nachname,
            klasse: el.dataset.klasse
        }));
        const name = this.nameInput.value.trim();

        if (!name || members.length === 0) {
            alert("Bitte Name und Mitglieder eingeben!");
            return;
        }

        // 1. Modal-Instanz holen und schließen
        const modalInstance = bootstrap.Modal.getOrCreateInstance(this.modalElement);
        modalInstance.hide();

        // 2. DER STARRE-BRECHER (Timeout)
        // Wir warten, bis die Animation fast fertig ist
        setTimeout(() => {
            // Daten erst JETZT speichern, um DOM-Konflikte zu vermeiden
            this.onSave({ name, members });

            // RADIKAL-REINIGUNG: Wir löschen alles, was das Scrollen blockiert
            document.body.classList.remove('modal-open');
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());

            // CSS-Eigenschaften manuell zurücksetzen
            document.body.style.overflow = 'auto';
            document.body.style.paddingRight = '0px';

            console.log("Scroll-Sperre manuell aufgehoben.");
        }, 350);
    }
}