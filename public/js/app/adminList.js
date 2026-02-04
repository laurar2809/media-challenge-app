// public/js/app/adminList.js
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('adminSearch');
    const tableBody = document.getElementById('adminTableBody');
    const rows = document.querySelectorAll('.admin-row');

    // Suche/Filter Logik
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            rows.forEach(row => {
                const vorname = row.dataset.vorname;
                const nachname = row.dataset.nachname;
                if (vorname.includes(query) || nachname.includes(query)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // Modal-Logik für Löschen
    const deleteModal = document.getElementById('confirmDeleteAdminModal');
    if (deleteModal) {
        deleteModal.addEventListener('show.bs.modal', function(event) {
            const button = event.relatedTarget;
            const adminId = button.getAttribute('data-id');
            const form = document.getElementById('deleteAdminForm');
            // Hier den Pfad für das Löschen anpassen:
            form.action = `/admin/${adminId}?_method=DELETE`;
        });
    }
});