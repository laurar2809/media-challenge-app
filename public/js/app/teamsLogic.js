// public/js/app/teamsLogic.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('schuelerDataContainer');
    if (!container) return;

    const schuelerData = JSON.parse(container.dataset.schueler || '[]');

    // 1. Modal initialisieren (WICHTIG: ID prüfen, meistens 'teamModal')
    window.teamModalInstance = new TeamModal({
        modalId: 'teamModal', 
        schueler: schuelerData,
        onSave: async (data) => {
            const isUpdate = !!window.teamModalInstance.currentEditId;
            const url = isUpdate ? `/teams/${window.teamModalInstance.currentEditId}` : '/teams';
            const method = isUpdate ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) location.reload();
                else alert("Fehler: " + result.error);
            } catch (err) {
                console.error("Speicherfehler:", err);
            }
        }
    });

    // 2. Klassenfilter im Modal befüllen
    const classSelect = document.getElementById('classFilter');
    if (classSelect) {
        const klassen = [...new Set(schuelerData.map(s => s.klasse_name))].sort();
        klassen.forEach(k => {
            if (k) {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = k;
                classSelect.appendChild(opt);
            }
        });
    }

    // 3. Lösch-Logik für die Tabelle
    const deleteModalEl = document.getElementById('deleteTeamModal');
    if (deleteModalEl) {
        const deleteModal = new bootstrap.Modal(deleteModalEl);
        let teamIdToDelete = null;

        document.querySelectorAll('.delete-team-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                teamIdToDelete = btn.dataset.id;
                const teamName = btn.dataset.name;
                const body = deleteModalEl.querySelector('.modal-body');
                if (body) body.innerText = `Möchtest du das Team "${teamName}" wirklich löschen?`;
                deleteModal.show();
            });
        });

        document.getElementById('confirmDeleteTeamBtn')?.addEventListener('click', () => {
            if (!teamIdToDelete) return;
            const form = document.getElementById('deleteTeamForm');
            form.action = `/teams/${teamIdToDelete}?_method=DELETE`;
            form.submit();
        });
    }
});

// Global für den "Bearbeiten" Button in der EJS Tabelle
window.prepareEditTeam = (id, name, memberIdsString) => {
    if (window.teamModalInstance) {
        window.teamModalInstance.prepareEdit({ id, name, mitglieder_ids: memberIdsString });
    }
};