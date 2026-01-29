// public/js/app/teamsLogic.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('schuelerDataContainer');
    if (!container) return;

    const schuelerData = JSON.parse(container.dataset.schueler || '[]');

    // Modal initialisieren
    window.teamModalInstance = new TeamModal({
        modalId: 'teamManagementModal',
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

    // Dropdown für Klassenfilter im Modal befüllen
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
});

// Global für den "Bearbeiten" Button in der EJS Tabelle
window.prepareEditTeam = (id, name, memberIdsString) => {
    window.teamModalInstance.prepareEdit({ id, name, mitglieder_ids: memberIdsString });
};