document.addEventListener('DOMContentLoaded', function () {
  console.log('challengesFormLogic initialisiert');

  // === 1. DATEN & ELEMENTE ===
  const schuelerDataElement = document.getElementById('schuelerData');
  const schuelerListe = schuelerDataElement ? JSON.parse(schuelerDataElement.dataset.schueler) : [];

  const teamsContainer = document.getElementById('teamsContainer');
  const teamsDataInput = document.getElementById('teamsData');
  const noTeamsMessage = document.getElementById('noTeamsMessage');
  const challengeForm = document.getElementById('challengeForm');

  let teams = []; // Das zentrale Array für alle zugewiesenen Teams
  let currentEditIndex = -1;

  // === 2. HILFSFUNKTIONEN FÜR FILTER & DATEN ===

  const populateModalFilters = () => {
    const classSelect = document.getElementById('classFilter');
    if (!classSelect) return;

    const klassen = [...new Set(schuelerListe.map(s => s.klasse_name))].sort();
    classSelect.innerHTML = '<option value="alle" selected>Alle Klassen</option>';

    klassen.forEach(k => {
      if (k) {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = k;
        classSelect.appendChild(opt);
      }
    });
  };

  function updateTeamsData() {
    if (teamsDataInput) {
      teamsDataInput.value = JSON.stringify(teams);
    }
  }

  function renderTeams() {
    if (!teamsContainer) return;
    teamsContainer.innerHTML = '';

    if (noTeamsMessage) {
      noTeamsMessage.style.display = teams.length > 0 ? 'none' : 'block';
    }

    teams.forEach((team, index) => {
      const teamCard = document.createElement('div');
      teamCard.className = 'card mb-2 w-100 border-start border-primary border-4 shadow-sm';

      const memberList = (team.members && team.members.length > 0)
        ? team.members.map(m => `<span class="badge bg-light text-dark border me-1">${m.vorname} ${m.nachname}</span>`).join('')
        : '<span class="text-muted small"><i>Keine Mitglieder gefunden</i></span>';

      teamCard.innerHTML = `
      <div class="card-body p-3">
    <div class="d-flex justify-content-between align-items-center">
        <h6 class="mb-0 fw-bold">
            <i class="bi bi-people-fill me-2 text-primary"></i>${team.name}
        </h6>
        
        <div class="d-flex gap-1"> 
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.editChallengeTeam(${index})">
                Bearbeiten
            </button>
            <button type="button" class="btn btn-sm btn-custom-delete" onclick="window.removeChallengeTeam(${index})">
                Löschen
            </button>
        </div>
    </div> <div class="mt-2">${memberList}</div>
</div>`;
      teamsContainer.appendChild(teamCard);
    });
  }

  // === 3. TEAM-MODAL INITIALISIEREN ===

  window.teamModalInstance = new TeamModal({
    modalId: 'teamModal',
    schueler: schuelerListe,
    onSave: (data) => {
      if (currentEditIndex > -1) {
        // Bearbeiten
        teams[currentEditIndex] = {
          ...teams[currentEditIndex],
          name: data.name,
          members: data.members
        };
      } else {
        // Neu erstellen
        teams.push({
          id: `new-${Date.now()}`,
          name: data.name,
          members: data.members
        });
      }
      renderTeams();
      updateTeamsData();
      bootstrap.Modal.getInstance(document.getElementById('teamModal')).hide();
    }
  });

  // Global machen für die onclick-Attribute in den Team-Karten
  window.editChallengeTeam = (index) => {
    currentEditIndex = index;
    const teamToEdit = teams[index];
    if (window.teamModalInstance) {
      window.teamModalInstance.prepareEdit({
        id: teamToEdit.id,
        name: teamToEdit.name,
        mitglieder_ids: teamToEdit.members.map(m => String(m.id)).join(',')
      });
    }
  };

  // === 4. BESTEHENDES TEAM HINZUFÜGEN ===

  // === 4b. AUTOMATISCHES HINZUFÜGEN BEIM AUSWÄHLEN ===
  const existingTeamSelect = document.getElementById('existingTeamSelect');

  if (existingTeamSelect) {
    existingTeamSelect.addEventListener('change', function () {
      const teamId = this.value;
      if (!teamId) return;

      const teamOption = this.selectedOptions[0];
      const memberIdsString = teamOption.dataset.members || "";
      const memberIds = memberIdsString.split(',').map(id => id.trim()).filter(id => id !== "");

      const membersObjects = schuelerListe.filter(s => memberIds.includes(String(s.id)));

      if (teams.some(t => String(t.id) === `existing-${teamId}`)) {
        alert("Dieses Team ist bereits zugewiesen.");
        this.value = ''; // Dropdown zurücksetzen
        return;
      }

      teams.push({
        id: `existing-${teamId}`,
        name: teamOption.getAttribute('data-name') || teamOption.text.split(' (')[0],
        members: membersObjects
      });

      renderTeams();
      updateTeamsData();

      this.value = ''; // Dropdown zurücksetzen
    });
  }

  // === 5. MODAL-ÖFFNEN LOGIK (NEUES TEAM) ===

  const openModalBtn = document.getElementById('openCreateTeamModal');
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      window.currentEditIndex = -1;

      // Cleanup Backdrops
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');

      // Filter zurücksetzen
      if (document.getElementById('classFilter')) document.getElementById('classFilter').value = 'alle';

      // Schuljahr-Synchronisation
      const currentYear = document.querySelector('select[name="schuljahr_id"]')?.value;
      const modalYearFilter = document.getElementById('teamSchuljahrFilter');
      if (currentYear && modalYearFilter) {
        modalYearFilter.value = currentYear;
      }

      window.teamModalInstance.prepareCreate();
      window.teamModalInstance.renderAvailable();

      const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('teamModal'));
      modal.show();
    });
  }

  // === 6. TEAM ENTFERNEN (LOKAL) ===

  let indexToDelete = -1;
  window.removeChallengeTeam = (index) => {
    indexToDelete = index;
    const modalEl = document.getElementById('confirmDeleteModal');
    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const modalBody = modalEl.querySelector('.modal-body');
    if (modalBody) modalBody.innerText = "Möchtest du dieses Team wirklich von dieser Challenge entfernen?";
    bsModal.show();
  };

  document.getElementById('confirmDeleteSubmitChallenge')?.addEventListener('click', function () {
    if (indexToDelete > -1) {
      teams.splice(indexToDelete, 1);
      renderTeams();
      updateTeamsData();
      const modalEl = document.getElementById('confirmDeleteModal');
      bootstrap.Modal.getInstance(modalEl).hide();
      indexToDelete = -1;
    }
  });

  // === 7. INITIALISIERUNG & FORM-SUBMIT ===

  if (challengeForm) {
    challengeForm.addEventListener('submit', function (e) {
      updateTeamsData();
      if (teams.length === 0) {
        e.preventDefault();
        alert('Bitte weisen Sie mindestens ein Team zu!');
      }
    });
  }

  const initData = () => {
    const teamsDataInput = document.getElementById('teamsData');
    if (teamsDataInput && teamsDataInput.value && teamsDataInput.value !== '[]') {
      try {
        const parsed = JSON.parse(teamsDataInput.value);
        teams = parsed.map(t => ({
          id: t.id,
          name: t.name,
          members: t.members || []
        }));
        renderTeams();
      } catch (e) {
        console.error("Fehler beim Initialisieren:", e);
      }
    } else {
      renderTeams();
    }
  };

  // Alles starten
  populateModalFilters();
  initData();
});