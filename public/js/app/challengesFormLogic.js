// LOGIK: für ChallengesForm-Seite (Teams erstellen, Member Counter anzeigen (Teams), löschen, Team bearbeiten, Filtern & suchen von Schülern,...)


document.addEventListener('DOMContentLoaded', function () {
  console.log(' challengesForm.ejs initialisiert');

  // === 1. DOM ELEMENTE DEFINIEREN ===
  const availableMembers = document.getElementById('availableMembers');
  const teamDropZone = document.getElementById('teamDropZone');
  const teamsContainer = document.getElementById('teamsContainer');
  const createTeamBtn = document.getElementById('createTeamBtn');
  const saveTeamBtn = document.getElementById('saveTeamBtn'); //  NEU: Speichern-Button
  const teamsDataInput = document.getElementById('teamsData');
  const newTeamName = document.getElementById('newTeamName');
  const nameFilter = document.getElementById('nameFilter');
  const classFilter = document.getElementById('classFilter');
  const dateInput = document.getElementById('dateInput');
  const filterHint = document.getElementById('filterHint');
  const onlyAvailableFilter = document.getElementById('onlyAvailableFilter');
  const teamSchuljahrFilter = document.getElementById('teamSchuljahrFilter');
  const challengeForm = document.getElementById('challengeForm');
  const teamModal = document.getElementById('teamModal'); // Referenz auf das Modal-Element
  const teamModalLabel = document.getElementById('teamModalLabel');


  let teamModalInstance = null;
  if (teamModal) {
    teamModalInstance = new bootstrap.Modal(teamModal);
  }


  // === 2. DATEN LADEN ===
  // Schüler-Daten
  const schuelerDataElement = document.getElementById('schuelerData');
  const schuelerListe = schuelerDataElement ? JSON.parse(schuelerDataElement.dataset.schueler) : [];
  console.log(`${schuelerListe.length} Schüler geladen`);

  // Bestehende Teams
  const existingTeamsInput = document.getElementById('existingTeamsData');
  console.log('Existing Teams Input:', existingTeamsInput ? existingTeamsInput.value : 'leer');

  // === 3. VARIABLEN ===
  let teams = [];
  let teamCounter = 1;
  let filterTimeout;

  let isEditMode = false; //  NEU: Status zur Unterscheidung Erstellen/Bearbeiten
  let currentEditIndex = -1; //  NEU: Index des Teams, das gerade bearbeitet wird


  // === 4. HELPER FUNCTIONS ===

  // HTML-Entities dekodieren
  function decodeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  // Teams Data für Formular aktualisieren
  function updateTeamsData() {
    if (teamsDataInput) {
      const teamsJSON = JSON.stringify(teams);
      teamsDataInput.value = teamsJSON;
      console.log(`Teams gespeichert: ${teams.length} Team(s)`);
    }
  }

  // Member Counter aktualisieren
  function updateMemberCounter() {
    const teamDropZone = document.getElementById('teamDropZone');
    if (!teamDropZone) return;

    const members = teamDropZone.querySelectorAll('.btn[data-id]');  // Selector geändert
    const countElement = document.getElementById('memberCount');
    if (countElement) {
      const count = members.length;
      countElement.textContent = `${count} Mitglieder ausgewählt`;
      countElement.className = count > 0 ? 'text-primary small fw-bold' : 'text-muted small';
    }
  }

  // Team Formular zurücksetzen
  function clearTeamForm() {
    newTeamName.value = '';
    teamDropZone.innerHTML = '<p class="text-muted text-center mb-0 w-100">Schüler hierher ziehen oder klicken</p>';
    updateMemberCounter();
    console.log('Team Formular zurückgesetzt');
  }

  // Platzhalter aktualisieren
  function updatePlaceholder() {
    if (teamDropZone.querySelectorAll('.btn[data-id]').length === 0) {
      if (!teamDropZone.querySelector('p')) {
        const placeholder = document.createElement('p');
        placeholder.className = 'text-muted text-center mb-0 w-100';
        placeholder.textContent = 'Schüler hierher ziehen oder klicken';
        teamDropZone.appendChild(placeholder);
      }
    } else {
      // Falls Mitglieder da sind, Platzhalter entfernen
      const placeholder = teamDropZone.querySelector('p');
      if (placeholder) placeholder.remove();
    }
  }

  // Mitglied zur DropZone hinzufügen
  function addMemberToDropZone(memberElement) {
    const memberId = memberElement.dataset.id;
    const memberVorname = memberElement.dataset.vorname;
    const memberNachname = memberElement.dataset.nachname;
    const memberKlasse = memberElement.dataset.klasse;


    // Prüfen ob Mitglied bereits in DropZone
    if (!teamDropZone.querySelector(`[data-id="${memberId}"]`)) {
      console.log(`Füge Mitglied hinzu: ${memberVorname} ${memberNachname}`);

      // Klone das Element
      const teamMember = document.createElement('button');
      teamMember.type = 'button';
      teamMember.className = 'btn btn-sm btn-custom-safe text-white me-1 mb-1';
      teamMember.innerHTML = `
          ${memberVorname} ${memberNachname} (${memberKlasse})
          <span class="ms-1" style="cursor: pointer; font-weight: bold;">×</span>
        `;
      teamMember.dataset.id = memberId;
      teamMember.dataset.vorname = memberVorname;
      teamMember.dataset.nachname = memberNachname;
      teamMember.dataset.klasse = memberKlasse;

      // Entfernen-Button
      teamMember.querySelector('span').addEventListener('click', function (e) {
        e.stopPropagation();
        console.log(`Entferne Mitglied: ${memberVorname} ${memberNachname}`);
        teamMember.remove();
        updatePlaceholder();
        updateMemberCounter();
        filterMembers(); // Filter neu anwenden
      });

      // Platzhalter entfernen
      const placeholder = teamDropZone.querySelector('p');
      if (placeholder) placeholder.remove();

      teamDropZone.appendChild(teamMember);
      updateMemberCounter();

      // In verfügbarer Liste als ausgewählt markieren
      const availableMemberElement = availableMembers.querySelector(`[data-id="${memberId}"]`);
      if (availableMemberElement) {
        availableMemberElement.classList.add('opacity-50', 'disabled');
      }
    }
  }

  //  NEU: Funktion zum Bearbeiten eines Teams
  function editTeam(index) {
    const teamToEdit = teams[index];
    currentEditIndex = index;
    isEditMode = true;

    // 1. Modalfelder vorbereiten
    newTeamName.value = teamToEdit.name;
    teamDropZone.innerHTML = ''; // Dropzone leeren

    // 2. Mitglieder in die Dropzone laden
    teamToEdit.mitglieder.forEach(memberData => {
      const schuelerElement = schuelerListe.find(s => parseInt(s.id) === parseInt(memberData.id));

      if (schuelerElement) {
        // Temporäres Element mit Datasets erstellen (wie von filterMembers erzeugt)
        const tempElement = document.createElement('div');
        tempElement.dataset.id = schuelerElement.id;
        tempElement.dataset.vorname = schuelerElement.vorname;
        tempElement.dataset.nachname = schuelerElement.nachname;
        tempElement.dataset.klasse = schuelerElement.klasse_name || schuelerElement.klasse;

        addMemberToDropZone(tempElement);
      }
    });

    updatePlaceholder();

    // 3. Modal-Titel und Buttons anpassen
    teamModalLabel.textContent = `Team "${teamToEdit.name}" bearbeiten`;
    createTeamBtn.style.display = 'none';
    saveTeamBtn.style.display = 'block';

    // 4. Modal anzeigen
    if (teamModalInstance) {
      teamModalInstance.show();
    }
  }

  // Teams rendern
  function renderTeams() {
    console.log(`Rendere ${teams.length} Teams`);

    teamsContainer.innerHTML = '';
    const noTeamsMessage = document.getElementById('noTeamsMessage');

    if (teams.length > 0) {
      // Teams vorhanden - Nachricht ausblenden
      if (noTeamsMessage) {
        noTeamsMessage.style.display = 'none';
      }

      teams.forEach((team, index) => {
        const teamCard = document.createElement('div');
        teamCard.className = 'card mb-2';
        teamCard.innerHTML = `
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="card-title mb-0">
                  <i class="bi bi-people me-1"></i>${team.name}
                </h6>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-sm btn-outline-secondary edit-team" data-index="${index}">
                        <i class="bi bi-pencil"></i> Bearbeiten
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger remove-team" data-index="${index}">
                  <i class="bi bi-trash"></i>
                </button>
                </div>
              </div>
              <div class="mt-2">
                ${team.mitglieder.map(m =>
          `<span class="badge bg-secondary me-1 mb-1">${m.vorname} ${m.nachname} (${m.klasse || ''})</span>`
        ).join('')}
              </div>
            </div>
          `;
        teamsContainer.appendChild(teamCard);
      });

      // Event Listener für Remove und EDIT Buttons
      teamsContainer.querySelectorAll('.remove-team').forEach(btn => {
        btn.addEventListener('click', function () {
          const index = parseInt(this.dataset.index);
          const teamName = teams[index].name;
          if (confirm(`Team "${teamName}" wirklich löschen?`)) {
            teams.splice(index, 1);
            renderTeams();
            updateTeamsData();
            filterMembers();
          }
        });
      });

      //  NEU: EDIT BUTTON LISTENER
      teamsContainer.querySelectorAll('.edit-team').forEach(btn => {
        btn.addEventListener('click', function () {
          const index = parseInt(this.dataset.index);
          editTeam(index);
        });
      });

    } else {
      // Keine Teams - Nachricht anzeigen
      if (noTeamsMessage) {
        noTeamsMessage.style.display = 'flex';
      }
      teamsContainer.innerHTML = '';
    }

    updateTeamsData();
    filterMembers();
  }

  // Filter-Funktion für Mitglieder
  function filterMembers() {
    const nameValue = nameFilter.value.toLowerCase().trim();
    const classValue = classFilter.value;
    const schuljahrValue = teamSchuljahrFilter ? teamSchuljahrFilter.value : '';
    const onlyAvailable = onlyAvailableFilter ? onlyAvailableFilter.checked : false;

    const availableMembersContainer = document.getElementById('availableMembersContainer');
    const availableMembers = document.getElementById('availableMembers');

    const hasActiveFilter = nameValue || classValue || schuljahrValue;

    if (hasActiveFilter) {
      availableMembersContainer.style.display = 'block';
      if (filterHint) filterHint.style.display = 'none';
    } else {
      availableMembersContainer.style.display = 'none';
      if (filterHint) filterHint.style.display = 'block';
      availableMembers.innerHTML = '';
      return;
    }

    availableMembers.innerHTML = '';
    let hasResults = false;

    schuelerListe.forEach(s => {
      const vorname = (s.vorname || '').toLowerCase();
      const nachname = (s.nachname || '').toLowerCase();
      const klasse = s.klasse_name || s.klasse || '';

      // Schuljahr extrahieren
      let schuljahr = '';
      if (s.schuljahr_name) {
        schuljahr = s.schuljahr_name.toLowerCase();
      } else if (s.schuljahr && typeof s.schuljahr === 'object') {
        schuljahr = (s.schuljahr.name || '').toLowerCase();
      } else if (s.schuljahr) {
        schuljahr = s.schuljahr.toString().toLowerCase();
      }

      const schuljahrId = s.schuljahr_id ? s.schuljahr_id.toString() : '';
      const memberId = s.id;

      // Prüfen ob Mitglied bereits in einem Team ist
      const isInTeam = teams.some(team =>
        team.mitglieder.some(m => parseInt(m.id) === parseInt(memberId))
      );

      // Filter-Logik
      const nameMatch = !nameValue || vorname.includes(nameValue) || nachname.includes(nameValue);
      const classMatch = !classValue || klasse === classValue;
      const schuljahrMatch = !schuljahrValue ||
        schuljahr.includes(schuljahrValue.toLowerCase()) ||
        schuljahrId === schuljahrValue;
      const availableMatch = !onlyAvailable || !isInTeam;

      if (nameMatch && classMatch && schuljahrMatch && availableMatch) {
        hasResults = true;

        const memberElement = document.createElement('button');
        memberElement.type = 'button';
        memberElement.className = `btn btn-sm ${isInTeam ? 'btn-outline-secondary opacity-50 disabled' : 'btn-custom-filter'} me-1 mb-1 drag-item`;
        memberElement.dataset.id = memberId;
        memberElement.dataset.vorname = s.vorname;
        memberElement.dataset.nachname = s.nachname;
        memberElement.dataset.klasse = klasse;
        memberElement.dataset.schuljahr = schuljahr;
        memberElement.draggable = !isInTeam;
        memberElement.innerHTML = `
            ${s.vorname} ${s.nachname} 
            <span class="text-muted">(${klasse})</span>
          `;

        // Drag & Drop
        memberElement.addEventListener('dragstart', function (e) {
          if (!isInTeam) {
            e.dataTransfer.setData('text/plain', this.dataset.id);
            console.log(`Starte Drag: ${this.textContent}`);
          }
        });

        // Click to add
        memberElement.addEventListener('click', function () {
          if (!isInTeam) {
            addMemberToDropZone(this);
          }
        });

        availableMembers.appendChild(memberElement);
      }
    });

    if (!hasResults) {
      availableMembers.innerHTML = `
        <div class="d-flex justify-content-center w-100">
          <p class="text-muted mb-3" id="filterHint">Keine Schüler gefunden.</p>
        </div>`;
    }

    console.log(`Filter angewendet: ${hasResults ? 'Ergebnisse gefunden' : 'Keine Ergebnisse'}`);
  }

  // === 5. EVENT LISTENER ===

  // Drag & Drop für Team DropZone
  teamDropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    this.style.backgroundColor = '#e9ecef';
    this.style.borderColor = '#007bff';
  });

  teamDropZone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    this.style.backgroundColor = '#f8f9fa';
    this.style.borderColor = '#dee2e6';
  });

  teamDropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    this.style.backgroundColor = '#f8f9fa';
    this.style.borderColor = '#dee2e6';

    const memberId = e.dataTransfer.getData('text/plain');
    if (memberId) {
      const memberElement = availableMembers.querySelector(`[data-id="${memberId}"]`);
      if (memberElement && !memberElement.classList.contains('disabled')) {
        addMemberToDropZone(memberElement);
      }
    }
  });

  // Klick auf leere DropZone öffnet Modal
  teamDropZone.addEventListener('click', function (e) {
    if (e.target === this || e.target.tagName === 'P' || e.target.classList.contains('text-muted')) {
      // Nur öffnen, wenn nicht im Bearbeiten-Modus
      if (!isEditMode) {
        if (teamModalInstance) {
          teamModalInstance.show();
        }
      }
    }
  });

  //  NEU: Klick auf "Neues Team erstellen" öffnet Modal sauber
  document.getElementById('openCreateTeamModal').addEventListener('click', function () {
    isEditMode = false;
    currentEditIndex = -1;
    clearTeamForm();
    teamModalLabel.textContent = "Neues Team erstellen";
    createTeamBtn.style.display = 'block';
    saveTeamBtn.style.display = 'none';
  });

  // Team erstellen Button (nur für den Erstellen Modus)
  createTeamBtn.addEventListener('click', function () {
    const teamName = newTeamName.value.trim();
    const members = Array.from(teamDropZone.querySelectorAll('.btn[data-id]'));

    // Validierung
    if (!teamName) {
      alert('Bitte geben Sie einen Team Namen ein!');
      newTeamName.focus();
      return;
    }

    if (members.length === 0) {
      alert('Bitte fügen Sie mindestens ein Teammitglied hinzu!');
      return;
    }

    // Team-Objekt erstellen
    const isEditModePath = window.location.pathname.includes('/edit');
    const teamId = isEditModePath
      ? `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      : `team-${teamCounter++}`;

    const team = {
      id: teamId,
      name: teamName,
      mitglieder: members.map(member => ({
        id: parseInt(member.dataset.id),
        vorname: member.dataset.vorname,
        nachname: member.dataset.nachname,
        klasse: member.dataset.klasse
      }))
    };

    teams.push(team);
    console.log(`Team erstellt: "${teamName}" mit ${members.length} Mitgliedern`);

    // Modal schließen und zurücksetzen
    if (teamModalInstance) {
      teamModalInstance.hide();
    }

    renderTeams();
    clearTeamForm();
  });

  //  NEU: Team speichern Button (Bearbeiten Modus)
  saveTeamBtn.addEventListener('click', function () {
    const teamName = newTeamName.value.trim();
    const members = Array.from(teamDropZone.querySelectorAll('.btn[data-id]'));

    // Validierung
    if (!teamName || members.length === 0) {
      alert('Name und mindestens ein Mitglied sind erforderlich!');
      return;
    }

    // 1. Aktualisiert das bestehende Team im 'teams' Array
    teams[currentEditIndex].name = teamName;
    teams[currentEditIndex].mitglieder = members.map(member => ({
      id: parseInt(member.dataset.id),
      vorname: member.dataset.vorname,
      nachname: member.dataset.nachname,
      klasse: member.dataset.klasse
    }));

    console.log(`Team ${teamName} erfolgreich aktualisiert.`);

    // 2. Modal schließen und Ansicht aktualisieren
    if (teamModalInstance) {
      teamModalInstance.hide();
    }

    renderTeams();
    // Die Statusvariablen werden im hidden.bs.modal Event zurückgesetzt
  });

  // Filter Event Listener
  function setupFilterListeners() {
    const filterElements = [nameFilter, classFilter, teamSchuljahrFilter, onlyAvailableFilter];

    filterElements.forEach(element => {
      if (element) {
        element.addEventListener('input', handleFilterChange);
        element.addEventListener('change', handleFilterChange);
      }
    });
  }

  function handleFilterChange() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
      console.log('Filter aktualisiert');
      filterMembers();
    }, 300);
  }

  // Formular Submit
  challengeForm.addEventListener('submit', function (e) {
    //  WICHTIG: Teams-Daten in Hidden-Feld speichern
    updateTeamsData();

    // Nur validieren, NICHT abbrechen!
    if (teams.length === 0) {
      e.preventDefault();
      alert('Bitte erstellen Sie mindestens ein Team für diese Challenge!');
      return false;
    }

    // Teams-Daten validieren
    const hasEmptyTeams = teams.some(team => !team.mitglieder || team.mitglieder.length === 0);
    if (hasEmptyTeams) {
      e.preventDefault();
      alert('Ein Team hat keine Mitglieder! Bitte überprüfen Sie alle Teams.');
      return false;
    }

    console.log(`Formular wird gesendet mit ${teams.length} Teams`);
    return true;
  });

  // Modal Events
  if (teamModal) {
    teamModal.addEventListener('show.bs.modal', function () {
      console.log('Modal geöffnet');

      // Wenn nicht im Bearbeiten-Modus, auf Erstellen umstellen
      if (!isEditMode) {
        clearTeamForm();
        teamModalLabel.textContent = "Neues Team erstellen";
        createTeamBtn.style.display = 'block';
        saveTeamBtn.style.display = 'none';
      }

      if (nameFilter) nameFilter.value = '';
      if (classFilter) classFilter.value = '';
      if (teamSchuljahrFilter) teamSchuljahrFilter.value = '';
      if (onlyAvailableFilter) onlyAvailableFilter.checked = false;
      filterMembers();
    });

    teamModal.addEventListener('hidden.bs.modal', function () {
      console.log('Modal geschlossen');
      isEditMode = false;
      currentEditIndex = -1;
      clearTeamForm();
      teamModalLabel.textContent = "Neues Team erstellen";
      createTeamBtn.style.display = 'block';
      saveTeamBtn.style.display = 'none';
    });



  }

  // Date Input Picker
  if (dateInput) {
    dateInput.addEventListener('click', function () {
      this.showPicker();
    });
  }



  // === 6. INITIALISIERUNG ===

  function initialize() {
    console.log('Initialisiere challengesForm...');

    // 1. Bestehende Teams laden
    try {
      if (existingTeamsInput && existingTeamsInput.value) {
        const rawValue = existingTeamsInput.value;
        console.log('Raw teams data:', rawValue);

        if (rawValue && rawValue !== '[]' && rawValue !== '""') {
          const decodedValue = decodeHTML(rawValue);
          teams = JSON.parse(decodedValue);
          teamCounter = teams.length + 1;
          console.log(`${teams.length} bestehende Teams geladen:`, teams);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Teams:', error);
      teams = [];
    }

    // 2. Teams rendern
    renderTeams();

    // 3. Filter Listener setup
    setupFilterListeners();

    // 4. Initial Filter anwenden
    filterMembers();

    // 5. Platzhalter setzen
    updatePlaceholder();
    updateMemberCounter();

    console.log('challengesForm erfolgreich initialisiert');
  }

  // Starte Initialisierung
  initialize();

  // === 7. DEBUG HELPER ===
  window.debugTeams = function () {
    console.log('=== DEBUG TEAMS ===');
    console.log('Teams Array:', teams);
    console.log('Teams Data Input:', teamsDataInput.value);
    console.log('Schüler Liste:', schuelerListe.length, 'Einträge');
    console.log('Filter Status:', {
      name: nameFilter.value,
      class: classFilter.value,
      schuljahr: teamSchuljahrFilter.value,
      onlyAvailable: onlyAvailableFilter.checked
    });
  };

  // Global verfügbar für Debugging
  window.teams = teams;
  window.schuelerListe = schuelerListe;
});