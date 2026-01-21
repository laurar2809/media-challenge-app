document.addEventListener('DOMContentLoaded', function() {
    // Filter-Elemente
    const klasseFilter = document.getElementById('teamKlasseFilter');
    const schuljahrFilter = document.getElementById('teamSchuljahrFilter');
    const searchInput = document.getElementById('teamSearchInput');
    
    // Debounce für Search
    let searchTimeout;
    function updateFilters() {
        const params = new URLSearchParams(window.location.search);
        params.set('klasse', klasseFilter?.value || 'alle');
        params.set('schuljahr', schuljahrFilter?.value || 'alle');
        params.set('search', searchInput?.value || '');
        
        // Suche nur bei Enter oder nach 500ms Pause
        if (searchInput && searchInput.value) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                window.location.search = params.toString();
            }, 500);
        } else {
            window.location.search = params.toString();
        }
    }
    
    // Event Listener
    if (klasseFilter) klasseFilter.addEventListener('change', updateFilters);
    if (schuljahrFilter) schuljahrFilter.addEventListener('change', updateFilters);
    if (searchInput) {
        searchInput.addEventListener('input', updateFilters);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                updateFilters();
                e.preventDefault();
            }
        });
    }
});