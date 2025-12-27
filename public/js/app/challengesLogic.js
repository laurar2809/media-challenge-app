document.addEventListener('DOMContentLoaded', function () {
    const searchContainer = document.getElementById('searchContainer');
    const searchInput = document.getElementById('challengesSearch');
    const searchTermText = document.getElementById('searchTermText');
    const clearSearch = document.getElementById('clearSearch');
    const searchBadge = document.getElementById('searchBadge');
    const kategorienFilter = document.getElementById('kategorienFilter');
    const schuljahrFilter = document.getElementById('schuljahrFilter');
    const challengeCards = document.querySelectorAll('.challenge-card');
    const cardContainer = document.getElementById('challengesCardContainer');

    const deleteModal = document.getElementById('confirmDeleteModal');
    const deleteForm = document.getElementById('deleteConfirmFormChallenge');
    const confirmDeleteSubmit = document.getElementById('confirmDeleteSubmitChallenge');

    if (!searchInput || !kategorienFilter || !schuljahrFilter || !cardContainer) return;

    let searchTimeout;
    let currentItemIdToDelete = null;

    console.log('Suchfunktion initialisiert - Gefundene Cards:', challengeCards.length);

    // Filter bei Änderung
    kategorienFilter.addEventListener('change', () => applyFilters());
    schuljahrFilter.addEventListener('change', () => applyFilters());

    // Live-Suche
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
        const schuljahrValue = schuljahrFilter.value.toLowerCase();
        const searchValue = searchInput.value.trim().toLowerCase();

        let visibleCount = 0;

        challengeCards.forEach(card => {
            const aufgabenpaket = (card.getAttribute('data-aufgabenpaket') || '').toLowerCase();
            const team = (card.getAttribute('data-team') || '').toLowerCase();
            const kategorie = (card.getAttribute('data-kategorie') || '').toLowerCase();
            const schuljahr = (card.getAttribute('data-schuljahr') || '').toLowerCase();
            const teammitglieder = (card.getAttribute('data-teammitglieder') || '').toLowerCase();

            const matchesKategorie = kategorieValue === 'alle' || kategorie === kategorieValue;
            const matchesSchuljahr = schuljahrValue === 'alle' || schuljahr === schuljahrValue;
            const matchesSearch = !searchValue ||
                aufgabenpaket.includes(searchValue) ||
                team.includes(searchValue) ||
                kategorie.includes(searchValue) ||
                schuljahr.includes(searchValue) ||
                teammitglieder.includes(searchValue);

            if (matchesKategorie && matchesSchuljahr && matchesSearch) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // "Keine Ergebnisse"
        let noResultsMsg = cardContainer.querySelector('.no-results-msg');
        if (visibleCount === 0) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'col-12 no-results-msg';
                noResultsMsg.innerHTML = `
          <div class="card text-center py-4 text-muted">
            <div class="card-body">
              Keine Challenges gefunden für die ausgewählten Filter
            </div>
          </div>
        `;
                cardContainer.appendChild(noResultsMsg);
            }
            noResultsMsg.style.display = '';
        } else if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
    }

    // Suche zurücksetzen – HACK bereinigen
    if (clearSearch) {
        clearSearch.addEventListener('click', function (e) {
            e.preventDefault();
            searchInput.value = '';
            if (searchBadge) searchBadge.style.display = 'none';
            applyFilters();
        });
    } else if (searchContainer) {
        // Falls kein eigener Button vorhanden: Icon in der input-group als „Clear“ benutzen
        const clearSearchButton = searchContainer.querySelector('.input-group-text');
        if (clearSearchButton) {
            clearSearchButton.style.cursor = 'pointer';
            clearSearchButton.addEventListener('click', e => {
                e.preventDefault();
                searchInput.value = '';
                if (searchBadge) searchBadge.style.display = 'none';
                applyFilters();
            });
        }
    }

    // Delete-Modal
    if (deleteModal && deleteForm) {
        deleteModal.addEventListener('show.bs.modal', event => {
            const button = event.relatedTarget;
            currentItemIdToDelete = button ? button.getAttribute('data-id') : null;
        });
    }

    if (confirmDeleteSubmit && deleteForm) {
        confirmDeleteSubmit.addEventListener('click', () => {
            if (currentItemIdToDelete) {
                deleteForm.action = `/challenges/${currentItemIdToDelete}`;
                deleteForm.submit();
            } else {
                alert('Fehler: Die Challenge-ID konnte nicht ermittelt werden.');
            }
        });
    }

    // Initial anwenden
    if (searchInput.value) {
        applyFilters();
    }

    console.log('Suchfunktion vollständig geladen');
});
