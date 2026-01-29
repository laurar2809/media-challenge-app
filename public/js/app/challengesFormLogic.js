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

  // === 2. TEAM-MODAL INITIALISIEREN ===
  // Nutzt die neue universelle TeamModal-Klasse
  window.teamModalInstance = new TeamModal({
    modalId: 'teamModal',
    schueler: schuelerListe,
    onSave: (data) => {
      if (currentEditIndex > -1) {
        // Bearbeiten-Modus: Bestehendes Team im Array ersetzen
        teams[currentEditIndex] = {
          ...teams[currentEditIndex],
          name: data.name,
          members: data.members
        };
      } else {
        // Neu erstellen: Neues lokales Team-Objekt hinzufügen
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

  // === 3. CORE CHALLENGE FUNKTIONEN ===

  // Schreibt das Team-Array als JSON in das Hidden-Input für den Server-Submit
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

      // Mappe die Namen der Mitglieder für die Anzeige
      const memberList = (team.members && team.members.length > 0)
        ? team.members.map(m => `<span class="badge bg-light text-dark border me-1">${m.vorname} ${m.nachname}</span>`).join('')
        : '<span class="text-muted small"><i>Keine Mitglieder gefunden</i></span>';

      teamCard.innerHTML = `
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold"><i class="bi bi-people-fill me-2 text-primary"></i>${team.name}</h6>
                    <div class="btn-group">
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="editChallengeTeam(${index})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeChallengeTeam(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="mt-2">${memberList}</div>
            </div>`;
      teamsContainer.appendChild(teamCard);
    });
  }

  // Bestehende Teams aus dem Dropdown hinzufügen
  const addExistingBtn = document.getElementById('addExistingTeamBtn');
  // === In challengesFormLogic.js unter Punkt 4 ===
  if (addExistingBtn) {
    addExistingBtn.addEventListener('click', function () {
      const select = document.getElementById('existingTeamSelect');
      const teamId = select.value;
      if (!teamId) return;

      const teamOption = select.options[select.selectedIndex];
      // 1. Die IDs aus dem data-members Attribut holen ("102,39...")
      const memberIdsString = teamOption.dataset.members || "";
      const memberIds = memberIdsString.split(',').map(id => id.trim());

      // 2. Die echten Schüler-Objekte aus deiner schuelerListe suchen
      const membersObjects = schuelerListe.filter(s => memberIds.includes(String(s.id)));

      if (teams.some(t => t.id === `existing-${teamId}`)) {
        alert("Dieses Team ist bereits zugewiesen.");
        return;
      }

      // 3. Das Team mit den ECHTEN Objekten ins Array pushen
      teams.push({
        id: `existing-${teamId}`,
        name: teamOption.text.split(' (')[0],
        members: membersObjects // Hier liegen jetzt die Namen drin!
      });

      renderTeams();
      updateTeamsData();
      select.value = '';
    });
  }

  // In challengesFormLogic.js beim Button-Click:
  const openModalBtn = document.getElementById('openCreateTeamModal');
  if (openModalBtn) {
    openModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      currentEditIndex = -1;

      // RADIKAL: Wenn noch ein Schatten da ist, weg damit
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';

      // Modal-Daten leeren
      window.teamModalInstance.prepareCreate();

      // Modal neu initialisieren und zeigen
      const modalEl = document.getElementById('teamModal');
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    });
  }

  // Brücke: Team aus der Liste entfernen
  window.removeChallengeTeam = (index) => {
    if (confirm("Dieses Team von der Challenge entfernen?")) {
      teams.splice(index, 1);
      renderTeams();
      updateTeamsData();
    }
  };

  // === In challengesFormLogic.js ===
  window.teamModalInstance = new TeamModal({
    modalId: 'teamModal',
    schueler: schuelerListe,
    onSave: (data) => {
      // data enthält: { name: "Teamname", members: [ {id, vorname, nachname, klasse}, ... ] }

      if (currentEditIndex > -1) {
        // Bearbeiten: Wir aktualisieren das Team an der Stelle
        teams[currentEditIndex].name = data.name;
        teams[currentEditIndex].members = data.members;
        // Falls es ein bestehendes Team war, löschen wir den alten ID-String, 
        // damit die neuen members-Objekte Vorrang haben
        delete teams[currentEditIndex].mitglieder_ids;
      } else {
        // Neu erstellen
        teams.push({
          id: `new-${Date.now()}`,
          name: data.name,
          members: data.members
        });
      }

      renderTeams(); // Zeichnet die Karten in der Challenge-Übersicht neu
      updateTeamsData(); // Schreibt alles in das Hidden-Input für die DB

      // Modal sauber schließen
      const modalEl = document.getElementById('teamModal');
      bootstrap.Modal.getInstance(modalEl).hide();
    }
  });

  // Formular Validierung beim Absenden
  if (challengeForm) {
    challengeForm.addEventListener('submit', function (e) {
      updateTeamsData();

      if (teams.length === 0) {
        e.preventDefault();
        alert('Bitte weisen Sie mindestens ein Team zu!');
        return false;
      }
      console.log("Sende Formular mit " + teams.length + " Teams");
    });
  }

  // === 5. INITIALISIERUNG (BEI BEARBEITUNG) ===
  const initData = () => {
    const existingDataInput = document.getElementById('existingTeamsData');
    if (existingDataInput && existingDataInput.value) {
      try {
        teams = JSON.parse(existingDataInput.value);
        renderTeams();
      } catch (e) { console.error("Fehler beim Laden bestehender Teams", e); }
    }
  };
  initData();
});