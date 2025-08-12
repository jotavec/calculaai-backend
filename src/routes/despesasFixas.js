const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   - name: DespesasFixas
 *     description: Subcategorias de despesas fixas e seus custos
 *
 * components:
 *   schemas:
 *     FixedCost:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid, example: "0f2f7f2a-9f2a-4b8a-9c2e-1a2b3c4d5e6f" }
 *         userId: { type: string, format: uuid }
 *         categoryId: { type: string, format: uuid }
 *         name: { type: string, example: "Aluguel" }
 *         value: { type: number, example: 2500 }
 *         createdAt: { type: string, format: date-time }
 *
 *     FixedCostCategory:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string, example: "Despesas Administrativas" }
 *         userId: { type: string, format: uuid }
 *         createdAt: { type: string, format: date-time }
 *         fixedCosts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FixedCost'
 *
 *     FixedCostCategoryCreate:
 *       type: object
 *       required: [name]
 *       properties:
 *         name: { type: string, example: "Despesas de Produção" }
 *
 *     FixedCostCreate:
 *       type: object
 *       required: [name, value]
 *       properties:
 *         name: { type: string, example: "Energia elétrica" }
 *         value: { type: number, example: 780.45 }
 *
 *     TotalDespesasFixasResponse:
 *       type: object
 *       properties:
 *         total:
 *           type: number
 *           example: 4280.45
 *         categorias:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FixedCostCategory'
 */

// ================= ROTA RAIZ: SUMÁRIO + LISTA =================
/**
 * @swagger
 * /despesasfixas:
 *   get:
 *     tags: [DespesasFixas]
 *     summary: Retorna o total de despesas fixas e a lista de subcategorias (com custos)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TotalDespesasFixasResponse'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.get('/', auth, async (req, res) => {
  try {
    const categorias = await prisma.fixedCostCategory.findMany({
      where: { userId: req.userId },
      include: { fixedCosts: true }
    });

    let total = 0;
    categorias.forEach(cat => {
      if (cat.fixedCosts?.length) {
        cat.fixedCosts.forEach(custo => {
          total += Number(custo.value || 0);
        });
      }
    });

    res.json({ total, categorias });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar despesas fixas' });
  }
});

// ============== SUBCATEGORIAS (CRUD) =================
/**
 * @swagger
 * /despesasfixas/subcategorias:
 *   get:
 *     tags: [DespesasFixas]
 *     summary: Lista subcategorias do usuário com seus custos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de subcategorias
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FixedCostCategory'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.get('/subcategorias', auth, async (req, res) => {
  try {
    const categorias = await prisma.fixedCostCategory.findMany({
      where: { userId: req.userId },
      include: { fixedCosts: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar subcategorias' });
  }
});

/**
 * @swagger
 * /despesasfixas/subcategorias:
 *   post:
 *     tags: [DespesasFixas]
 *     summary: Cria uma nova subcategoria
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FixedCostCategoryCreate'
 *     responses:
 *       201:
 *         description: Subcategoria criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FixedCostCategory'
 *       400:
 *         description: Payload inválido
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.post('/subcategorias', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Nome da subcategoria é obrigatório." });

    const categoria = await prisma.fixedCostCategory.create({
      data: { name, userId: req.userId }
    });
    res.status(201).json(categoria);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar subcategoria' });
  }
});

/**
 * @swagger
 * /despesasfixas/subcategorias/{id}:
 *   put:
 *     tags: [DespesasFixas]
 *     summary: Atualiza o nome de uma subcategoria
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FixedCostCategoryCreate'
 *     responses:
 *       200:
 *         description: Subcategoria atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FixedCostCategory'
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Não encontrada
 *       500:
 *         description: Erro interno
 */
router.put('/subcategorias/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;

    const categoria = await prisma.fixedCostCategory.findFirst({ where: { id, userId: req.userId } });
    if (!categoria) return res.status(404).json({ error: 'Subcategoria não encontrada ou acesso negado.' });

    const atualizada = await prisma.fixedCostCategory.update({
      where: { id },
      data: { name }
    });
    res.json(atualizada);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar subcategoria' });
  }
});

/**
 * @swagger
 * /despesasfixas/subcategorias/{id}:
 *   delete:
 *     tags: [DespesasFixas]
 *     summary: Remove uma subcategoria e seus custos
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Removido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Não encontrada
 *       500:
 *         description: Erro interno
 */
router.delete('/subcategorias/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const categoria = await prisma.fixedCostCategory.findFirst({ where: { id, userId: req.userId } });
    if (!categoria) return res.status(404).json({ error: 'Subcategoria não encontrada ou acesso negado.' });

    await prisma.fixedCost.deleteMany({ where: { categoryId: id, userId: req.userId } });
    await prisma.fixedCostCategory.delete({ where: { id } });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar subcategoria' });
  }
});

// ============== CUSTOS (CRUD) =================
/**
 * @swagger
 * /despesasfixas/subcategorias/{categoryId}/custos:
 *   post:
 *     tags: [DespesasFixas]
 *     summary: Adiciona um custo fixo à subcategoria
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FixedCostCreate'
 *     responses:
 *       201:
 *         description: Custo criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FixedCost'
 *       400:
 *         description: Payload inválido
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Subcategoria não encontrada
 *       500:
 *         description: Erro interno
 */
router.post('/subcategorias/:categoryId/custos', auth, async (req, res) => {
  try {
    const { name, value } = req.body;
    const { categoryId } = req.params;

    if (!name) return res.status(400).json({ error: "Nome do custo é obrigatório." });
    if (value === undefined || value === null) return res.status(400).json({ error: "Valor do custo é obrigatório." });

    const categoria = await prisma.fixedCostCategory.findFirst({ where: { id: categoryId, userId: req.userId } });
    if (!categoria) return res.status(404).json({ error: 'Subcategoria não encontrada ou acesso negado.' });

    const custo = await prisma.fixedCost.create({
      data: {
        name,
        value,
        categoryId,
        userId: req.userId
      }
    });
    res.status(201).json(custo);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar custo' });
  }
});

/**
 * @swagger
 * /despesasfixas/custos/{id}:
 *   put:
 *     tags: [DespesasFixas]
 *     summary: Edita um custo fixo
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FixedCostCreate'
 *     responses:
 *       200:
 *         description: Custo atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FixedCost'
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Não encontrado
 *       500:
 *         description: Erro interno
 */
router.put('/custos/:id', auth, async (req, res) => {
  try {
    const { name, value } = req.body;
    const { id } = req.params;

    const custo = await prisma.fixedCost.findFirst({ where: { id, userId: req.userId } });
    if (!custo) return res.status(404).json({ error: 'Custo não encontrado ou acesso negado.' });

    const atualizado = await prisma.fixedCost.update({
      where: { id },
      data: { name, value }
    });
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar custo' });
  }
});

/**
 * @swagger
 * /despesasfixas/custos/{id}:
 *   delete:
 *     tags: [DespesasFixas]
 *     summary: Remove um custo fixo
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Removido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Não encontrado
 *       500:
 *         description: Erro interno
 */
router.delete('/custos/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const custo = await prisma.fixedCost.findFirst({ where: { id, userId: req.userId } });
    if (!custo) return res.status(404).json({ error: 'Custo não encontrado ou acesso negado.' });

    await prisma.fixedCost.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar custo' });
  }
});

module.exports = router;
