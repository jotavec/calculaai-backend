// src/routes/uploadsReceita.js
// Rotas de upload (memória) salvando no Cloudflare R2

const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const salvarImagem = require('../util/salvarImagem');

const router = express.Router();

// Armazena em memória (sem salvar no disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// ---------------------------------------------
// POST /api/uploads/receita  (campo: file)
// ---------------------------------------------
router.post(
  '/receita',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Arquivo não enviado (campo "file").' });
      }

      const { buffer, originalname, mimetype } = req.file;

      const url = await salvarImagem(
        buffer,
        originalname,
        mimetype,
        'uploads/receitas'
      );

      return res.status(201).json({ ok: true, url });
    } catch (err) {
      console.error('[POST /api/uploads/receita] Erro:', err);
      return res.status(500).json({ message: 'Erro ao enviar arquivo.' });
    }
  }
);

// ---------------------------------------------
// POST /api/uploads/avatar  (campo: file)
// ---------------------------------------------
router.post(
  '/avatar',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Arquivo não enviado (campo "file").' });
      }

      const { buffer, originalname, mimetype } = req.file;

      const url = await salvarImagem(
        buffer,
        originalname,
        mimetype,
        'uploads/avatars'
      );

      return res.status(201).json({ ok: true, url });
    } catch (err) {
      console.error('[POST /api/uploads/avatar] Erro:', err);
      return res.status(500).json({ message: 'Erro ao enviar avatar.' });
    }
  }
);

module.exports = router;
