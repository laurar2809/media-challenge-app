class TeamModal {
  constructor(config = {}) {
    this.modalId = config.modalId || 'teamModal';
    this.schuelerData = config.schueler || [];
    this.onSave = config.onSave || (() => alert('Gespeichert!'));
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      const modal = document.getElementById(this.modalId);
      if (!modal) return console.error('Modal nicht gefunden:', this.modalId);

      this.availableMembers = document.getElementById('availableMembers');
      this.teamDropZone = document.getElementById('teamDropZone');
      this.nameFilter = document.getElementById('nameFilter');
      this.classFilter = document.getElementById('classFilter');
      this.createBtn = document.getElementById('createTeamBtn');
      this.newTeamName = document.getElementById('newTeamName');
      this.filterHint = document.getElementById('filterHint');
      this.availableContainer = document.getElementById('availableMembersContainer');
      this.memberCount = document.getElementById('memberCount');

      // Filter-Hint zeigen (Challenges-Verhalten!)
      if (this.filterHint) this.filterHint.style.display = 'block';
      if (this.availableContainer) this.availableContainer.style.display = 'none';

      this.bindEvents();
      console.log('🎉 TeamModal bereit - Filter first!');
    });
  }

  renderSchueler(filtered = this.schuelerData) {
    this.availableMembers.innerHTML = '';
    filtered.forEach(schueler => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-outline-primary me-1 mb-1 drag-item';
      btn.draggable = true;
      btn.dataset.id = schueler.id;
      btn.dataset.vorname = schueler.vorname;
      btn.dataset.nachname = schueler.nachname;
      btn.dataset.klasse = schueler.klasse_name;
      btn.innerHTML = `${schueler.vorname} ${schueler.nachname} <small class="text-muted">(${schueler.klasse_name})</small>`;

      // 1️⃣ CLICK-TO-ADD (Challenges!)
      btn.addEventListener('click', () => this.addMemberToDropZone(btn));

      // 2️⃣ Drag & Drop
      btn.addEventListener('dragstart', this.handleDragStart.bind(this));

      this.availableMembers.appendChild(btn);
    });
    this.updateCounts();
  }

  addMemberToDropZone(memberElement) {
    const id = memberElement.dataset.id;
    if (this.teamDropZone.querySelector(`[data-id="${id}"]`)) return;

    // Challenges-Button-Style mit ×
    const teamBtn = document.createElement('button');
    teamBtn.type = 'button';
    teamBtn.className = 'btn btn-sm btn-custom-safe text-white me-1 mb-1';
    teamBtn.innerHTML = `
      ${memberElement.dataset.vorname} ${memberElement.dataset.nachname} (${memberElement.dataset.klasse})
      <span class="ms-1" style="cursor:pointer;font-weight:bold;">×</span>
    `;
    teamBtn.dataset.id = id;
    teamBtn.dataset.vorname = memberElement.dataset.vorname;
    teamBtn.dataset.nachname = memberElement.dataset.nachname;
    teamBtn.dataset.klasse = memberElement.dataset.klasse;

    // × zum Entfernen (Challenges!)
    teamBtn.querySelector('span').addEventListener('click', (e) => {
      e.stopPropagation();
      teamBtn.remove();
      // Original re-aktivieren
      const orig = this.availableMembers.querySelector(`[data-id="${id}"]`);
      if (orig) orig.classList.remove('opacity-50', 'disabled');
      this.updateCounts();
    });

    this.teamDropZone.appendChild(teamBtn);
    this.updateCounts();
  }

  bindEvents() {
    // Filter (Challenges-Verhalten!)
    this.nameFilter?.addEventListener('input', () => this.filterSchueler());
    this.classFilter?.addEventListener('change', () => this.filterSchueler());

    // Drag & Drop
    this.teamDropZone.addEventListener('dragover', e => e.preventDefault());
    this.teamDropZone.addEventListener('drop', this.handleDrop.bind(this));
    this.teamDropZone.addEventListener('dragenter', e => e.preventDefault());

    // Save (mit POST)
    this.createBtn?.addEventListener('click', () => {
      const name = this.newTeamName.value.trim();
      const members = Array.from(this.teamDropZone.querySelectorAll('button[data-id]')).map(btn => ({
        id: parseInt(btn.dataset.id),
        vorname: btn.dataset.vorname,
        nachname: btn.dataset.nachname,
        klasse: btn.dataset.klasse
      }));

      if (!name || members.length === 0) {
        alert('Team Name + mind. 1 Mitglied!');
        return;
      }

      this.onSave({ name, members });
      this.newTeamName.value = '';
      
      // Modal schließen
      const modalEl = document.getElementById(this.modalId);
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    });
  }

  filterSchueler() {
    const name = this.nameFilter.value.toLowerCase();
    const klasse = this.classFilter.value;

    // Challenges: Hide wenn kein Filter!
    if (!name && !klasse) {
      if (this.availableContainer) this.availableContainer.style.display = 'none';
      if (this.filterHint) this.filterHint.style.display = 'block';
      this.availableMembers.innerHTML = '';
      this.updateCounts();
      return;
    }

    // Filter anzeigen
    if (this.availableContainer) this.availableContainer.style.display = 'block';
    if (this.filterHint) this.filterHint.style.display = 'none';

    const filtered = this.schuelerData.filter(s => 
      (!name || `${s.vorname} ${s.nachname}`.toLowerCase().includes(name)) &&
      (!klasse || s.klasse_name === klasse)
    );
    this.renderSchueler(filtered);
  }

  handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
  }

  handleDrop(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const member = Array.from(this.availableMembers.querySelectorAll('button')).find(b => b.dataset.id === id);
    if (member) {
      this.addMemberToDropZone(member);
    }
  }

  updateCounts() {
    const availCount = this.availableMembers.querySelectorAll('button').length;
    const teamCount = this.teamDropZone.querySelectorAll('button[data-id]').length;
    
    if (document.getElementById('availableCount')) {
      document.getElementById('availableCount').textContent = availCount;
    }
    if (document.getElementById('teamMemberCount')) {
      document.getElementById('teamMemberCount').textContent = teamCount;
    }
    if (this.memberCount) {
      this.memberCount.textContent = `${teamCount} Mitglieder ausgewählt`;
    }
  }
}

// Global
document.addEventListener('DOMContentLoaded', () => {
  window.TeamModal = TeamModal;
});
