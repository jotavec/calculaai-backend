// src/routes/rotuloNutricional.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   - name: Rótulos Nutricionais
 *     description: Endpoints para gestão dos rótulos nutricionais de produtos
 */

/**
 * @swagger
 * /rotulos-nutricionais/produto/{produtoId}:
 *   get:
 *     tags: [Rótulos Nutricionais]
 *     summary: Lista todos os rótulos nutricionais de um produto
 *     parameters:
 *       - in: path
 *         name: produtoId
 *         required: true
 *         description: ID do produto
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de rótulos nutricionais
 */
router.get('/produto/:produtoId', auth, async (req, res) => {
  const { produtoId } = req.params;
  try {
    const rotulos = await prisma.produtoRotuloNutricional.findMany({
      where: { produtoId },
      include: {
        categoriaNutricional: true,
      }
    });
    res.json(rotulos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /rotulos-nutricionais/produto/{produtoId}:
 *   post:
 *     tags: [Rótulos Nutricionais]
 *     summary: Sobrescreve todos os rótulos nutricionais de um produto
 *     parameters:
 *       - in: path
 *         name: produtoId
 *         required: true
 *         description: ID do produto
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rotulos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     categoriaNutricionalId:
 *                       type: string
 *                     quantidade:
 *                       type: string
 *                     vd:
 *                       type: string
 *     responses:
 *       201:
 *         description: Lista dos rótulos nutricionais criados
 */
router.post('/produto/:produtoId', auth, async (req, res) => {
  const { produtoId } = req.params;
  const { rotulos } = req.body;
  try {
    await prisma.produtoRotuloNutricional.deleteMany({ where: { produtoId } });

    const criados = [];
    for (const rotulo of rotulos) {
      if (!rotulo.categoriaNutricionalId || !rotulo.quantidade) continue;
      const novo = await prisma.produtoRotuloNutricional.create({
        data: {
          produtoId,
          categoriaNutricionalId: rotulo.categoriaNutricionalId,
          quantidade: rotulo.quantidade,
          vd: rotulo.vd || null,
        }
      });
      criados.push(novo);
    }
    res.status(201).json(criados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /rotulos-nutricionais/{id}:
 *   delete:
 *     tags: [Rótulos Nutricionais]
 *     summary: Remove um rótulo nutricional específico
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do rótulo nutricional
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Rótulo removido com sucesso
 */
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.produtoRotuloNutricional.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
