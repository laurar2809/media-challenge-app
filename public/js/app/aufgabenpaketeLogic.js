// LOGIK: für Aufgabenpaket-Seite (Suche, Filter, Zu suchende Aufgabenpakete werden angezeigt, löschen)

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('aufgabenpaketeSearch');
    const searchTermText = document.getElementById('searchTermText');
    const clearSearch = document.getElementById('clearSearch');
    const searchBadge = document.getElementById('searchBadge');
    const kategorienFilter = document.getElementById('kategorienFilter');
    const aufgabenpaketeCards = document.querySelectorAll('.aufgabenpaket-card');
    const cardsContainer = document.getElementById('aufgabenpaketeCardsContainer');

    const deleteModal = document.getElementById('confirmDeleteModal');
    const deleteForm = document.getElementById('deleteConfirmForm');
    const confirmDeleteSubmit = document.getElementById('confirmDeleteSubmit');


    
    // Delete Modal -> PARTIAL
    initDeleteModal({
    modal: deleteModal,
    form: deleteForm,
    submitBtn: confirmDeleteSubmit,
    buildAction: (id) => `/aufgabenpakete/${id}?_method=DELETE`
    });


    
    if (!searchInput || !kategorienFilter || !cardsContainer) return;

    let searchTimeout;

    // Filter bei Änderung anwenden
    kategorienFilter.addEventListener('change', applyFilters);

    // LIVE-SUCHE
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        const query = this.value.trim().toLowerCase();

        searchTimeout = setTimeout(() => {
            applyFilters();

            if (searchBadge && searchTermText) {
                if (query.length >= 2) {
                    searchTermText.textContent = query;
                    searchBadge.style.display = 'flex';
                } else {
                    searchBadge.style.display = 'none';
                }
            }
        }, 300);
    });

    function applyFilters() {
        const kategorieValue = kategorienFilter.value.toLowerCase();
        const searchValue = searchInput.value.trim().toLowerCase();

        let visibleCount = 0;

        aufgabenpaketeCards.forEach(card => {
            const title = (card.getAttribute('data-title') || '').toLowerCase();
            const description = (card.getAttribute('data-description') || '').toLowerCase();
            const kategorie = (card.getAttribute('data-kategorie') || '').toLowerCase();

            const matchesKategorie = kategorieValue === 'alle' || kategorie === kategorieValue;
            const matchesSearch = !searchValue ||
                title.includes(searchValue) ||
                description.includes(searchValue) ||
                kategorie.includes(searchValue);

            if (matchesKategorie && matchesSearch) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // "Keine Ergebnisse"
        let noResultsDiv = cardsContainer.querySelector('.no-results-message');

        if (visibleCount === 0) {
            if (!noResultsDiv) {
                noResultsDiv = document.createElement('div');
                noResultsDiv.className = 'col-12 no-results-message';
                noResultsDiv.innerHTML = `
          <div class="text-center py-4 text-muted">
            Keine Aufgabenpakete gefunden für die ausgewählten Filter
          </div>
        `;
                cardsContainer.appendChild(noResultsDiv);
            }
            noResultsDiv.style.display = 'block';
        } else if (noResultsDiv) {
            noResultsDiv.style.display = 'none';
        }
    }

    // Suche zurücksetzen
    if (clearSearch) {
        clearSearch.addEventListener('click', function (e) {
            e.preventDefault();
            searchInput.value = '';
            if (searchBadge) searchBadge.style.display = 'none';
            applyFilters();
        });
    }



    // Initial Filter anwenden falls Suchbegriff vorhanden
    if (searchInput.value) {
        applyFilters();
    }
});
