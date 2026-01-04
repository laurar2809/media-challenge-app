 // Eventlistener für modales Fenster beim Delete
    const deleteModal = document.getElementById('confirmDeleteModal');
    const deleteForm = document.getElementById('deleteConfirmForm');

    deleteModal.addEventListener('show.bs.modal', event => {
      const button = event.relatedTarget;      // Button, der das Modal geöffnet hat
      const itemId = button.getAttribute('data-id');
      // Action auf die richtige ID setzen
      deleteForm.action = `/categories/${itemId}?_method=DELETE`;
    });