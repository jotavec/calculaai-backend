const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// BUSCAR ATIVOS DO BLOCO
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

// ATUALIZAR/CRIAR ATIVOS DO BLOCO
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
