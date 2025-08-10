const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Função para salvar imagem base64 (igual perfil)
function salvarImagemBase64(base64, prefixo = "receita") {
  if (!base64 || typeof base64 !== "string" || !base64.startsWith("data:image")) return null;
  const matches = base64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;
  const ext = matches[1].toLowerCase();
  const buffer = Buffer.from(matches[2], "base64");
  const nome = `${prefixo}_${Date.now()}.${ext}`;
  const dir = path.join(__dirname, "../../uploads/receitas");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, nome);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/receitas/${nome}`;
}

function normalizeBlocoAtivo(valor) {
  if (valor === undefined || valor === null || valor === "") return "subreceita";
  if (typeof valor === "number") return String(valor);
  return String(valor);
}

// =========================
// LISTAR TODAS AS RECEITAS DO USUÁRIO (SEM INCLUDE!)
// =========================
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const receitas = await prisma.recipe.findMany({
      where: { userId }
    });
    const normalizadas = receitas.map(r => ({
      ...r,
      blocoMarkupAtivo: r.blocoMarkupAtivo ? String(r.blocoMarkupAtivo) : "subreceita"
    }));
    res.json(normalizadas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =========================
// CRIAR NOVA RECEITA (agora com LIMITAÇÃO DE PLANO!)
// =========================
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.userId;

    // ====== VERIFICA LIMITE PELO PLANO ======
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const plano = user?.plano || "gratuito";
    const count = await prisma.recipe.count({ where: { userId } });

    let limite = Infinity;
    if (plano === "gratuito") limite = 5;
    if (plano === "padrao") limite = 60;
    if (plano === "premium") limite = Infinity;

    if (count >= limite) {
      return res.status(403).json({ error: "Limite de receitas atingido no seu plano. Faça upgrade para cadastrar mais!" });
    }

    // ==== CONTINUA CADASTRO NORMAL ====
    let {
      nome,
      rendimentoNumero,
      rendimentoUnidade,
      observacoes,
      ingredientes,
      embalagens,
      subReceitas,
      maoDeObra,
      imagemFinal,
      conservacaoData,
      passosPreparo,
      tipoSelecionado,
      dataUltimaAtualizacao,
      tempoTotal,
      tempoUnidade,
      precoVenda,
      pesoUnitario,
      descontoReais,
      descontoPercentual,
      blocoMarkupAtivo
    } = req.body;

    // Salva imagem base64 se veio
    if (imagemFinal && typeof imagemFinal === "string" && imagemFinal.startsWith("data:image")) {
      imagemFinal = salvarImagemBase64(imagemFinal, `receita_${userId}`);
    }

    const receita = await prisma.recipe.create({
      data: {
        userId,
        name: nome,
        yieldQty: Number(rendimentoNumero || 0),
        yieldUnit: rendimentoUnidade,
        notes: observacoes || '',
        ingredientes: ingredientes ? ingredientes : [],
        embalagens: embalagens ? embalagens : [],
        subReceitas: subReceitas ? subReceitas : [],
        maoDeObra: maoDeObra ? maoDeObra : [],
        imagemFinal: imagemFinal || null,
        conservacaoData: conservacaoData || null,
        passosPreparo: passosPreparo || null,
        tipoSelecionado: tipoSelecionado || null,
        dataUltimaAtualizacao: dataUltimaAtualizacao || null,
        tempoTotal: tempoTotal || "",
        tempoUnidade: tempoUnidade || "minutos",
        precoVenda: precoVenda || null,
        pesoUnitario: pesoUnitario || null,
        descontoReais: descontoReais || null,
        descontoPercentual: descontoPercentual || null,
        blocoMarkupAtivo: normalizeBlocoAtivo(blocoMarkupAtivo),
      }
    });

    res.status(201).json({
      ...receita,
      blocoMarkupAtivo: receita.blocoMarkupAtivo ? String(receita.blocoMarkupAtivo) : "subreceita"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =========================
// ATUALIZAR RECEITA
// =========================
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    let {
      nome,
      rendimentoNumero,
      rendimentoUnidade,
      observacoes,
      ingredientes,
      embalagens,
      subReceitas,
      maoDeObra,
      imagemFinal,
      conservacaoData,
      passosPreparo,
      tipoSelecionado,
      dataUltimaAtualizacao,
      tempoTotal,
      tempoUnidade,
      precoVenda,
      pesoUnitario,
      descontoReais,
      descontoPercentual,
      blocoMarkupAtivo
    } = req.body;

    // Salva imagem base64 se veio
    if (imagemFinal && typeof imagemFinal === "string" && imagemFinal.startsWith("data:image")) {
      imagemFinal = salvarImagemBase64(imagemFinal, `receita_${userId}`);
    }

    const receita = await prisma.recipe.update({
      where: { id, userId },
      data: {
        name: nome,
        yieldQty: Number(rendimentoNumero || 0),
        yieldUnit: rendimentoUnidade,
        notes: observacoes || '',
        ingredientes: ingredientes ? ingredientes : [],
        embalagens: embalagens ? embalagens : [],
        subReceitas: subReceitas ? subReceitas : [],
        maoDeObra: maoDeObra ? maoDeObra : [],
        imagemFinal: imagemFinal || null,
        conservacaoData: conservacaoData || null,
        passosPreparo: passosPreparo || null,
        tipoSelecionado: tipoSelecionado || null,
        dataUltimaAtualizacao: dataUltimaAtualizacao || null,
        tempoTotal: tempoTotal || "",
        tempoUnidade: tempoUnidade || "minutos",
        precoVenda: precoVenda || null,
        pesoUnitario: pesoUnitario || null,
        descontoReais: descontoReais || null,
        descontoPercentual: descontoPercentual || null,
        blocoMarkupAtivo: normalizeBlocoAtivo(blocoMarkupAtivo),
      }
    });

    res.json({
      ...receita,
      blocoMarkupAtivo: receita.blocoMarkupAtivo ? String(receita.blocoMarkupAtivo) : "subreceita"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =========================
// DELETAR RECEITA
// =========================
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    await prisma.recipe.delete({
      where: { id, userId }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// =========================
// ROTAS DE TIPO DE PRODUTO (NO MESMO ARQUIVO, PRA TESTE)
// =========================

router.get('/tipos-produto', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const tipos = await prisma.tipoProduto.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(tipos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/tipos-produto', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { nome } = req.body;
    if (!nome || typeof nome !== "string" || !nome.trim()) {
      return res.status(400).json({ error: "Nome do tipo de produto é obrigatório." });
    }
    const novo = await prisma.tipoProduto.create({
      data: {
        nome: nome.trim(),
        userId,
      }
    });
    res.status(201).json(novo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/tipos-produto/:id', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    await prisma.tipoProduto.delete({
      where: { id, userId }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
