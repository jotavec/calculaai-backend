const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Salvar preferências de colunas (cria ou atualiza)
router.post('/colunas-cadastro', async (req, res) => {
  const { userId, colunas } = req.body;
  if (!userId || !colunas) return res.status(400).json({ erro: 'Dados incompletos' });

  try {
    await prisma.preferenciaColunas.upsert({
      where: { userId },
      update: { colunas: JSON.stringify(colunas) },
      create: { userId, colunas: JSON.stringify(colunas) }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao salvar preferências' });
  }
});

// Buscar preferências de colunas por usuário
router.get('/colunas-cadastro/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const pref = await prisma.preferenciaColunas.findUnique({
      where: { userId }
    });
    res.json(pref ? JSON.parse(pref.colunas) : null);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar preferências' });
  }
});

module.exports = router;
