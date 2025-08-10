const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth"); // se não tiver, pode remover
const prisma = new PrismaClient();

// GET - listar todas categorias nutricionais do usuário
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

// POST - criar nova categoria nutricional
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

// PUT - editar categoria nutricional
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

// DELETE - remover categoria nutricional
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
