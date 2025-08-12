// src/routes/uploadsReceita.js
const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const salvarImagem = require('../util/salvarImagem'); // R2 (S3) uploader

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Uploads
 *     description: Endpoints para upload de arquivos (imagens) no sistema
 */

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
 * @swagger
 * /uploads/receita:
 *   post:
 *     tags: [Uploads]
 *     summary: Faz o upload de uma imagem de receita
 *     description: Recebe uma imagem no campo `file` (form-data) e retorna a URL pública gerada no storage.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Imagem a ser enviada (PNG, JPG, JPEG, WEBP ou GIF)
 *     responses:
 *       200:
 *         description: Upload realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   example: "https://cdn.seusistema.com/uploads/receitas/abc123.png"
 *       400:
 *         description: Nenhum arquivo enviado ou formato inválido
 *       500:
 *         description: Erro interno no servidor
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
