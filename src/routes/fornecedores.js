const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // Adiciona autenticação

// Middleware para bloquear acesso de planos gratuitos
async function bloqueiaGratuito(req, res, next) {
  try {
    // UserId vem do middleware de auth
    const userId = req.userId;
    // Precisa do prisma na closure
    const prisma = req.prismaGlobal;
    if (!prisma) return res.status(500).json({ error: "Erro interno: Prisma não disponível" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const plano = user?.plano || "gratuito";

    if (plano === "gratuito") {
      return res.status(403).json({ error: "Funcionalidade disponível apenas para assinantes. Faça upgrade de plano para acessar fornecedores." });
    }
    next();
  } catch (err) {
    console.error("Erro no bloqueio de plano:", err);
    res.status(500).json({ error: "Erro interno no bloqueio de plano" });
  }
}

module.exports = (prisma) => {
  // Disponibiliza o prisma em req pra todos os middlewares
  router.use((req, res, next) => {
    req.prismaGlobal = prisma;
    next();
  });

  // Todas as rotas precisam estar autenticadas e bloqueiam plano gratuito
  router.use(auth, bloqueiaGratuito);

  // Listar todos os fornecedores
  router.get("/", async (req, res) => {
    const lista = await prisma.fornecedor.findMany({ orderBy: { createdAt: "desc" } });
    res.json(lista);
  });

  // Criar fornecedor
  router.post("/", async (req, res) => {
    const { razaoSocial, cnpjCpf, nomeVendedor, telefone, email, endereco, observacoes } = req.body;
    if (!razaoSocial || !cnpjCpf || !telefone)
      return res.status(400).json({ error: "Campos obrigatórios faltando." });

    const novo = await prisma.fornecedor.create({
      data: { razaoSocial, cnpjCpf, nomeVendedor, telefone, email, endereco, observacoes }
    });
    res.status(201).json(novo);
  });

  // Atualizar fornecedor
  router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { razaoSocial, cnpjCpf, nomeVendedor, telefone, email, endereco, observacoes } = req.body;
    const atualizado = await prisma.fornecedor.update({
      where: { id },
      data: { razaoSocial, cnpjCpf, nomeVendedor, telefone, email, endereco, observacoes }
    });
    res.json(atualizado);
  });

  // Deletar fornecedor
  router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    await prisma.fornecedor.delete({ where: { id } });
    res.status(204).end();
  });

  return router;
};
