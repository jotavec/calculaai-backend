// src/routes/preferenciasColunas.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   - name: PreferenciasColunas
 *     description: Gerenciamento de preferências de colunas no cadastro
 *
 * components:
 *   schemas:
 *     ColunasInput:
 *       type: array
 *       description: Lista de colunas visíveis e suas configurações
 *       items:
 *         type: string
 *         example: "nomeProduto"
 *     ColunasResponse:
 *       type: array
 *       items:
 *         type: string
 *         example: "nomeProduto"
 */

// Todas as rotas exigem autenticação
router.use(auth);

/**
 * @swagger
 * /colunas-cadastro:
 *   post:
 *     tags: [PreferenciasColunas]
 *     summary: Salva ou atualiza as preferências de colunas do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               colunas:
 *                 $ref: '#/components/schemas/ColunasInput'
 *     responses:
 *       200:
 *         description: Preferências salvas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       400:
 *         description: Dados incompletos
 *       500:
 *         description: Erro ao salvar preferências
 */
router.post('/colunas-cadastro', async (req, res) => {
  const userId = req.userId;
  const { colunas } = req.body;
  if (!colunas) return res.status(400).json({ erro: 'Colunas não fornecidas' });

  try {
    await prisma.preferenciaColunas.upsert({
      where: { userId },
      update: { colunas: JSON.stringify(colunas) },
      create: { userId, colunas: JSON.stringify(colunas) }
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('Erro ao salvar preferências:', e);
    res.status(500).json({ erro: 'Erro ao salvar preferências' });
  }
});

/**
 * @swagger
 * /colunas-cadastro:
 *   get:
 *     tags: [PreferenciasColunas]
 *     summary: Busca as preferências de colunas do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de colunas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ColunasResponse'
 *       500:
 *         description: Erro ao buscar preferências
 */
router.get('/colunas-cadastro', async (req, res) => {
  const userId = req.userId;
  try {
    const pref = await prisma.preferenciaColunas.findUnique({
      where: { userId }
    });
    res.json(pref ? JSON.parse(pref.colunas) : null);
  } catch (e) {
    console.error('Erro ao buscar preferências:', e);
    res.status(500).json({ erro: 'Erro ao buscar preferências' });
  }
});

module.exports = router;
