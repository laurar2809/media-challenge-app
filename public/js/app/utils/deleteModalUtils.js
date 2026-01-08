// deleteModalUtils.js 

window.initDeleteModal = function ({ modal, form, submitBtn, buildAction }) {
  if (!modal || !form || !submitBtn) return;

  let currentId = null;

  modal.addEventListener('show.bs.modal', event => {
    const button = event.relatedTarget;
    currentId = button ? button.getAttribute('data-id') : null;
  });

  submitBtn.addEventListener('click', () => {
    if (!currentId) {
      alert('Fehler: Die ID konnte nicht ermittelt werden.');
      return;
    }
    form.action = buildAction(currentId);
    form.submit();
  });
};
