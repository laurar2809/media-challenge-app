
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('teamSearch');
    const schuljahrSelect = document.getElementById('schuljahrFilter');
    const kategorieSelect = document.getElementById('kategorieFilter');
    const rows = document.querySelectorAll('table tbody tr');

    function applyFilters() {
      const search = (searchInput.value || '').toLowerCase();
      const schuljahr = schuljahrSelect.value;
      const kategorie = kategorieSelect.value.toLowerCase();

      rows.forEach(row => {
        const teamName = row.cells[0].innerText.toLowerCase();        // Team Name
        const teamId   = row.cells[1].innerText.toLowerCase();        // Team ID
        const sj       = row.cells[2].innerText;                       // Schuljahr
        const mitglStr = row.cells[4].innerText.toLowerCase();        // Mitglieder Details

        // Suchtreffer: in Name, ID oder Mitgliedern
        const matchesSearch =
          !search ||
          teamName.includes(search) ||
          teamId.includes(search) ||
          mitglStr.includes(search);

        // Schuljahr-Filter
        const matchesSchuljahr = !schuljahr || sj === schuljahr;

        // Kategorie-Filter (wenn du Team-Kategorie in einem eigenen Feld/Spalte hast)
        let matchesKategorie = true;
        if (kategorie) {
          // Beispiel: Kategorie steckt im Teamnamen oder in einer Data-Attribute:
          const cat = (row.dataset.kategorie || '').toLowerCase();
          matchesKategorie = cat.includes(kategorie);
        }

        if (matchesSearch && matchesSchuljahr && matchesKategorie) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    searchInput.addEventListener('input', applyFilters);
    schuljahrSelect.addEventListener('change', applyFilters);
    kategorieSelect.addEventListener('change', applyFilters);
  });

