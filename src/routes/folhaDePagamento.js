// src/routes/folhaDePagamento.js

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

// Modelo: Funcionario
// model Funcionario {
//   id         String   @id @default(uuid())
//   nome       String
//   cargo      String
//   tipoMaoDeObra String
//   salario    String
//   totalHorasMes String
//   fgts       String
//   inss       String
//   rat        String
//   ferias13   String
//   valeTransporte String
//   valeAlimentacao String
//   valeRefeicao String
//   planoSaude String
//   outros     String
//   fgtsValor  String
//   inssValor  String
//   ratValor   String
//   ferias13Valor String
//   valeTransporteValor String
//   valeAlimentacaoValor String
//   valeRefeicaoValor String
//   planoSaudeValor String
//   outrosValor String
//   userId     String
//   createdAt  DateTime @default(now())
//   updatedAt  DateTime @updatedAt
// }

// ========== ROTAS PADRÃO ==========

// Listar todos os funcionários
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

// Adicionar funcionário
router.post('/', auth, async (req, res) => {
  const userId = req.userId;
  console.log("BODY FUNCIONARIO:", req.body); // <-- AQUI!
  try {
    const funcionario = await prisma.funcionario.create({
      data: { ...req.body, userId }
    });
    res.status(201).json(funcionario);
  } catch (err) {
    console.log("ERRO AO SALVAR FUNCIONARIO:", err); // <-- Aqui também!
    res.status(500).json({ error: err.message });
  }
});


// Editar funcionário
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

// Deletar funcionário
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

// ========== ROTA NOVA PARA CARGOS DE MÃO DE OBRA DIRETA ==========

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
    // Só cargos únicos
    const cargosUnicos = [...new Set(funcionariosDiretos.map(f => f.cargo))];
    res.json(cargosUnicos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
