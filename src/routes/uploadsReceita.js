// src/routes/uploadsReceita.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

const router = express.Router();

// Cria a pasta caso não exista
const uploadDir = path.join(__dirname, '../../public/uploads/receitas');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do multer para uploads na pasta public/uploads/receitas
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `receita_${req.userId}_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

// Endpoint para upload da imagem da receita
router.post('/receita', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  // Caminho público
  const fileUrl = `/uploads/receitas/${req.file.filename}`;
  res.json({ url: fileUrl });
});

module.exports = router;
