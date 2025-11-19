const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { uploadCategory } = require('../middleware/uploads');

// Kategorien Übersicht (Homepage)
// Wird bereits in routes/index.js behandelt

// Neue Kategorie Formular
router.get('/new', (req, res) => {
  res.render('formKategorien', {
    item: {},
    action: '/categories',
    method: 'POST',
    title: 'Neue Kategorie anlegen',
    activePage: 'kategorien'
  });
});

// Kategorie speichern
router.post('/', uploadCategory.single('iconFile'), async (req, res) => {
  let { title, description, icon } = req.body;

  if (!title || !description) {
    req.flash('error', 'Titel und Beschreibung sind Pflichtfelder.');
    return res.redirect('/categories/new');
  }
  if (req.file) icon = '/uploads/categories/' + req.file.filename;

  await db('categories').insert({ 
    title: title.trim(), 
    description: description.trim(), 
    icon: icon ? icon.trim() : null 
  });
  req.flash('success', 'Kategorie erfolgreich angelegt.');
  res.redirect('/');
});

// Kategorie bearbeiten Formular
router.get('/:id/edit', async (req, res) => {
  const item = await db('categories').where({ id: req.params.id }).first();
  if (!item) {
    req.flash('error', 'Kategorie nicht gefunden.');
    return res.redirect('/');
  }
  res.render('formKategorien', { 
    item, 
    action: `/categories/${item.id}?_method=PUT`, 
    method: 'POST', 
    title: 'Kategorie bearbeiten', 
    activePage: 'kategorien' 
  });
});

// Kategorie aktualisieren
router.put('/:id', uploadCategory.single('iconFile'), async (req, res) => {
  let { title, description, icon } = req.body;
  const currentItem = await db('categories').where({ id: req.params.id }).first();
  if (!req.file) icon = currentItem.icon;

  if (req.file) icon = '/uploads/categories/' + req.file.filename;

  await db('categories').where({ id: req.params.id }).update({
    title: title.trim(),
    description: description.trim(),
    icon: icon ? icon.trim() : null
  });

  req.flash('success', 'Änderungen gespeichert.');
  res.redirect('/');
});

// Kategorie löschen
router.delete('/:id', async (req, res) => {
  const item = await db('categories').where({ id: req.params.id }).first();
  if (item && res.locals.isUploadPath(item.icon)) {
    // try to remove uploaded file
    const filePath = path.join(__dirname, '../public', item.icon);
    fs.unlink(filePath, () => { });
  }
  await db('categories').where({ id: req.params.id }).del();
  req.flash('success', 'Kategorie gelöscht.');
  res.redirect('/');
});

module.exports = router;