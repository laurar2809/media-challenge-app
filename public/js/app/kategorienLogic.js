 // Eventlistener für modales Fenster beim Delete
    const deleteModal = document.getElementById('confirmDeleteModal');
    const deleteForm = document.getElementById('deleteConfirmForm');
    const confirmDeleteSubmit = document.getElementById('confirmDeleteSubmit');

    deleteModal.addEventListener('show.bs.modal', event => {
      const button = event.relatedTarget;      // Button, der das Modal geöffnet hat
      const itemId = button.getAttribute('data-id');
      // Action auf die richtige ID setzen
      deleteForm.action = `/kategorien/${itemId}?_method=DELETE`;
    });


     if(confirmDeleteSubmit && deleteForm) {
        confirmDeleteSubmit.addEventListener('click', () => {
            deleteForm.submit();
        });
    }