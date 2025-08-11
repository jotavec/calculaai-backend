// src/routes/filtroFaturamento.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const router = express.Router();
const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || "sua_chave_secreta";

// --- auth igual ao userRoutes ---
function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Token não fornecido." });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido." });
  }
}

/* ================== FILTRO DE MÉDIA (mesma tela) ================== */
// GET /api/filtro-faturamento
router.get("/filtro-faturamento", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { filtroFaturamentoMediaTipo: true },
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ filtro: user.filtroFaturamentoMediaTipo || "6" });
  } catch {
    res.status(500).json({ error: "Erro ao buscar filtro" });
  }
});

// POST /api/filtro-faturamento
router.post("/filtro-faturamento", authMiddleware, async (req, res) => {
  try {
    const { filtro } = req.body; // "1" | "3" | "6" | "12" | "all"
    await prisma.user.update({
      where: { id: req.userId },
      data: { filtroFaturamentoMediaTipo: filtro },
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao salvar filtro" });
  }
});

/* ================== SALES RESULTS (mesma tela) ================== */
// GET /api/sales-results
router.get("/sales-results", authMiddleware, async (req, res) => {
  try {
    const salesResults = await prisma.salesResult.findMany({
      where: { userId: req.userId },
      orderBy: { month: "asc" },
    });
    res.json(salesResults);
  } catch {
    res.status(500).json({ error: "Erro ao buscar faturamentos" });
  }
});

// POST /api/sales-results
router.post("/sales-results", authMiddleware, async (req, res) => {
  try {
    const { month, value } = req.body; // month: "YYYY-MM", value: number
    const novo = await prisma.salesResult.create({
      data: { userId: req.userId, month, value },
    });
    res.status(201).json(novo);
  } catch {
    res.status(500).json({ error: "Erro ao criar faturamento" });
  }
});

// DELETE /api/sales-results/:id
router.delete("/sales-results/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.salesResult.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: "Faturamento não encontrado" });
    if (item.userId !== req.userId) return res.status(403).json({ error: "Acesso negado" });

    await prisma.salesResult.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Erro ao apagar faturamento" });
  }
});

module.exports = router;
