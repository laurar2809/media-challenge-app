 document.addEventListener('DOMContentLoaded', function () {
        const statusFilter = document.getElementById('statusFilter');
        const searchInput = document.getElementById('bewertungSearch');

        let searchTimeout;

        function applyFilters() {
            const currentStatus = statusFilter.value;
            const currentSearch = searchInput.value.trim();

            const params = new URLSearchParams();
            
            // Status-Filter nur setzen, wenn nicht 'alle'
            if (currentStatus && currentStatus !== 'alle') {
                params.set('status', currentStatus);
            }
            // Such-Filter nur setzen, wenn ein Begriff > 0 Zeichen vorhanden ist
            if (currentSearch) {
                params.set('search', currentSearch);
            }
            
            // Zur neuen URL weiterleiten
            window.location.href = `/bewertung?${params.toString()}`;
        }

        // Event Listener für Status-Filter (bei Auswahl sofort filtern)
        statusFilter.addEventListener('change', function () {
            applyFilters();
        });

        // Event Listener für Sucheingabe (mit Debounce)
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applyFilters();
            }, 500); // 500ms Verzögerung 
        });
});