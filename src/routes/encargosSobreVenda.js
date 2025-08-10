const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET – Buscar dados (por usuário logado)
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    let registro = await prisma.encargosSobreVenda.findFirst({ where: { userId } });
    if (!registro) {
      // retorna todos os campos esperados como vazio
      return res.json({
        icms: { percent: 0, value: 0 },
        iss: { percent: 0, value: 0 },
        pisCofins: { percent: 0, value: 0 },
        irpjCsll: { percent: 0, value: 0 },
        ipi: { percent: 0, value: 0 },
        debito: { percent: 0, value: 0 },
        credito: { percent: 0, value: 0 },
        boleto: { percent: 0, value: 0 },
        pix: { percent: 0, value: 0 },
        gateway: { percent: 0, value: 0 },
        marketing: { percent: 0, value: 0 },
        delivery: { percent: 0, value: 0 },
        saas: { percent: 0, value: 0 },
        colaboradores: { percent: 0, value: 0 },
        creditoParcelado: [],
        outros: [],
        id: null,
        createdAt: null,
        updatedAt: null
      });
    }
    const { data, createdAt, updatedAt, id } = registro;
    // data pode ser null, então garante objeto vazio
    const base = data || {};
    res.json({
      ...base,
      id,
      createdAt,
      updatedAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// POST – Salvar (cria ou atualiza)
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    // Recebe tudo do body
    const payload = req.body;
    let registro = await prisma.encargosSobreVenda.findFirst({ where: { userId } });
    if (registro) {
      await prisma.encargosSobreVenda.update({
        where: { id: registro.id },
        data: { data: payload }
      });
    } else {
      await prisma.encargosSobreVenda.create({
        data: { userId, data: payload }
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
