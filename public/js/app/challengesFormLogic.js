document.addEventListener('DOMContentLoaded', function () {
  console.log('challengesFormLogic initialisiert');

  // === 1. DATEN & ELEMENTE ===
  const schuelerDataElement = document.getElementById('schuelerData');
  const schuelerListe = schuelerDataElement ? JSON.parse(schuelerDataElement.dataset.schueler) : [];

  const teamsContainer = document.getElementById('teamsContainer');
  const teamsDataInput = document.getElementById('teamsData');
  const noTeamsMessage = document.getElementById('noTeamsMessage');
  const challengeForm = document.getElementById('challengeForm');

  let teams = [];
  let currentEditIndex = -1;

  

  const populateModalFilters = () => {
    const classSelect = document.getElementById('classFilter');
    if (!classSelect) return;

    // 1. Bestehende Klassen holen
    const klassen = [...new Set(schuelerListe.map(s => s.klasse_name))].sort();

    // 2. WICHTIG: Erst das Dropdown leeren, DANN die Standard-Option und die Klassen rein
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

  // Dieser Aufruf MUSS hier stehen, damit es beim Laden passiert!
  populateModalFilters();


  // === 2. TEAM-MODAL INITIALISIEREN ===
  window.teamModalInstance = new TeamModal({
    modalId: 'teamModal',
    schueler: schuelerListe,
    onSave: (data) => {
      if (currentEditIndex > -1) {
        teams[currentEditIndex] = {
          ...teams[currentEditIndex],
          name: data.name,
          members: data.members
        };
      } else {
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

  // (Die Funktionen window.editChallengeTeam, updateTeamsData, renderTeams bleiben gleich...)

  window.editChallengeTeam = (index) => {
    currentEditIndex = index;
    const teamToEdit = teams[index];
    if (window.teamModalInstance) {
      window.teamModalInstance.prepareEdit({
        id: teamToEdit.id,
        name: teamToEdit.name,
        mitglieder_ids: teamToEdit.members.map(m => m.id).join(',')
      });
    }
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
              <h6 class="mb-0 fw-bold"><i class="bi bi-people-fill me-2 text-primary"></i>${team.name}</h6>
              <div class="btn-group">
                  <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.editChallengeTeam(${index})">
                      <i class="bi bi-pencil"></i>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.removeChallengeTeam(${index})">
                      <i class="bi bi-trash"></i>
                  </button>
              </div>
          </div>
          <div class="mt-2">${memberList}</div>
      </div>`;
      teamsContainer.appendChild(teamCard);
    });
  }

  // (AddExistingBtn Logik bleibt gleich...)

  // --- ANPASSUNG BEIM ÖFFNEN DES MODALS ---
  // --- ANPASSUNG BEIM ÖFFNEN DES MODALS ---
  const openModalBtn = document.getElementById('openCreateTeamModal');
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      window.currentEditIndex = -1;
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');

      // 1. Zuerst die Filter auf Standard setzen
      if (document.getElementById('classFilter')) document.getElementById('classFilter').value = 'alle';

      // 2. HIER KOMMT DER CODE HIN:
      // Wir holen das aktuell gewählte Schuljahr aus dem Hauptformular
      const currentChallengeYear = document.querySelector('select[name="schuljahr_id"]').value;
      const modalYearFilter = document.getElementById('teamSchuljahrFilter');

      if (currentChallengeYear && modalYearFilter) {
        modalYearFilter.value = currentChallengeYear;
      } else if (modalYearFilter) {
        modalYearFilter.value = 'alle';
      }

      // 3. Modal vorbereiten und anzeigen
      window.teamModalInstance.prepareCreate();

      // WICHTIG: Nach dem Setzen des Filters die Liste einmalig aktualisieren
      window.teamModalInstance.renderAvailable();

      const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('teamModal'));
      modal.show();
    });
  }

  // (Lösch-Logik window.removeChallengeTeam und initData bleiben gleich...)

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

  if (challengeForm) {
    challengeForm.addEventListener('submit', function (e) {
      updateTeamsData();
      if (teams.length === 0) {
        e.preventDefault();
        alert('Bitte weisen Sie mindestens ein Team zu!');
        return false;
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
        console.error("Fehler beim Initialisieren der Edit-Teams:", e);
      }
    } else {
      renderTeams();
    }
  };

  initData();
});