const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @swagger
 * tags:
 *   - name: BlocoAtivos
 *     description: Ativos vinculados a um bloco de markup
 *
 * components:
 *   schemas:
 *     BlocoAtivosGetResponse:
 *       type: object
 *       properties:
 *         ativos:
 *           type: object
 *           additionalProperties: true
 *           description: Objeto com os ativos do bloco (estrutura livre)
 *       example:
 *         ativos:
 *           energia: 1200
 *           aluguel: 2500
 *           manutencao:
 *             maquinas: 300
 *             frota: 180
 *
 *     BlocoAtivosPostPayload:
 *       type: object
 *       required: [ativos]
 *       properties:
 *         ativos:
 *           type: object
 *           additionalProperties: true
 *           description: Objeto com os ativos do bloco (estrutura livre)
 *       example:
 *         ativos:
 *           energia: 1350
 *           aluguel: 2500
 */

// ============================ BUSCAR ATIVOS DO BLOCO ============================
/**
 * @swagger
 * /bloco-ativos/{blocoId}:
 *   get:
 *     tags: [BlocoAtivos]
 *     summary: Retorna os ativos salvos para um bloco do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: blocoId
 *         required: true
 *         schema: { type: integer }
 *         description: ID do bloco
 *     responses:
 *       200:
 *         description: Ativos do bloco (pode ser vazio)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlocoAtivosGetResponse'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.get('/:blocoId', auth, async (req, res) => {
  const userId = req.userId;
  const { blocoId } = req.params;
  try {
    const blocoAtivos = await prisma.blocoAtivos.findFirst({
      where: { blocoId: Number(blocoId), userId: String(userId) }
    });
    res.json({ ativos: blocoAtivos ? blocoAtivos.ativos : {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================= ATUALIZAR/CRIAR ATIVOS DO BLOCO ======================
/**
 * @swagger
 * /bloco-ativos/{blocoId}:
 *   post:
 *     tags: [BlocoAtivos]
 *     summary: Cria ou atualiza os ativos de um bloco do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: blocoId
 *         required: true
 *         schema: { type: integer }
 *         description: ID do bloco
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BlocoAtivosPostPayload'
 *     responses:
 *       200:
 *         description: Operação concluída
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Payload inválido
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.post('/:blocoId', auth, async (req, res) => {
  const userId = req.userId;
  const { blocoId } = req.params;
  const { ativos } = req.body; // Espera { ativos: { ... } }
  if (!ativos || typeof ativos !== 'object') {
    return res.status(400).json({ error: "Dados de ativos inválidos" });
  }
  try {
    let blocoAtivos = await prisma.blocoAtivos.findFirst({
      where: { blocoId: Number(blocoId), userId: String(userId) }
    });

    if (blocoAtivos) {
      await prisma.blocoAtivos.update({
        where: { id: blocoAtivos.id },
        data: { ativos }
      });
    } else {
      await prisma.blocoAtivos.create({
        data: {
          userId: String(userId),
          blocoId: Number(blocoId),
          ativos
        }
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
