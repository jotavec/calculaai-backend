// src/routes/uploadsReceita.js
// Rotas de upload para Cloudflare R2 usando multer (memória)

const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const salvarImagem = require('../util/salvarImagem');

const router = express.Router();

/**
 * (Opcional) whitelist de MIME types aceitos.
 * Se quiser aceitar qualquer arquivo, deixe como null.
 */
const ACCEPTED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

// Armazena em memória (não grava no disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * Helper para validar se o arquivo está presente e (opcionalmente) o mimetype.
 */
function ensureFileOr415(file) {
  if (!file) {
    const err = new Error('Arquivo não enviado (campo "file").');
    err.statusCode = 400;
    throw err;
  }
  if (ACCEPTED_MIME && !ACCEPTED_MIME.has(file.mimetype)) {
    const err = new Error('Tipo de arquivo não suportado.');
    err.statusCode = 415;
    throw err;
  }
}

/* ---------------------------------------------
 * POST /api/uploads/receita
 * campo: file
 * ------------------------------------------- */
router.post('/receita', requireAuth, upload.single('file'), async (req, res) => {
  try {
    ensureFileOr415(req.file);

    const { buffer, originalname, mimetype } = req.file;
    const url = await salvarImagem(buffer, originalname, mimetype, 'uploads/receitas');

    return res.status(201).json({ ok: true, url });
  } catch (err) {
    /* eslint-disable no-console */
    console.error('[POST /api/uploads/receita] Erro:', err);
    /* eslint-enable no-console */
    const code = err.statusCode || 500;
    return res.status(code).json({ message: err.message || 'Erro ao enviar arquivo.' });
  }
});

/* ---------------------------------------------
 * POST /api/uploads/avatar
 * campo: file
 * ------------------------------------------- */
router.post('/avatar', requireAuth, upload.single('file'), async (req, res) => {
  try {
    ensureFileOr415(req.file);

    const { buffer, originalname, mimetype } = req.file;
    const url = await salvarImagem(buffer, originalname, mimetype, 'uploads/avatars');

    return res.status(201).json({ ok: true, url });
  } catch (err) {
    /* eslint-disable no-console */
    console.error('[POST /api/uploads/avatar] Erro:', err);
    /* eslint-enable no-console */
    const code = err.statusCode || 500;
    return res.status(code).json({ message: err.message || 'Erro ao enviar avatar.' });
  }
});

module.exports = router;
