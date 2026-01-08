// LOGIK: für Kategorien-Seite (löschen)


// Eventlistener für modales Fenster beim Delete
const deleteModal = document.getElementById('confirmDeleteModal');
const deleteForm = document.getElementById('deleteConfirmForm');
const confirmDeleteSubmit = document.getElementById('confirmDeleteSubmit');

// Delete Modal -> PARTIAL
initDeleteModal({
  modal: deleteModal,
  form: deleteForm,
  submitBtn: confirmDeleteSubmit,
  buildAction: (id) => `/kategorien/${id}?_method=DELETE`
});

