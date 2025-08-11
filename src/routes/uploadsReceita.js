// src/routes/uploadsReceita.js
const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const salvarImagem = require('../util/salvarImagem'); // R2 (S3) uploader

const router = express.Router();

/**
 * Multer em MEMÓRIA (buffer), sem gravar em disco local.
 * Limite de 10MB por arquivo (ajuste se precisar).
 * Filtra somente imagens comuns.
 */
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = /image\/(png|jpe?g|webp|gif)/i.test(file.mimetype);
    if (!ok) return cb(new Error('Tipo de arquivo não suportado.'));
    cb(null, true);
  },
});

/**
 * POST /uploads/receita
 * Campo do form-data: "file"
 * Autenticado (usa req.userId do middleware)
 * Retorna: { url: 'https://...r2.../arquivo.png' }
 */
router.post('/receita', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    // monta um nome "amigável" só pra extensão (o util gera o nome final)
    const originalName = req.file.originalname || `receita_${req.userId || 'anon'}.jpg`;
    const url = await salvarImagem(req.file.buffer, originalName, req.file.mimetype);

    return res.json({ url });
  } catch (err) {
    console.error('Erro no upload de receita:', err);
    return res.status(500).json({ error: 'Falha ao enviar imagem.' });
  }
});

module.exports = router;
