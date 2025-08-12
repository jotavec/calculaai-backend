// src/routes/fornecedores.js — COMPLETO (com Swagger)
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

/**
 * Middleware para bloquear acesso de planos gratuitos
 */
async function bloqueiaGratuito(req, res, next) {
  try {
    const userId = req.userId;
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

/**
 * @swagger
 * tags:
 *   - name: Fornecedores
 *     description: CRUD de fornecedores (restrito a assinantes)
 *
 * components:
 *   schemas:
 *     Fornecedor:
 *       type: object
 *       properties:
 *         id:            { type: integer, example: 1 }
 *         razaoSocial:   { type: string, example: "Padaria Pão Quente Ltda" }
 *         cnpjCpf:       { type: string, example: "12.345.678/0001-99" }
 *         nomeVendedor:  { type: string, example: "Carlos Souza" }
 *         telefone:      { type: string, example: "(11) 99999-9999" }
 *         email:         { type: string, example: "contato@paonquente.com" }
 *         endereco:      { type: string, example: "Rua das Flores, 123 - São Paulo/SP" }
 *         observacoes:   { type: string, example: "Entrega em até 48h" }
 *         createdAt:     { type: string, format: date-time }
 *         updatedAt:     { type: string, format: date-time }
 *
 *     FornecedorCreate:
 *       type: object
 *       required: [razaoSocial, cnpjCpf, telefone]
 *       properties:
 *         razaoSocial:   { type: string }
 *         cnpjCpf:       { type: string }
 *         nomeVendedor:  { type: string }
 *         telefone:      { type: string }
 *         email:         { type: string }
 *         endereco:      { type: string }
 *         observacoes:   { type: string }
 *
 *     FornecedorUpdate:
 *       allOf:
 *         - $ref: '#/components/schemas/FornecedorCreate'
 */

module.exports = (prisma) => {
  router.use((req, res, next) => {
    req.prismaGlobal = prisma;
    next();
  });

  router.use(auth, bloqueiaGratuito);

  /**
   * @swagger
   * /fornecedores:
   *   get:
   *     tags: [Fornecedores]
   *     summary: Lista todos os fornecedores (restrito a assinantes)
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Lista de fornecedores
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/Fornecedor' }
   *       401:
   *         description: Não autorizado
   *       403:
   *         description: Plano gratuito não permite acesso
   */
  router.get("/", async (req, res) => {
    const lista = await prisma.fornecedor.findMany({ orderBy: { createdAt: "desc" } });
    res.json(lista);
  });

  /**
   * @swagger
   * /fornecedores:
   *   post:
   *     tags: [Fornecedores]
   *     summary: Cria um novo fornecedor
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/FornecedorCreate' }
   *     responses:
   *       201:
   *         description: Fornecedor criado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Fornecedor' }
   */
  router.post("/", async (req, res) => {
    const { razaoSocial, cnpjCpf, nomeVendedor, telefone, email, endereco, observacoes } = req.body;
    if (!razaoSocial || !cnpjCpf || !telefone)
      return res.status(400).json({ error: "Campos obrigatórios faltando." });

    const novo = await prisma.fornecedor.create({
      data: { razaoSocial, cnpjCpf, nomeVendedor, telefone, email, endereco, observacoes }
    });
    res.status(201).json(novo);
  });

  /**
   * @swagger
   * /fornecedores/{id}:
   *   put:
   *     tags: [Fornecedores]
   *     summary: Atualiza um fornecedor pelo ID
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/FornecedorUpdate' }
   *     responses:
   *       200:
   *         description: Fornecedor atualizado
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Fornecedor' }
   */
  router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { razaoSocial, cnpjCpf, nomeVendedor, telefone, email, endereco, observacoes } = req.body;
    const atualizado = await prisma.fornecedor.update({
      where: { id },
      data: { razaoSocial, cnpjCpf, nomeVendedor, telefone, email, endereco, observacoes }
    });
    res.json(atualizado);
  });

  /**
   * @swagger
   * /fornecedores/{id}:
   *   delete:
   *     tags: [Fornecedores]
   *     summary: Remove um fornecedor pelo ID
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       204:
   *         description: Removido com sucesso (sem conteúdo)
   */
  router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    await prisma.fornecedor.delete({ where: { id } });
    res.status(204).end();
  });

  return router;
};
