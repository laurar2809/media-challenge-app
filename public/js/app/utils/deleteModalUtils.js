// deleteModalUtils.js 

window.initDeleteModal = function ({ modal, form, submitBtn, buildAction }) {
    console.log("initDeleteModal gestartet", { modal, form, submitBtn }); // CHECK 1
    if (!modal || !form || !submitBtn) return;

    let currentId = null;

    modal.addEventListener('show.bs.modal', event => {
        const button = event.relatedTarget;
        currentId = button ? button.getAttribute('data-id') : null;
        console.log("Modal geöffnet, ID erkannt:", currentId); // CHECK 2
    });

    submitBtn.addEventListener('click', () => {
        console.log("Löschen-Button im Modal geklickt!"); // CHECK 3
        if (!currentId) {
            alert('Fehler: Die ID konnte nicht ermittelt werden.');
            return;
        }
        form.action = buildAction(currentId);
        console.log("Formular wird abgeschickt an:", form.action); // CHECK 4
        form.submit();
    });
};