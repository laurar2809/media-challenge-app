const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { uploadAufgabenpaket } = require('../middleware/uploads');
const fs = require('fs').promises;
const path = require('path');

// Aufgabenpakete Übersicht mit Filterung
router.get('/', async (req, res) => {
  try {
    const { kategorie, search } = req.query;
    
    let query = db('aufgabenpakete').select('*');

    // Filter nach Kategorie
    if (kategorie && kategorie !== 'alle') {
      query = query.where('kategorie', kategorie);
    }

    // Suche nach Titel/Beschreibung
    if (search && search.length >= 2) {
      query = query.where(function() {
        this.where('title', 'like', `%${search}%`)
             .orWhere('description', 'like', `%${search}%`)
             .orWhere('kategorie', 'like', `%${search}%`);
      });
    }

    const aufgabenpakete = await query.orderBy('title', 'asc');
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    res.render('aufgabenpakete', {
      aufgabenpakete: aufgabenpakete,
      kategorien: kategorien,
      activeKategorie: kategorie || 'alle',
      searchTerm: search || '',
      activePage: 'aufgabenpakete'
    });
  } catch (error) {
    console.error("Fehler beim Laden der aufgabenpakete:", error);
    res.render('aufgabenpakete', {
      aufgabenpakete: [],
      kategorien: [],
      activeKategorie: 'alle',
      searchTerm: '',
      activePage: 'aufgabenpakete'
    });
  }
});

// Aufgabenpaket Filter nach Kategorie
router.get('/filter/:kategorie', async (req, res) => {
  try {
    const kategorie = req.params.kategorie;

    const aufgabenpakete = await db('aufgabenpakete')
      .where({ kategorie: kategorie })
      .orderBy('title', 'asc');

    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    res.render('aufgabenpakete', {
      aufgabenpakete: aufgabenpakete,
      kategorien: kategorien,
      activeKategorie: kategorie,
      activePage: 'aufgabenpakete'
    });

  } catch (error) {
    console.error("Fehler beim Filtern:", error);
    req.flash('error', 'Fehler beim Filtern der aufgabenpakete');
    res.redirect('/aufgabenpakete');
  }
});

// Neues Aufgabenpaket Formular
router.get('/new', async (req, res) => {
  const kategorien = await db('categories').select('*').orderBy('title', 'asc');
  res.render('formAufgabenpakete', {
    item: {},
    kategorien,
    action: '/aufgabenpakete',
    title: 'Neues Aufgabenpaket anlegen',
    activePage: 'aufgabenpakete'
  });
});

// Aufgabenpaket speichern
router.post('/', uploadAufgabenpaket.single('iconFile'), async (req, res) => {
  let { kategorie, description, icon, title } = req.body;

  if (!kategorie || !description || !title) {
    req.flash('error', 'Titel, Kategorie und Beschreibung sind Pflichtfelder.');
    return res.redirect('/aufgabenpakete/new');
  }

  // BILD VERARBEITUNG HINZUFÜGEN
  if (req.file) {
    icon = '/uploads/aufgabenpakete/' + req.file.filename;
  }

  await db('aufgabenpakete').insert({
    title: title.trim(),
    description: description.trim(),
    kategorie: kategorie.trim(),
    icon: icon ? icon.trim() : null
  });

  req.flash('success', 'Aufgabenpaket erfolgreich angelegt.');
  res.redirect('/aufgabenpakete');
});

// Aufgabenpaket bearbeiten Formular
router.get('/:id/edit', async (req, res) => {
  try {
    const aufgabenpaket = await db('aufgabenpakete').where({ id: req.params.id }).first();
    const kategorien = await db('categories').select('*').orderBy('title', 'asc');

    if (!aufgabenpaket) {
      req.flash('error', 'Aufgabenpaket nicht gefunden.');
      return res.redirect('/aufgabenpakete');
    }

    res.render('formAufgabenpakete', {
      item: aufgabenpaket,
      kategorien,
      action: `/aufgabenpakete/${aufgabenpaket.id}?_method=PUT`,
      method: 'POST',
      title: 'Aufgabenpakete bearbeiten',
      activePage: 'aufgabenpakete'
    });

  } catch (error) {
    console.log("FEHLER:", error);
    req.flash('error', 'Fehler beim Laden des Aufgabenpaketes.');
    res.redirect('/aufgabenpakete');
  }
});

// Hilfsfunktion zum Löschen von Bildern
const deleteImageFile = async (imagePath) => {
  try {
    if (imagePath && imagePath.startsWith('/uploads/')) {
      const fullPath = path.join(__dirname, '../public', imagePath);
      await fs.unlink(fullPath);
      console.log('✅ Bild gelöscht:', fullPath);
    }
  } catch (error) {
    console.log('⚠️ Bild konnte nicht gelöscht werden (evtl. nicht vorhanden):', error.message);
  }
};

// Aufgabenpaket aktualisieren
router.put('/:id', uploadAufgabenpaket.single('iconFile'), async (req, res) => {
  try {
    let { kategorie, description, title, keep_existing_image } = req.body;

    const currentAufgabenpaket = await db('aufgabenpakete').where({ id: req.params.id }).first();
    if (!currentAufgabenpaket) {
      req.flash('error', 'Aufgabenpaket nicht gefunden.');
      return res.redirect('/aufgabenpakete');
    }

    let icon = currentAufgabenpaket.icon;

    // FALL 1: Bestehendes Bild soll gelöscht werden
    if (keep_existing_image === 'false') {
      await deleteImageFile(currentAufgabenpaket.icon);
      icon = null;
    }

    // FALL 2: Neues Bild wurde hochgeladen
    if (req.file) {
      // Altes Bild löschen (falls vorhanden)
      if (currentAufgabenpaket.icon && keep_existing_image !== 'false') {
        await deleteImageFile(currentAufgabenpaket.icon);
      }
      icon = '/uploads/aufgabenpakete/' + req.file.filename;
    }

    // FALL 3: Keine Änderung am Bild gewünscht
    // icon bleibt currentAufgabenpaket.icon

    await db('aufgabenpakete').where({ id: req.params.id }).update({
      title: title.trim(),
      description: description.trim(),
      kategorie: kategorie.trim(),
      icon: icon
    });

    req.flash('success', 'Änderungen gespeichert.');
    res.redirect('/aufgabenpakete');

  } catch (error) {
    console.error("Fehler beim Aktualisieren:", error);
    req.flash('error', 'Fehler beim Speichern der Änderungen.');
    res.redirect(`/aufgabenpakete/${req.params.id}/edit`);
  }
});

// Aufgabenpaket löschen
router.delete('/:id', async (req, res) => {
  try {
    const aufgabenpaketId = parseInt(req.params.id);
    const aufgabenpaketToDelete = await db('aufgabenpakete').where({ id: aufgabenpaketId }).first();

    if (!aufgabenpaketToDelete) {
      req.flash('error', `Aufgabenpaket mit ID ${aufgabenpaketId} nicht gefunden.`);
      return res.redirect('/aufgabenpakete');
    }

    // Bild löschen falls vorhanden
    if (aufgabenpaketToDelete.icon) {
      await deleteImageFile(aufgabenpaketToDelete.icon);
    }

    const deleteResult = await db('aufgabenpakete').where({ id: aufgabenpaketId }).del();

    if (deleteResult > 0) {
      console.log("🎉 ERFOLG: Aufgabenpaket wurde gelöscht!");
      req.flash('success', 'Aufgabenpaket erfolgreich gelöscht.');
    } else {
      req.flash('error', 'Löschen fehlgeschlagen.');
    }

  } catch (error) {
    console.error("FEHLER:", error);
    req.flash('error', 'Datenbank-Fehler: ' + error.message);
  }

  res.redirect('/aufgabenpakete');
});

// Aufgabenpaket Details
router.get('/:id', async (req, res) => {
  try {
    const aufgabenpaket = await db('aufgabenpakete').where({ id: req.params.id }).first();

    if (!aufgabenpaket) {
      req.flash('error', 'Aufgabenpaket nicht gefunden.');
      return res.redirect('/aufgabenpakete');
    }

    res.render('aufgabenpaketeDetail', {
      aufgabenpaket: aufgabenpaket,
      activePage: 'aufgabenpakete'
    });

  } catch (error) {
    console.error("Fehler:", error);
    req.flash('error', 'Fehler beim Laden des Aufgabenpaketes.');
    res.redirect('/aufgabenpakete');
  }
});

module.exports = router;