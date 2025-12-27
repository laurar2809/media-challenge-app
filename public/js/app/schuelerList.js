document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('schuelerSearch');
    const klassenFilter = document.getElementById('klassenFilter');
    const schuljahrFilter = document.getElementById('schuljahrFilter');
    const schuelerRows = document.querySelectorAll('.schueler-row');

    const deleteModal = document.getElementById('confirmDeleteModal');
    const deleteForm = document.getElementById('deleteConfirmForm');
    const confirmDeleteSubmit = document.getElementById('confirmDeleteSubmit');

    let searchTimeout;
    let currentItemIdToDelete = null;

    // --- 2. Lösch-Logik ---
    if (deleteModal && deleteForm) {
        deleteModal.addEventListener('show.bs.modal', event => {
            const button = event.relatedTarget;
            currentItemIdToDelete = button ? button.getAttribute('data-id') : null;
        });
    }

    if (confirmDeleteSubmit && deleteForm) {
        confirmDeleteSubmit.addEventListener('click', () => {
            if (currentItemIdToDelete) {
                deleteForm.action = `/schueler/${currentItemIdToDelete}`;
                deleteForm.submit();
            } else {
                alert('Fehler: Die Schüler-ID konnte nicht ermittelt werden.');
            }
        });
    }

    // --- 3. Filter-/Such-Logik ---
    function applyFilters() {
        if (!klassenFilter || !schuljahrFilter || !searchInput || schuelerRows.length === 0) return;

        const klasseValue = klassenFilter.value.toLowerCase();
        const schuljahrValue = schuljahrFilter.value.toLowerCase();
        const searchValue = searchInput.value.trim().toLowerCase();

        let visibleCount = 0;

        schuelerRows.forEach(row => {
            const vorname = row.getAttribute('data-vorname') || '';
            const nachname = row.getAttribute('data-nachname') || '';
            const klasse = row.getAttribute('data-klasse') || '';
            const schuljahr = row.getAttribute('data-schuljahr') || '';

            const matchesKlasse = klasseValue === 'alle' || klasse === klasseValue;
            const matchesSchuljahr = schuljahrValue === 'alle' || schuljahr === schuljahrValue;
            const matchesSearch = !searchValue ||
                vorname.includes(searchValue) ||
                nachname.includes(searchValue) ||
                klasse.includes(searchValue) ||
                schuljahr.includes(searchValue);

            if (matchesKlasse && matchesSchuljahr && matchesSearch) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

    }

    if (klassenFilter) klassenFilter.addEventListener('change', () => applyFilters());
    if (schuljahrFilter) schuljahrFilter.addEventListener('change', () => applyFilters());
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyFilters, 300);
        });
    }

    if (searchInput && searchInput.value) {
        applyFilters();
    }
});
