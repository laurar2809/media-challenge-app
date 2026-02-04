document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('schuelerSearch');
    const klassenFilter = document.getElementById('klassenFilter');
    const schuljahrFilter = document.getElementById('schuljahrFilter'); // Falls wieder aktiv

    const deleteModal = document.getElementById('confirmDeleteModal');
    const deleteForm = document.getElementById('deleteConfirmForm');
    const confirmDeleteSubmit = document.getElementById('confirmDeleteSubmit');

    // --- 1. Delete Modal Initialisierung (Bleibt gleich) ---
    if (typeof initDeleteModal === 'function') {
        initDeleteModal({
            modal: deleteModal,
            form: deleteForm,
            submitBtn: confirmDeleteSubmit,
            buildAction: (id) => `/schueler/${id}?_method=DELETE`
        });
    }

    // --- 2. Filter-Logik (Server-Side) ---
    function applyFilters() {
        const params = new URLSearchParams();

        const klasseValue = klassenFilter ? klassenFilter.value : 'alle';
        const searchValue = searchInput ? searchInput.value.trim() : '';
        // const schuljahrValue = schuljahrFilter ? schuljahrFilter.value : 'alle';

        if (klasseValue !== 'alle') params.set('klasse', klasseValue);
        if (searchValue) params.set('search', searchValue);
        // if (schuljahrValue !== 'alle') params.set('schuljahr', schuljahrValue);

        // Seite mit neuen Parametern neu laden
        window.location.href = window.location.pathname + '?' + params.toString();
    }

    // --- 3. Event Listener ---
    if (klassenFilter) {
        klassenFilter.addEventListener('change', applyFilters);
    }

    if (schuljahrFilter) {
        schuljahrFilter.addEventListener('change', applyFilters);
    }

    // Suche mit Badge-Logik aus deiner FilterUtils
    if (searchInput && window.FilterUtils) {
        const searchBadge = document.getElementById('searchBadge'); // ID prüfen!
        const searchTermText = document.getElementById('searchTermText'); // ID prüfen!

        window.FilterUtils.initSearchWithBadge({
            input: searchInput,
            badge: searchBadge,
            textSpan: searchTermText,
            onChange: (query) => {
                // Nur Filtern, wenn sich wirklich was geändert hat, um Endlosschleifen zu vermeiden
                const params = new URLSearchParams(window.location.search);
                if (params.get('search') !== query) {
                    applyFilters();
                }
            }
        });
    }

    // Fokus-Trick: Wenn nach dem Reload ein Suchbegriff da ist, Cursor ans Ende setzen
    if (searchInput && searchInput.value) {
        searchInput.focus();
        const val = searchInput.value;
        searchInput.value = '';
        searchInput.value = val;
    }
});