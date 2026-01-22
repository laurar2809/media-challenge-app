class TeamModal {
    constructor(config = {}) {
        this.modalId = config.modalId || 'teamModal';
        this.schuelerData = config.schueler || [];
        this.onSave = config.onSave || (() => {});
        this.init();
    }

    init() {
        const modal = document.getElementById(this.modalId);
        if (!modal) return;

        this.availableMembers = document.getElementById('availableMembers');
        this.teamDropZone = document.getElementById('teamDropZone');
        this.nameFilter = document.getElementById('nameFilter');
        this.classFilter = document.getElementById('classFilter');
        this.schuljahrFilter = document.getElementById('teamSchuljahrFilter'); // ID aus deinem HTML
        this.createBtn = document.getElementById('createTeamBtn');
        this.newTeamName = document.getElementById('newTeamName');
        this.filterHint = document.getElementById('filterHint');
        this.availableContainer = document.getElementById('availableMembersContainer');
        this.memberCount = document.getElementById('memberCount');

        this.bindEvents();
    }

    bindEvents() {
        // Event-Listener für alle Filter
        this.nameFilter?.addEventListener('input', () => this.filterSchueler());
        this.classFilter?.addEventListener('change', () => this.filterSchueler());
        this.schuljahrFilter?.addEventListener('change', () => this.filterSchueler());

        this.createBtn?.addEventListener('click', () => {
            const name = this.newTeamName.value.trim();
            const members = Array.from(this.teamDropZone.querySelectorAll('button[data-id]')).map(btn => ({
                id: parseInt(btn.dataset.id)
            }));

            if (!name || members.length === 0) {
                alert('Bitte Team-Namen vergeben und Mitglieder auswählen!');
                return;
            }
            this.onSave({ name, members });
        });
    }

    filterSchueler() {
        const nameTerm = this.nameFilter.value.toLowerCase();
        const klasseTerm = this.classFilter.value;
        const schuljahrTerm = this.schuljahrFilter?.value;

        // Zeige Container nur, wenn ein Filter aktiv ist
        if (!nameTerm && !klasseTerm && !schuljahrTerm) {
            this.availableContainer.style.display = 'none';
            this.filterHint.style.display = 'block';
            return;
        }

        this.availableContainer.style.display = 'block';
        this.filterHint.style.display = 'none';

        const filtered = this.schuelerData.filter(s => {
            const matchesName = !nameTerm || `${s.vorname} ${s.nachname}`.toLowerCase().includes(nameTerm);
            const matchesKlasse = !klasseTerm || s.klasse_name === klasseTerm;
            const matchesSchuljahr = !schuljahrTerm || String(s.schuljahr_id) === schuljahrTerm;
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
}