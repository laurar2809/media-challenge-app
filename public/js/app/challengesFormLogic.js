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

  if (addExistingBtn) {
    // In challengesFormLogic.js beim addExistingTeamBtn Click-Event

    addExistingBtn.addEventListener('click', function () {
      const select = document.getElementById('existingTeamSelect');
      const teamId = select.value;
      if (!teamId) return;

      const teamOption = select.options[select.selectedIndex];

      // 1. IDs holen und extrem sauber trimmen
      const memberIdsString = teamOption.dataset.members || "";
      const memberIds = memberIdsString.split(',')
        .map(id => id.trim())
        .filter(id => id !== "");

      // 2. Abgleich mit der schuelerListe (Sicherstellen, dass beides als String verglichen wird)
      const membersObjects = schuelerListe.filter(s => {
        return memberIds.includes(String(s.id));
      });

      // 3. Dubletten-Check
      if (teams.some(t => String(t.id) === `existing-${teamId}`)) {
        alert("Dieses Team ist bereits zugewiesen.");
        return;
      }

      // 4. Team hinzufügen
      teams.push({
        id: `existing-${teamId}`,
        name: teamOption.getAttribute('data-name') || teamOption.text.split(' (')[0],
        members: membersObjects // Das sorgt für die Anzeige der Namen
      });

      renderTeams();
      updateTeamsData();
      select.value = '';
    });
  }

  // In challengesFormLogic.js beim Button-Click:
  const openModalBtn = document.getElementById('openCreateTeamModal');
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      currentEditIndex = -1;

      // Sicherstellen, dass keine alten Reste den neuen Start blockieren
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');

      window.teamModalInstance.prepareCreate();

      // Falls du das Modal manuell öffnest:
      const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('teamModal'));
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
  // Am Ende von challengesFormLogic.js
  const initData = () => {
    const teamsDataInput = document.getElementById('teamsData');
    if (teamsDataInput && teamsDataInput.value && teamsDataInput.value !== '[]') {
      try {
        const parsed = JSON.parse(teamsDataInput.value);
        // WICHTIG: Wir überschreiben das globale 'teams' Array
        teams = parsed.map(t => ({
          id: t.id,
          name: t.name,
          members: t.members || [] // Sicherstellen, dass members da ist
        }));

        console.log("Edit-Modus: Teams geladen", teams);
        renderTeams(); // Zeichnet die Karten
      } catch (e) {
        console.error("Fehler beim Initialisieren der Edit-Teams:", e);
      }
    } else {
      renderTeams(); // Zeigt die "Keine Teams"-Meldung
    }
  };

  // WICHTIG: Aufruf am Ende der DOMContentLoaded Funktion
  initData();
});