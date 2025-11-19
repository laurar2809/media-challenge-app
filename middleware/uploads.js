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
  storage: createStorage('aufgabenpakete', 'aufgabenpaket') 
});

const uploadCategory = multer({ 
  storage: createStorage('categories', 'category') 
});

module.exports = {
  uploadAufgabenpaket,
  uploadCategory
};