// LOGIK: für Lehrer-Seite (Suchen, Auflistung der Personen,  löschen)

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('lehrerSearch');
    const searchTermText = document.getElementById('searchTermText');
    const clearSearch = document.getElementById('clearSearch');
    const searchBadge = document.getElementById('searchBadge');
    const lehrerRows = document.querySelectorAll('.lehrer-row');
    const tbody = document.getElementById('lehrerTableBody');

    const deleteModal = document.getElementById('confirmDeleteModal');
    const deleteForm = document.getElementById('deleteConfirmForm');
    const confirmDeleteSubmit = document.getElementById('confirmDeleteSubmit');

    if (!searchInput || lehrerRows.length === 0) return;


     // Delete Modal -> PARTIAL
    initDeleteModal({
    modal: deleteModal,
    form: deleteForm,
    submitBtn: confirmDeleteSubmit,
    buildAction: (id) => `/lehrer/${id}?_method=DELETE`
    });


    
    // Auflistung der zu suchenden Lehrkraft
    function applyFilters() {
        const searchValue = searchInput.value.trim().toLowerCase();
        let visibleCount = 0;

        lehrerRows.forEach(row => {
            const vorname = (row.getAttribute('data-vorname') || '').toLowerCase();
            const nachname = (row.getAttribute('data-nachname') || '').toLowerCase();

            const matchesSearch = !searchValue ||
                vorname.includes(searchValue) ||
                nachname.includes(searchValue);

            row.style.display = matchesSearch ? '' : 'none';
            if (matchesSearch) visibleCount++;
        });

        if (!tbody) return;

        let noResultsRow = tbody.querySelector('.no-results-row');
        if (visibleCount === 0 && lehrerRows.length > 0) {
            if (!noResultsRow) {
                noResultsRow = document.createElement('tr');
                noResultsRow.className = 'no-results-row';
                noResultsRow.innerHTML = `
          <td colspan="3" class="text-center py-4 text-muted">
            Keine Lehrer gefunden für die Suche
          </td>
        `;
                tbody.appendChild(noResultsRow);
            }
            noResultsRow.style.display = '';
        } else if (noResultsRow) {
            noResultsRow.style.display = 'none';
        }
    }


    // LIVE-SUCHE jetzt über FilterUtils
    FilterUtils.initSearchWithBadge({
        input: searchInput,
        badge: searchBadge,
        textSpan: searchTermText,
        onChange: () => applyFilters()
    });



    if (clearSearch) {
        clearSearch.addEventListener('click', function (e) {
            e.preventDefault();
            searchInput.value = '';
            if (searchBadge) searchBadge.style.display = 'none';
            applyFilters();
        });
    }

     if (searchInput.value) {
        applyFilters();
    }
});
