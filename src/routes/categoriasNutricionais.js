const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const prisma = new PrismaClient();

/**
 * @swagger
 * tags:
 *   - name: CategoriasNutricionais
 *     description: CRUD de categorias nutricionais por usuário
 *
 * components:
 *   schemas:
 *     CategoriaNutricional:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "7a9f1b4c-3b9a-4d2a-b2c0-6b8a6a5b5c9e"
 *         descricao:
 *           type: string
 *           example: "Carboidratos"
 *         unidade:
 *           type: string
 *           example: "g"
 *         userId:
 *           type: string
 *           format: uuid
 *           example: "d0b0491e-1261-4381-9626-6f6ccfc7629e"
 *     CategoriaNutricionalCreate:
 *       type: object
 *       required: [descricao, unidade]
 *       properties:
 *         descricao:
 *           type: string
 *           example: "Proteínas"
 *         unidade:
 *           type: string
 *           example: "g"
 *     CategoriaNutricionalUpdate:
 *       type: object
 *       properties:
 *         descricao:
 *           type: string
 *           example: "Proteínas"
 *         unidade:
 *           type: string
 *           example: "g"
 */

/**
 * @swagger
 * /categorias-nutricionais:
 *   get:
 *     tags: [CategoriasNutricionais]
 *     summary: Lista todas as categorias nutricionais do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de categorias nutricionais
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CategoriaNutricional'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const categorias = await prisma.categoriaNutricional.findMany({
      where: { userId },
      orderBy: { descricao: "asc" },
    });
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /categorias-nutricionais:
 *   post:
 *     tags: [CategoriasNutricionais]
 *     summary: Cria uma nova categoria nutricional para o usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoriaNutricionalCreate'
 *     responses:
 *       201:
 *         description: Categoria criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoriaNutricional'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { descricao, unidade } = req.body;
    const cat = await prisma.categoriaNutricional.create({
      data: { descricao, unidade, userId },
    });
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /categorias-nutricionais/{id}:
 *   put:
 *     tags: [CategoriasNutricionais]
 *     summary: Atualiza uma categoria nutricional por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID da categoria
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoriaNutricionalUpdate'
 *     responses:
 *       200:
 *         description: Categoria atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoriaNutricional'
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Não encontrada
 *       500:
 *         description: Erro interno
 */
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, unidade } = req.body;
    const cat = await prisma.categoriaNutricional.update({
      where: { id },
      data: { descricao, unidade },
    });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /categorias-nutricionais/{id}:
 *   delete:
 *     tags: [CategoriasNutricionais]
 *     summary: Remove uma categoria nutricional por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID da categoria
 *     responses:
 *       204:
 *         description: Removida com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Não encontrada
 *       500:
 *         description: Erro interno
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.categoriaNutricional.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
