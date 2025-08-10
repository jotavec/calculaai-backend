const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const auth = require("../middleware/auth"); // IMPORTANTE: Middleware de autenticação

// Middleware para bloquear acesso de planos gratuitos
async function bloqueiaGratuito(req, res, next) {
  try {
    // Busca userId pelo middleware de auth
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

// Todas as rotas exigem login e bloqueiam plano gratuito
router.use(auth, bloqueiaGratuito);

// Retorna todas as movimentações (entrada + saída)
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

// =============== DELETAR ENTRADA DE ESTOQUE ================
router.delete("/entrada/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const entrada = await prisma.entradaEstoque.findUnique({ where: { id } });
    if (!entrada) return res.status(404).json({ error: "Entrada não encontrada" });

    // Busca o produto e calcula o novo estoque (STRING!)
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

// =============== DELETAR SAÍDA DE ESTOQUE ================
router.delete("/saida/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const saida = await prisma.saidaEstoque.findUnique({ where: { id } });
    if (!saida) return res.status(404).json({ error: "Saída não encontrada" });

    // Busca o produto e calcula o novo estoque (STRING!)
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
