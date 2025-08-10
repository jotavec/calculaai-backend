const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');

// =============== NOVA ROTA raiz /api/despesasfixas ==================
router.get('/', auth, async (req, res) => {
  try {
    // Busca todas as subcategorias com seus custos
    const categorias = await prisma.fixedCostCategory.findMany({
      where: { userId: req.userId },
      include: { fixedCosts: true }
    });

    // Soma o valor de todos os custos de todas as subcategorias
    let total = 0;
    categorias.forEach(cat => {
      if (cat.fixedCosts && cat.fixedCosts.length > 0) {
        cat.fixedCosts.forEach(custo => {
          total += Number(custo.value || 0);
        });
      }
    });

    // Retorna também as categorias completas (se quiser usar no front)
    res.json({ total, categorias });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar despesas fixas' });
  }
});
// ====================================================================

// Listar todas as subcategorias de despesas fixas do usuário autenticado (com custos)
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

// Criar uma nova subcategoria
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

// Editar uma subcategoria
router.put('/subcategorias/:id', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;

    // Verifica se pertence ao usuário
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

// Deletar uma subcategoria (e todos os custos dentro dela)
router.delete('/subcategorias/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    // Verifica se pertence ao usuário
    const categoria = await prisma.fixedCostCategory.findFirst({ where: { id, userId: req.userId } });
    if (!categoria) return res.status(404).json({ error: 'Subcategoria não encontrada ou acesso negado.' });

    // Deleta custos primeiro (onDelete: Cascade não existe no Prisma para relações opcionais)
    await prisma.fixedCost.deleteMany({ where: { categoryId: id, userId: req.userId } });
    await prisma.fixedCostCategory.delete({ where: { id } });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar subcategoria' });
  }
});

// Adicionar um custo fixo a uma subcategoria
router.post('/subcategorias/:categoryId/custos', auth, async (req, res) => {
  try {
    const { name, value } = req.body;
    const { categoryId } = req.params;

    if (!name) return res.status(400).json({ error: "Nome do custo é obrigatório." });
    if (value === undefined || value === null) return res.status(400).json({ error: "Valor do custo é obrigatório." });

    // Verifica se categoria pertence ao usuário
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

// Editar um custo fixo
router.put('/custos/:id', auth, async (req, res) => {
  try {
    const { name, value } = req.body;
    const { id } = req.params;

    // Verifica se pertence ao usuário
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

// Deletar um custo fixo
router.delete('/custos/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se pertence ao usuário
    const custo = await prisma.fixedCost.findFirst({ where: { id, userId: req.userId } });
    if (!custo) return res.status(404).json({ error: 'Custo não encontrado ou acesso negado.' });

    await prisma.fixedCost.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar custo' });
  }
});

module.exports = router;
