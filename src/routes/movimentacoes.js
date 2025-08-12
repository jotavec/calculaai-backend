// src/routes/movimentacoesEstoque.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   - name: MovimentacoesEstoque
 *     description: Controle de movimentações de estoque (entradas e saídas)
 *
 * components:
 *   schemas:
 *     Movimentacao:
 *       type: object
 *       properties:
 *         id: { type: string, example: "uuid-da-movimentacao" }
 *         tipo: { type: string, enum: ["entrada", "saida"], example: "entrada" }
 *         produtoId: { type: string, example: "uuid-do-produto" }
 *         quantidade: { type: string, example: "10" }
 *         data: { type: string, format: date-time }
 *     MovimentacaoList:
 *       type: array
 *       items: { $ref: '#/components/schemas/Movimentacao' }
 */

// Middleware para bloquear planos gratuitos
async function bloqueiaGratuito(req, res, next) {
  try {
    const userId = req.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const plano = user?.plano || "gratuito";
    if (plano === "gratuito") {
      return res.status(403).json({
        error: "Funcionalidade disponível apenas para assinantes. Faça upgrade para acessar movimentações."
      });
    }
    next();
  } catch (err) {
    console.error("Erro no bloqueio de plano:", err);
    res.status(500).json({ error: "Erro interno no bloqueio de plano" });
  }
}

router.use(auth, bloqueiaGratuito);

/**
 * @swagger
 * /movimentacoes:
 *   get:
 *     tags: [MovimentacoesEstoque]
 *     summary: Lista todas as movimentações de estoque (entradas e saídas)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de movimentações
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/MovimentacaoList' }
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Restrito a assinantes
 *       500:
 *         description: Erro interno
 */
router.get("/", async (req, res) => {
  try {
    const entradas = await prisma.entradaEstoque.findMany();
    const saidas = await prisma.saidaEstoque.findMany();

    const movs = [
      ...entradas.map(e => ({
        id: e.id,
        tipo: "entrada",
        produtoId: e.produtoId,
        quantidade: e.quantidade,
        data: e.data,
      })),
      ...saidas.map(s => ({
        id: s.id,
        tipo: "saida",
        produtoId: s.produtoId,
        quantidade: s.quantidade,
        data: s.data,
      })),
    ];

    movs.sort((a, b) => (b.data && a.data ? new Date(b.data) - new Date(a.data) : 0));
    res.json(movs);
  } catch (e) {
    console.error("ERRO AO BUSCAR MOVIMENTAÇÕES:", e);
    res.status(500).json({ error: "Erro ao buscar movimentações" });
  }
});

/**
 * @swagger
 * /movimentacoes/entrada/{id}:
 *   delete:
 *     tags: [MovimentacoesEstoque]
 *     summary: Deleta uma entrada de estoque e atualiza o saldo do produto
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID da entrada de estoque
 *     responses:
 *       200:
 *         description: Entrada removida com sucesso
 *       404:
 *         description: Entrada ou produto não encontrado
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.delete("/entrada/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const entrada = await prisma.entradaEstoque.findUnique({ where: { id } });
    if (!entrada) return res.status(404).json({ error: "Entrada não encontrada" });

    const produto = await prisma.produto.findUnique({ where: { id: entrada.produtoId } });
    if (!produto) return res.status(404).json({ error: "Produto não encontrado" });

    const estoqueAtual = Number(produto.estoque) || 0;
    const quantidadeEntrada = Number(entrada.quantidade) || 0;
    const novoEstoque = String(estoqueAtual - quantidadeEntrada);

    await prisma.produto.update({
      where: { id: produto.id },
      data: { estoque: novoEstoque }
    });

    await prisma.entradaEstoque.delete({ where: { id } });

    res.json({ ok: true });
  } catch (e) {
    console.error("ERRO AO DELETAR ENTRADA:", e);
    res.status(500).json({ error: "Erro ao deletar entrada" });
  }
});

/**
 * @swagger
 * /movimentacoes/saida/{id}:
 *   delete:
 *     tags: [MovimentacoesEstoque]
 *     summary: Deleta uma saída de estoque e atualiza o saldo do produto
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID da saída de estoque
 *     responses:
 *       200:
 *         description: Saída removida com sucesso
 *       404:
 *         description: Saída ou produto não encontrado
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.delete("/saida/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const saida = await prisma.saidaEstoque.findUnique({ where: { id } });
    if (!saida) return res.status(404).json({ error: "Saída não encontrada" });

    const produto = await prisma.produto.findUnique({ where: { id: saida.produtoId } });
    if (!produto) return res.status(404).json({ error: "Produto não encontrado" });

    const estoqueAtual = Number(produto.estoque) || 0;
    const quantidadeSaida = Number(saida.quantidade) || 0;
    const novoEstoque = String(estoqueAtual + quantidadeSaida);

    await prisma.produto.update({
      where: { id: produto.id },
      data: { estoque: novoEstoque }
    });

    await prisma.saidaEstoque.delete({ where: { id } });

    res.json({ ok: true });
  } catch (e) {
    console.error("ERRO AO DELETAR SAÍDA:", e);
    res.status(500).json({ error: "Erro ao deletar saída" });
  }
});

module.exports = router;
