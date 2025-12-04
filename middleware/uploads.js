// middleware/uploads.js - ERWEITERTE VERSION
const multer = require('multer');
const mime = require('mime-types');
const path = require('path');
const fs = require('fs');

// Upload-Verzeichnisse sicherstellen
const ensureUploadDir = (subDir) => {
  const fullPath = path.join(__dirname, '../public/uploads', subDir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
};

// Multer Konfiguration
const createStorage = (subDir, prefix) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = ensureUploadDir(subDir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = mime.extension(file.mimetype) || 'bin';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${prefix}-${unique}.${ext}`);
  }
});

// Upload Middlewares
const uploadAufgabenpaket = multer({ 
  storage: createStorage('aufgabenpakete', 'aufgabenpaket'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const uploadCategory = multer({ 
  storage: createStorage('categories', 'category'),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ============ NEUE KONFIGURATION FÜR ABGABEN ============
const uploadAbgabeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = ensureUploadDir('abgaben');
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = mime.extension(file.mimetype) || path.extname(file.originalname).slice(1);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `abgabe-${unique}-${sanitizedName.substring(0, 50)}.${ext}`);
  }
});

// Dateifilter für Abgaben
const abgabeFileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Bilder
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
    // Videos
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-m4a',
    // Dokumente
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Dateityp nicht erlaubt: ${file.mimetype}. Nur Bilder, Videos, Audio und Dokumente erlaubt.`));
  }
};


module.exports = {
  uploadAufgabenpaket,
  uploadCategory,
  uploadAbgabe // JETZT EXPORTIERT!
};