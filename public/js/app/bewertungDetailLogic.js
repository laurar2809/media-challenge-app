  document.getElementById('btn-ablehnen').addEventListener('click', function () {
        // Setze das verborgene Status-Feld auf 'abgelehnt'
        document.getElementById('status-field').value = 'abgelehnt';

        // Sende das Formular ab (Wir nehmen an, das Formular hat die ID 'bewertung-form' oder Sie verwenden form.submit()
        // Wenn das Formular keine ID hat, ändern Sie dies:
        const form = this.closest('form');

        // Prüfe, ob Feedback vorhanden ist, bevor abgelehnt wird (empfohlen)
        if (document.getElementById('feedback').value.trim() === '') {
            alert('Bitte gib ein Feedback zur Ablehnung ein.');
            return;
        }

        form.submit();
    });

    // Stellen Sie sicher, dass der Standard-Button 'bewertet' setzt (sollte Standard sein, aber zur Sicherheit)
    document.getElementById('btn-bewerten').addEventListener('click', function () {
        document.getElementById('status-field').value = 'bewertet';
        // Das Formular wird automatisch gesendet, da es type="submit" ist
});