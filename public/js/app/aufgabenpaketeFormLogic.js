document.addEventListener("DOMContentLoaded", () => {
      const dropdowncategories = document.querySelectorAll(".dropdown-item");
      const dropdownButton = document.querySelector(".dropdown-toggle");
      const hiddenInput = document.getElementById("selectedKategorie");

      // Dropdown Funktion
      dropdowncategories.forEach(item => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          const selectedValue = item.getAttribute("data-value");
          dropdownButton.textContent = selectedValue;
          hiddenInput.value = selectedValue;
        });
      });

      // BILD LÖSCHEN FUNKTION
      const deleteImageBtn = document.getElementById('deleteImageBtn');
      const keepExistingImage = document.getElementById('keepExistingImage');
      const newImageUpload = document.getElementById('newImageUpload');
      const iconFileInput = document.getElementById('iconFileInput');
      const imagePreview = document.getElementById('imagePreview');
      const preview = document.getElementById('preview');

      if (deleteImageBtn) {
        deleteImageBtn.addEventListener('click', function () {
          if (confirm('Möchten Sie das aktuelle Bild wirklich löschen?')) {
            // Verstecke aktuelles Bild und zeige Upload-Feld
            this.closest('.bg-light').style.display = 'none';
            newImageUpload.style.display = 'block';

            // Setze hidden field um bestehendes Bild zu löschen
            keepExistingImage.value = 'false';
          }
        });
      }

      // BILD-VORSCHAU für neues Bild
      if (iconFileInput) {
        iconFileInput.addEventListener('change', function () {
          const file = this.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
              preview.src = e.target.result;
              preview.style.display = 'block';
              imagePreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
          } else {
            preview.style.display = 'none';
            imagePreview.style.display = 'none';
          }
        });
      }

      // FORM VALIDATION
      const form = document.getElementById('aufgabenpaketForm');
      form.addEventListener('submit', function (e) {
        const kategorie = hiddenInput.value;
        const title = document.querySelector('input[name="title"]').value;
        const description = document.querySelector('textarea[name="description"]').value;

        if (!kategorie || !title.trim() || !description.trim()) {
          e.preventDefault();
          alert('Bitte füllen Sie alle Pflichtfelder aus (Titel, Kategorie und Beschreibung).');
          return false;
        }
      });
    });