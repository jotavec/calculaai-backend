// src/routes/filtroFaturamento.js — COMPLETO (com Swagger)
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

/**
 * @swagger
 * tags:
 *   - name: FiltroFaturamento
 *     description: Preferência do usuário para o filtro de média de faturamento
 *   - name: SalesResults
 *     description: CRUD simples dos resultados de faturamento (mês/valor)
 *
 * components:
 *   schemas:
 *     FiltroFaturamentoGetResponse:
 *       type: object
 *       properties:
 *         filtro:
 *           type: string
 *           description: Janela usada para média ("1" | "3" | "6" | "12" | "all")
 *           example: "6"
 *
 *     FiltroFaturamentoSetPayload:
 *       type: object
 *       required: [filtro]
 *       properties:
 *         filtro:
 *           type: string
 *           enum: ["1", "3", "6", "12", "all"]
 *           example: "12"
 *
 *     SalesResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a9b3c1de-1f23-4c56-8a9b-1c2d3e4f5a6b"
 *         userId:
 *           type: string
 *           format: uuid
 *           example: "d0b0491e-1261-4381-9626-6f6ccfc7629e"
 *         month:
 *           type: string
 *           description: Mês no formato YYYY-MM
 *           example: "2025-08"
 *         value:
 *           type: number
 *           example: 42000
 *
 *     SalesResultCreate:
 *       type: object
 *       required: [month, value]
 *       properties:
 *         month:
 *           type: string
 *           description: Mês no formato YYYY-MM
 *           example: "2025-08"
 *         value:
 *           type: number
 *           example: 42000
 */

/* ================== FILTRO DE MÉDIA (mesma tela) ================== */
/**
 * @swagger
 * /filtro-faturamento:
 *   get:
 *     tags: [FiltroFaturamento]
 *     summary: Retorna a janela de média de faturamento escolhida pelo usuário
 *     description: Valores possíveis para filtro são "1", "3", "6", "12" ou "all". Padrão "6" se não configurado.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Filtro atual do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FiltroFaturamentoGetResponse'
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno
 */
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

/**
 * @swagger
 * /filtro-faturamento:
 *   post:
 *     tags: [FiltroFaturamento]
 *     summary: Define a janela de média de faturamento do usuário
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FiltroFaturamentoSetPayload'
 *     responses:
 *       200:
 *         description: Salvo com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
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
/**
 * @swagger
 * /sales-results:
 *   get:
 *     tags: [SalesResults]
 *     summary: Lista os resultados de faturamento do usuário (por mês)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de faturamentos mensais
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SalesResult'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
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

/**
 * @swagger
 * /sales-results:
 *   post:
 *     tags: [SalesResults]
 *     summary: Cria um novo registro de faturamento mensal do usuário
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SalesResultCreate'
 *     responses:
 *       201:
 *         description: Registro criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesResult'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
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

/**
 * @swagger
 * /sales-results/{id}:
 *   delete:
 *     tags: [SalesResults]
 *     summary: Remove um registro de faturamento mensal do usuário
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID do registro
 *     responses:
 *       204:
 *         description: Removido com sucesso (sem conteúdo)
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Não encontrado
 *       500:
 *         description: Erro interno
 */
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
