// LOGIK: für (Schüler) Abgabe-Seite (Abgabe speichern/abgeben, Files hochladen, bereits hochgeladene Dateien löschen, Hilfsfunktionen, Anzeigen von Dateien)

// public/js/app/abgabeLogic.js

document.addEventListener('DOMContentLoaded', function () {

    // 1. DATEN AUS DEM HTML AUSLESEN (Aus dem DATA-CONTAINER)
    const pageData = document.getElementById('pageData');
    const challengeId = pageData.dataset.challengeId;

    // Wir müssen die Sperrlogik vom Button im DOM lesen, da isSubmitted nicht mehr aktuell ist, 
    // wenn der Status von "abgelehnt" auf "entwurf" zurückgesetzt wurde.
    const submitButton = document.getElementById('submitBtn');
    const isLocked = submitButton ? submitButton.disabled : true;

    // 2. INITIAL FILES PARSEN (WENN VORHANDEN)
    let initialFiles = [];
    const filesJsonRaw = pageData.dataset.initialFiles;
    let filesJson = filesJsonRaw ? filesJsonRaw.trim() : '[]';

    try {
        if (filesJson.length > 0 && filesJson !== 'null') {
            initialFiles = JSON.parse(filesJson);
        } else {
            initialFiles = [];
        }
    } catch (e) {
        console.error('Fehler beim Parsen der initialen Dateien:', filesJsonRaw, e);
        initialFiles = [];
    }

    // 3. ELEMENTE
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const filesGrid = document.getElementById('filesGrid');
    const noFilesMessage = document.getElementById('noFilesMessage');
    const fileCount = document.getElementById('fileCount');

    // 4. UPLOADED FILES ARRAY (MIT BEREITS EXISTIERENDEN DATEIEN STARTEN)
    let uploadedFiles = initialFiles;

    // --- EVENT HANDLERS ---

    // Drag & Drop Events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        if (dropZone) dropZone.addEventListener(eventName, preventDefaults, false);
    });

    if (dropZone) {
        // Highlight when dragging over
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('border-primary', 'bg-light');
            }, false);
        });

        // Remove highlight
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('border-primary', 'bg-light');
            }, false);
        });

        // Handle drop
        dropZone.addEventListener('drop', handleDrop, false);
    }

    // File input change
    if (fileInput) fileInput.addEventListener('change', handleFiles);

    // Save buttons
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', () => {
            saveAbgabe('entwurf', 'Entwurf gespeichert!');
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (confirm('Abgabe endgültig einreichen?\nDanach sind keine Änderungen mehr möglich!')) {
                saveAbgabe('eingereicht', 'Abgabe erfolgreich eingereicht!');
            }
        });
    }


    // --- FUNKTIONEN ---

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e) {
        const files = e.dataTransfer.files;
        handleFileList(files);
    }

    function handleFiles(e) {
        const files = e.target.files;
        handleFileList(files);
        fileInput.value = ''; // Input zurücksetzen
    }

    function handleFileList(files) {
        if (isLocked) {
            showMessage('Abgabe ist gesperrt und kann nicht bearbeitet werden.', 'warning');
            return;
        }

        Array.from(files).forEach(file => {
            if (file.size > MAX_SIZE) {
                showMessage(`Datei "${file.name}" ist zu groß (max. 100 MB).`, 'danger');
            } else {
                uploadFile(file); //
            }
        });
    }

    function uploadFile(file) {
        // Logik für den Upload (Progress Bar etc.) bleibt hier
        const progressDiv = document.querySelector('.upload-progress');
        const progressBar = progressDiv ? progressDiv.querySelector('.progress-bar') : null;
        const statusText = progressDiv ? progressDiv.querySelector('.upload-status') : null;

        if (progressDiv) progressDiv.classList.remove('d-none');
        if (progressBar) progressBar.style.width = '0%';
        if (statusText) statusText.textContent = `Lade hoch: ${file.name}`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('challengeId', challengeId);

        fetch('/api/abgaben/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    uploadedFiles.push(data.file);
                    renderFiles();
                    showMessage(' ' + file.name + ' hochgeladen!', 'success');
                } else {
                    showMessage(' ' + data.error, 'danger');
                }
                if (progressDiv) progressDiv.classList.add('d-none');
            })
            .catch(error => {
                console.error('Upload error:', error);
                showMessage(' Upload fehlgeschlagen', 'danger');
                if (progressDiv) progressDiv.classList.add('d-none');
            });
    }

    function saveAbgabe(status, successMessage) {
        // Logik zum Speichern der Abgabe
        const data = {
            challenge_id: challengeId,
            beschreibung: document.getElementById('abgabeBeschreibung').value,
            status: status
        };

        fetch('/api/abgaben/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showMessage(' ' + result.message, 'success');
                    if (status === 'eingereicht') {
                        setTimeout(() => {
                            window.location.href = '/challenges';
                        }, 2000);
                    }
                } else {
                    showMessage(' ' + result.error, 'danger');
                }
            })
            .catch(error => {
                console.error('Save error:', error);
                showMessage(' Speichern fehlgeschlagen', 'danger');
            });
    }

    // Globale Hilfsfunktionen (müssen im globalen scope sein oder auf window gehängt)
    window.formatFileSize = function (bytes) { /* ... */ }; // Implementierung unten
    window.showMessage = function (message, type) { /* ... */ }; // Implementierung unten
    window.deleteFile = function (fileId) { /* ... */ }; // Implementierung unten


    // --- HILFSFUNKTIONEN FÜR EXTERNE NUTZUNG (MUSS IM GLOBALEN SCOPE LIEGEN) ---

    window.formatFileSize = function (bytes) {
        if (bytes < 1024) return bytes + ' Bytes';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    window.showMessage = function (message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);

        setTimeout(() => alert.remove(), 3000);
    };

    window.deleteFile = function (fileId) {
        // Logik für den Delete-Button muss auf die isLocked-Variable im DOM zugreifen
        if (isLocked) {
            window.showMessage('Abgabe ist gesperrt und kann nicht bearbeitet werden.', 'warning');
            return;
        }

        if (confirm('Datei wirklich löschen?')) {

            fetch(`/api/abgaben/media/${fileId}`, {
                method: 'DELETE'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.showMessage(' Datei gelöscht!', 'success');
                        uploadedFiles = uploadedFiles.filter(file => file.id !== fileId);
                        renderFiles();
                    } else {
                        window.showMessage(' Löschen fehlgeschlagen: ' + data.error, 'danger');
                    }
                })
                .catch(error => {
                    console.error('Lösch-Fehler:', error);
                    window.showMessage(' Löschen fehlgeschlagen (Netzwerkfehler)', 'danger');
                });
        }
    };

    // Die renderFiles Funktion muss am Ende definiert sein, da sie andere Funktionen nutzt.
    function renderFiles() {
        if (uploadedFiles.length === 0) {
            filesGrid.innerHTML = '';
            noFilesMessage.classList.remove('d-none');
            fileCount.textContent = '0';
            return;
        }

        noFilesMessage.classList.add('d-none');
        fileCount.textContent = uploadedFiles.length;

        filesGrid.innerHTML = uploadedFiles.map(file => {
            let preview = '';
            if (file.datei_typ === 'image') {
                preview = `<img src="${file.datei_pfad}" class="img-fluid rounded-top" style="height: 120px; object-fit: cover;">`;
            } else if (file.datei_typ === 'video') {
                preview = `<div class="bg-dark text-white d-flex align-items-center justify-content-center rounded-top" style="height: 120px;">
                    <i class="bi bi-play-circle display-4"></i>
                </div>`;
            } else {
                preview = `<div class="bg-light d-flex align-items-center justify-content-center rounded-top" style="height: 120px;">
                    <i class="bi bi-file-earmark display-4 text-muted"></i>
                </div>`;
            }

            return `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="file-card border rounded">
                        ${preview}
                        <div class="p-2">
                            <div class="small text-truncate" title="${file.original_name}">
                                ${file.original_name}
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-1">
                                <small class="text-muted">${window.formatFileSize(file.groesse_bytes)}</small>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteFile(${file.id})" 
                                        ${isLocked ? 'disabled' : ''}>
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Initial render muss am Ende erfolgen
    renderFiles();
});
