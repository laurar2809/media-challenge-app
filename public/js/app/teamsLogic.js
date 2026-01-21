// === NEUE createTeamBtn für TEAMS ===
createTeamBtn.addEventListener('click', function () {
  const teamName = newTeamName.value.trim();
  const members = Array.from(teamDropZone.querySelectorAll('.btn[data-id]'));

  if (!teamName || members.length === 0) {
    alert('Name + Mitglieder erforderlich!');
    return;
  }

  const team = {
    name: teamName,
    mitglieder: members.map(m => ({
      id: parseInt(m.dataset.id),
      vorname: m.dataset.vorname,
      nachname: m.dataset.nachname,
      klasse: m.dataset.klasse
    }))
  };

  // POST zu Teams-Route
  fetch('/teams', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(team)
  })
  .then(res => res.json())
  .then(data => {
    alert(`"${teamName}" erstellt!`);
    if (teamModalInstance) teamModalInstance.hide();
    location.reload();
  })
  .catch(err => console.error('Fehler:', err));
});
