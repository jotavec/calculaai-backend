const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');

// GET: Buscar todos os rótulos nutricionais de um produto
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

// POST: Salvar ou atualizar todos os rótulos nutricionais de um produto (sobrescreve tudo)
router.post('/produto/:produtoId', auth, async (req, res) => {
  const { produtoId } = req.params;
  const { rotulos } = req.body; // array de { categoriaNutricionalId, quantidade, vd }
  try {
    // Remove todos os rótulos antigos
    await prisma.produtoRotuloNutricional.deleteMany({ where: { produtoId } });

    // Cria os novos
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

// DELETE: Remove um rótulo nutricional específico de um produto
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
