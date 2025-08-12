// src/routes/folhaDePagamento.js — COMPLETO (com Swagger)
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

/**
 * Importante sobre caminhos no Swagger
 * Este router é montado em app.js como:
 *   app.use('/api/folhapagamento/funcionarios', folhaDePagamentoRoutes);
 * Portanto, os paths no Swagger começam com /folhapagamento/funcionarios
 */

/**
 * @swagger
 * tags:
 *   - name: FolhaDePagamento
 *     description: CRUD de funcionários e utilidades de mão de obra
 *
 * components:
 *   schemas:
 *     Funcionario:
 *       type: object
 *       properties:
 *         id:                { type: string, format: uuid, example: "c2b3f2ac-9f7a-4e7c-9e8a-1f2e3d4c5b6a" }
 *         nome:              { type: string, example: "João da Silva" }
 *         cargo:             { type: string, example: "Padeiro" }
 *         tipoMaoDeObra:     { type: string, example: "Direta" }
 *         salario:           { type: string, example: "2500" }
 *         totalHorasMes:     { type: string, example: "220" }
 *         horasPorDia:       { type: string, nullable: true, example: "8" }
 *         diasPorSemana:     { type: string, nullable: true, example: "5" }
 *         fgts:              { type: string, example: "8" }
 *         inss:              { type: string, example: "7.5" }
 *         rat:               { type: string, example: "1" }
 *         ferias13:          { type: string, example: "1/12" }
 *         valeTransporte:    { type: string, example: "6" }
 *         valeAlimentacao:   { type: string, example: "400" }
 *         valeRefeicao:      { type: string, example: "0" }
 *         planoSaude:        { type: string, example: "200" }
 *         outros:            { type: string, example: "0" }
 *         fgtsValor:         { type: string, example: "200" }
 *         inssValor:         { type: string, example: "180" }
 *         ratValor:          { type: string, example: "25" }
 *         ferias13Valor:     { type: string, example: "210" }
 *         valeTransporteValor:{ type: string, example: "150" }
 *         valeAlimentacaoValor:{ type: string, example: "400" }
 *         valeRefeicaoValor: { type: string, example: "0" }
 *         planoSaudeValor:   { type: string, example: "200" }
 *         outrosValor:       { type: string, example: "0" }
 *         userId:            { type: string, format: uuid }
 *         createdAt:         { type: string, format: date-time }
 *         updatedAt:         { type: string, format: date-time }
 *
 *     FuncionarioCreate:
 *       type: object
 *       required: [nome, cargo, tipoMaoDeObra, salario, totalHorasMes, fgts, inss, rat, ferias13, valeTransporte, valeAlimentacao, valeRefeicao, planoSaude, outros, fgtsValor, inssValor, ratValor, ferias13Valor, valeTransporteValor, valeAlimentacaoValor, valeRefeicaoValor, planoSaudeValor, outrosValor]
 *       properties:
 *         nome:              { type: string }
 *         cargo:             { type: string }
 *         tipoMaoDeObra:     { type: string, description: "Direta ou Indireta" }
 *         salario:           { type: string }
 *         totalHorasMes:     { type: string }
 *         horasPorDia:       { type: string, nullable: true }
 *         diasPorSemana:     { type: string, nullable: true }
 *         fgts:              { type: string }
 *         inss:              { type: string }
 *         rat:               { type: string }
 *         ferias13:          { type: string }
 *         valeTransporte:    { type: string }
 *         valeAlimentacao:   { type: string }
 *         valeRefeicao:      { type: string }
 *         planoSaude:        { type: string }
 *         outros:            { type: string }
 *         fgtsValor:         { type: string }
 *         inssValor:         { type: string }
 *         ratValor:          { type: string }
 *         ferias13Valor:     { type: string }
 *         valeTransporteValor:{ type: string }
 *         valeAlimentacaoValor:{ type: string }
 *         valeRefeicaoValor: { type: string }
 *         planoSaudeValor:   { type: string }
 *         outrosValor:       { type: string }
 *
 *     FuncionarioUpdate:
 *       allOf:
 *         - $ref: '#/components/schemas/FuncionarioCreate'
 *
 *     CargosDiretosResponse:
 *       type: array
 *       description: Lista de cargos únicos dos funcionários com tipoMaoDeObra = 'Direta'
 *       items:
 *         type: string
 *         example: "Padeiro"
 */

// ========== LISTAR FUNCIONÁRIOS ==========
/**
 * @swagger
 * /folhapagamento/funcionarios:
 *   get:
 *     tags: [FolhaDePagamento]
 *     summary: Lista todos os funcionários do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de funcionários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Funcionario' }
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.get('/', auth, async (req, res) => {
  const userId = req.userId;
  try {
    const funcionarios = await prisma.funcionario.findMany({
      where: { userId },
      orderBy: { nome: 'asc' }
    });
    res.json(funcionarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CRIAR FUNCIONÁRIO ==========
/**
 * @swagger
 * /folhapagamento/funcionarios:
 *   post:
 *     tags: [FolhaDePagamento]
 *     summary: Cria um novo funcionário para o usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/FuncionarioCreate' }
 *     responses:
 *       201:
 *         description: Funcionário criado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Funcionario' }
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.post('/', auth, async (req, res) => {
  const userId = req.userId;
  console.log("BODY FUNCIONARIO:", req.body);
  try {
    const funcionario = await prisma.funcionario.create({
      data: { ...req.body, userId }
    });
    res.status(201).json(funcionario);
  } catch (err) {
    console.log("ERRO AO SALVAR FUNCIONARIO:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========== ATUALIZAR FUNCIONÁRIO ==========
/**
 * @swagger
 * /folhapagamento/funcionarios/{id}:
 *   put:
 *     tags: [FolhaDePagamento]
 *     summary: Atualiza um funcionário por ID (somente se pertencer ao usuário)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/FuncionarioUpdate' }
 *     responses:
 *       200:
 *         description: Funcionário atualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Funcionario' }
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Não encontrado ou acesso negado
 *       500:
 *         description: Erro interno
 */
router.put('/:id', auth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  try {
    const funcionario = await prisma.funcionario.findUnique({ where: { id } });
    if (!funcionario || funcionario.userId !== userId) {
      return res.status(404).json({ error: "Funcionário não encontrado ou acesso negado" });
    }
    const atualizado = await prisma.funcionario.update({
      where: { id },
      data: { ...req.body, userId }
    });
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DELETAR FUNCIONÁRIO ==========
/**
 * @swagger
 * /folhapagamento/funcionarios/{id}:
 *   delete:
 *     tags: [FolhaDePagamento]
 *     summary: Remove um funcionário por ID (somente se pertencer ao usuário)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Removido com sucesso (sem conteúdo)
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Não encontrado ou acesso negado
 *       500:
 *         description: Erro interno
 */
router.delete('/:id', auth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  try {
    const funcionario = await prisma.funcionario.findUnique({ where: { id } });
    if (!funcionario || funcionario.userId !== userId) {
      return res.status(404).json({ error: "Funcionário não encontrado ou acesso negado" });
    }
    await prisma.funcionario.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CARGOS DE MÃO DE OBRA DIRETA ==========
/**
 * @swagger
 * /folhapagamento/funcionarios/profissoes-diretas:
 *   get:
 *     tags: [FolhaDePagamento]
 *     summary: Retorna cargos únicos dos funcionários com tipoMaoDeObra = 'Direta'
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de cargos únicos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CargosDiretosResponse'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.get('/profissoes-diretas', auth, async (req, res) => {
  const userId = req.userId;
  try {
    const funcionariosDiretos = await prisma.funcionario.findMany({
      where: {
        userId,
        tipoMaoDeObra: 'Direta'
      },
      select: {
        cargo: true
      }
    });
    const cargosUnicos = [...new Set(funcionariosDiretos.map(f => f.cargo))];
    res.json(cargosUnicos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
