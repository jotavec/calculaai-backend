const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');

// Função utilitária para garantir string numérica (nunca vazia)
function safeNumString(val) {
  if (val === undefined || val === null || val === "") return "0";
  return String(Number(val));
}

// Criar um novo bloco (agora limitado por plano)
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.userId;

    // ===== Limitação por plano =====
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const plano = user?.plano || "gratuito";
    const count = await prisma.bloco.count({ where: { userId } });

    let limite = Infinity;
    if (plano === "gratuito") limite = 1;
    if (plano === "padrao") limite = 3;
    if (plano === "premium") limite = Infinity;

    if (count >= limite) {
      return res.status(403).json({ error: "Limite de blocos de markup atingido no seu plano. Faça upgrade para cadastrar mais!" });
    }

    const {
      nome,
      markup,
      markupIdeal,
      gastosFaturamento,
      impostos,
      taxasPagamento,
      comissoes,
      outros,
      lucroDesejado,
      mediaFaturamento,
      custosAtivos,
      observacoes,
      totalEncargosReais // <-- NOVO!
    } = req.body;

    // ===== LOGA TUDO, ORGANIZADO =====
    console.log('\n========== [API][POST /api/markup-ideal] DADOS RECEBIDOS ==========');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('===================================================================');

    const bloco = await prisma.bloco.create({
      data: {
        nome,
        markup,
        markupIdeal,
        gastosFaturamento: safeNumString(gastosFaturamento),
        impostos: safeNumString(impostos),
        taxasPagamento: safeNumString(taxasPagamento),
        comissoes: safeNumString(comissoes),
        outros: safeNumString(outros),
        lucroDesejado: safeNumString(lucroDesejado),
        mediaFaturamento: mediaFaturamento !== undefined ? String(mediaFaturamento) : "",
        custosAtivos: custosAtivos ? JSON.stringify(custosAtivos) : "{}",
        observacoes: observacoes || "",
        totalEncargosReais: totalEncargosReais !== undefined ? Number(totalEncargosReais) : 0, // esse já pode ser número
        userId
      }
    });

    // === ESPIÃO: O que foi salvo no banco ===
    console.log('[API][POST /api/markup-ideal] Bloco salvo no banco:', bloco);

    res.status(201).json(bloco);
  } catch (error) {
    console.error('[API][POST /api/markup-ideal] ERRO AO CRIAR BLOCO:', error);
    res.status(500).json({ error: 'Erro ao criar bloco', details: error.message });
  }
});

// Listar todos os blocos do usuário logado (com espião)
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const blocos = await prisma.bloco.findMany({ where: { userId } });
    console.log('\n[API][GET /api/markup-ideal] Listando blocos do user:', userId, blocos.length, 'encontrados');

    // ============ CONSOLE ADICIONADO =============
    console.log('\n[API][GET /api/markup-ideal] Blocos retornados:');
    blocos.forEach(b => {
      console.log(`[${b.nome}] totalEncargosReais:`, b.totalEncargosReais);
    });
    // =============================================

    res.json(blocos);
  } catch (error) {
    console.error('[API][GET /api/markup-ideal] ERRO:', error);
    res.status(500).json({ error: 'Erro ao buscar blocos', details: error.message });
  }
});

// Atualizar o markup do bloco (por ID, com log detalhado!)
router.put('/:id', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const {
      nome,
      markup,
      markupIdeal,
      gastosFaturamento,
      impostos,
      taxasPagamento,
      comissoes,
      outros,
      lucroDesejado,
      mediaFaturamento,
      custosAtivos,
      observacoes,
      totalEncargosReais // <-- NOVO!
    } = req.body;

    // ===== LOGA TUDO, ORGANIZADO =====
    console.log('\n========== [API][PUT /api/markup-ideal/:id] DADOS RECEBIDOS ==========');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('=======================================================================');

    // Garante que o bloco é do usuário logado
    const bloco = await prisma.bloco.findUnique({ where: { id: Number(id) } });
    if (!bloco || bloco.userId !== userId) {
      console.warn('[API][PUT /api/markup-ideal/:id] Acesso negado ou bloco não encontrado:', id);
      return res.status(403).json({ error: "Acesso negado ou bloco não encontrado" });
    }

    // Atualiza todos os campos!
    const blocoAtualizado = await prisma.bloco.update({
      where: { id: Number(id) },
      data: {
        nome: nome !== undefined ? nome : bloco.nome,
        markup: markup !== undefined ? markup : bloco.markup,
        markupIdeal: markupIdeal !== undefined ? markupIdeal : bloco.markupIdeal,
        gastosFaturamento: gastosFaturamento !== undefined ? safeNumString(gastosFaturamento) : bloco.gastosFaturamento,
        impostos: impostos !== undefined ? safeNumString(impostos) : bloco.impostos,
        taxasPagamento: taxasPagamento !== undefined ? safeNumString(taxasPagamento) : bloco.taxasPagamento,
        comissoes: comissoes !== undefined ? safeNumString(comissoes) : bloco.comissoes,
        outros: outros !== undefined ? safeNumString(outros) : bloco.outros,
        lucroDesejado: lucroDesejado !== undefined ? safeNumString(lucroDesejado) : bloco.lucroDesejado,
        mediaFaturamento: mediaFaturamento !== undefined ? String(mediaFaturamento) : bloco.mediaFaturamento,
        custosAtivos: custosAtivos !== undefined ? JSON.stringify(custosAtivos) : bloco.custosAtivos,
        observacoes: observacoes !== undefined ? observacoes : bloco.observacoes,
        totalEncargosReais: totalEncargosReais !== undefined ? Number(totalEncargosReais) : bloco.totalEncargosReais
      },
    });
    // ESPIÃO: O que ficou no banco
    console.log('[API][PUT /api/markup-ideal/:id] Bloco atualizado:', blocoAtualizado);

    res.json(blocoAtualizado);
  } catch (error) {
    console.error('[API][PUT /api/markup-ideal/:id] ERRO:', error);
    res.status(500).json({ error: 'Erro ao atualizar bloco', details: error.message });
  }
});

// Deletar um bloco (apenas se for do usuário)
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const bloco = await prisma.bloco.findUnique({ where: { id: Number(id) } });
    if (!bloco || bloco.userId !== userId) {
      console.warn('[API][DELETE /api/markup-ideal/:id] Acesso negado ou bloco não encontrado:', id);
      return res.status(403).json({ error: "Acesso negado ou bloco não encontrado" });
    }

    // ESPIÃO: Deletando bloco e seus ativos
    console.log('[API][DELETE /api/markup-ideal/:id] Deletando bloco e ativos:', id);

    // PRIMEIRO: Deleta todos os BlocoAtivos ligados ao bloco
    await prisma.blocoAtivos.deleteMany({ where: { blocoId: Number(id) } });

    // AGORA sim deleta o bloco
    await prisma.bloco.delete({ where: { id: Number(id) } });

    console.log('[API][DELETE /api/markup-ideal/:id] Bloco deletado com sucesso:', id);
    res.status(204).send();
  } catch (error) {
    console.error('[API][DELETE /api/markup-ideal/:id] ERRO:', error);
    res.status(500).json({ error: 'Erro ao deletar bloco', details: error.message });
  }
});

module.exports = router;
