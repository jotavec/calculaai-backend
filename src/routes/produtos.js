// src/routes/produtos.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");
const prisma = new PrismaClient();
const multer = require("multer");
const xml2js = require("xml2js");

// Configura upload em memória
const upload = multer({ storage: multer.memoryStorage() });

// ----- MAPA DE LABEL PARA VALUE DA UNIDADE -----
const unidadeLabelToValue = {
  "Unidade (un.)": "Unidade",
  "Pacote (pct.)": "Pacote",
  "Caixa": "Caixa",
  "Dúzia": "Dúzia",
  "Grama (g)": "Grama",
  "Quilograma (kg)": "Quilograma",
  "Miligrama (mg)": "Miligrama",
  "Micrograma (mcg)": "Micrograma",
  "Litro (l)": "Litro",
  "Mililitro (ml)": "Mililitro",
  "Metro (m)": "Metro",
  "Centímetro (cm)": "Centímetro",
  "Milímetro (mm)": "Milímetro",
};

// === MIDDLEWARE BLOQUEIO DE PLANO GRATUITO PARA MOVIMENTAÇÃO ===
async function bloqueiaMovimentacaoGratuito(req, res, next) {
  try {
    const userId = req.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const plano = user?.plano || "gratuito";
    if (plano === "gratuito") {
      return res.status(403).json({
        error: "Esta funcionalidade é exclusiva para assinantes. Faça upgrade do seu plano para movimentar estoque."
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Erro ao validar plano do usuário." });
  }
}

/**
 * @swagger
 * tags:
 *   - name: Produtos
 *     description: Endpoints para gestão de matérias-primas/produtos.
 */

// LISTAR TODOS
/**
 * @swagger
 * /produtos:
 *   get:
 *     tags: [Produtos]
 *     summary: Lista todos os produtos
 *     responses:
 *       200:
 *         description: Lista de produtos
 */
router.get("/", async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany();
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRIAR NOVO PRODUTO ***LIMITADO PELO PLANO***
/**
 * @swagger
 * /produtos:
 *   post:
 *     tags: [Produtos]
 *     summary: Cria um novo produto (limitado pelo plano do usuário)
 */
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.userId;
    // Limite pelo plano
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const plano = user?.plano || "gratuito";
    const count = await prisma.produto.count({ where: { userId } });

    let limite = Infinity;
    if (plano === "gratuito") limite = 30;

    if (count >= limite) {
      return res.status(403).json({ error: "Limite de matérias-primas atingido no seu plano. Faça upgrade para cadastrar mais!" });
    }

    let {
      codigo,
      codBarras,
      nome,
      categoria,
      marca,
      unidade,
      estoque,
      custoTotal,
      custo,
      ativo,
      totalEmbalagem,
      estoqueMinimo
    } = req.body;

    codigo = codigo ?? "";
    codBarras = codBarras ?? "";
    nome = nome ?? "";
    categoria = categoria ?? "";
    marca = marca ?? "";
    unidade = unidade ?? "";
    estoque = estoque === undefined || estoque === null ? "0" : String(estoque);
    custoTotal = custoTotal === undefined || custoTotal === null ? "0" : String(custoTotal);
    custo = custo === undefined || custo === null ? "0" : String(custo);
    ativo = Boolean(ativo);
    totalEmbalagem = totalEmbalagem === undefined || totalEmbalagem === null ? "" : String(totalEmbalagem);
    estoqueMinimo = estoqueMinimo === undefined || estoqueMinimo === null ? "" : String(estoqueMinimo);

    if (unidadeLabelToValue[unidade]) unidade = unidadeLabelToValue[unidade];

    let custoUnitario = "0";
    if (Number(custoTotal) > 0 && Number(totalEmbalagem) > 0) {
      custoUnitario = (Number(custoTotal) / Number(totalEmbalagem)).toFixed(4);
    }

    const produto = await prisma.produto.create({
      data: {
        codigo,
        codBarras,
        nome,
        categoria,
        marca,
        unidade,
        estoque,
        custoTotal,
        custoUnitario,
        custo,
        ativo,
        totalEmbalagem,
        estoqueMinimo,
        userId
      },
    });

    res.status(201).json(produto);
  } catch (err) {
    console.error("ERRO AO CRIAR PRODUTO:", err);
    res.status(500).json({ error: err.message });
  }
});

// IMPORTAR PRODUTOS EM LOTE
router.post("/importar", auth, async (req, res) => {
  try {
    const { produtos } = req.body;
    const userId = req.userId;

    if (!Array.isArray(produtos) || produtos.length === 0) {
      return res.status(400).json({ error: "Nenhum produto enviado" });
    }

    const obrigatorios = [
      "Código",
      "Nome*",
      "Categoria*",
      "Marca*",
      "Unidade*",
      "Estoque*",
      "Custo Total*",
      "Ativo*",
      "Total Embalagem*"
    ];

    function normaliza(str) {
      return String(str).replace("*", "").trim().toLowerCase();
    }
    function getCampo(obj, nome) {
      return (
        obj[nome] ??
        obj[nome.replace("*", "")] ??
        obj[nome.replace("*", "").trim()] ??
        obj[Object.keys(obj).find(k => normaliza(k) === normaliza(nome))]
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const plano = user?.plano || "gratuito";
    const count = await prisma.produto.count({ where: { userId } });
    let limite = Infinity;
    if (plano === "gratuito") limite = 30;

    if ((count + produtos.length) > limite) {
      return res.status(403).json({ error: "Limite de matérias-primas atingido no seu plano. Faça upgrade para cadastrar mais!" });
    }

    const erros = [];
    const cadastrados = [];

    for (let [idx, produto] of produtos.entries()) {
      let erroLinha = false;
      for (let campo of obrigatorios) {
        if (!getCampo(produto, campo)) {
          erros.push({
            linha: idx + 2,
            campo,
            erro: `Campo obrigatório "${campo}" não preenchido`
          });
          erroLinha = true;
        }
      }
      if (erroLinha) continue;

      const nomeMarca = getCampo(produto, "Marca*") || "";
      let marcaModal = await prisma.marca.findFirst({ where: { nome: nomeMarca, userId: String(userId) } });
      if (!marcaModal && nomeMarca) {
        marcaModal = await prisma.marca.create({ data: { nome: nomeMarca, userId: String(userId) } });
      }

      const nomeCategoria = getCampo(produto, "Categoria*") || "";
      let categoriaModal = await prisma.categoria.findFirst({ where: { nome: nomeCategoria, userId: String(userId) } });
      if (!categoriaModal && nomeCategoria) {
        categoriaModal = await prisma.categoria.create({ data: { nome: nomeCategoria, userId: String(userId) } });
      }

      let unidadeBruta = String(getCampo(produto, "Unidade*") ?? "");
      let unidade = unidadeLabelToValue[unidadeBruta] || unidadeBruta;

      let custoTotal = String(getCampo(produto, "Custo Total*") ?? "0");
      let totalEmbalagem = String(getCampo(produto, "Total Embalagem*") ?? "");
      let custoUnitario = "0";
      if (Number(custoTotal) > 0 && Number(totalEmbalagem) > 0) {
        custoUnitario = (Number(custoTotal) / Number(totalEmbalagem)).toFixed(4);
      }

      const dados = {
        codigo: String(getCampo(produto, "Código") ?? ""),
        codBarras: String(getCampo(produto, "Código de Barras") ?? ""),
        nome: String(getCampo(produto, "Nome*") ?? ""),
        categoria: String(nomeCategoria ?? ""),
        marca: String(nomeMarca ?? ""),
        unidade: unidade,
        estoque: String(getCampo(produto, "Estoque*") ?? "0"),
        custoTotal: custoTotal,
        custoUnitario: custoUnitario,
        custo: "0",
        ativo: String(getCampo(produto, "Ativo*") ?? "1") === "1" ||
          String(getCampo(produto, "Ativo*")).toLowerCase() === "sim",
        totalEmbalagem: totalEmbalagem,
        estoqueMinimo: String(getCampo(produto, "Estoque Mínimo") ?? ""),
        userId: String(userId)
      };

      try {
        const novoProduto = await prisma.produto.create({ data: dados });
        cadastrados.push(novoProduto);
      } catch (e) {
        erros.push({
          linha: idx + 2,
          erro: e.message
        });
      }
    }

    res.json({
      cadastrados: cadastrados.length,
      erros
    });

  } catch (err) {
    console.error("ERRO AO IMPORTAR PRODUTOS:", err);
    res.status(500).json({ error: err.message });
  }
});

// EDITAR PRODUTO
/**
 * @swagger
 * /produtos/{id}:
 *   put:
 *     tags: [Produtos]
 *     summary: Atualiza um produto pelo ID
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    if (dados.unidade && unidadeLabelToValue[dados.unidade]) {
      dados.unidade = unidadeLabelToValue[dados.unidade];
    }

    let custoTotal = dados.custoTotal === undefined || dados.custoTotal === null ? "0" : String(dados.custoTotal);
    let totalEmbalagem = dados.totalEmbalagem === undefined || dados.totalEmbalagem === null ? "0" : String(dados.totalEmbalagem);
    let custoUnitario = "0";
    if (Number(custoTotal) > 0 && Number(totalEmbalagem) > 0) {
      custoUnitario = (Number(custoTotal) / Number(totalEmbalagem)).toFixed(4);
    }
    dados.custoUnitario = custoUnitario;

    const dadosProduto = {
      ...dados,
      estoque: dados.estoque === undefined || dados.estoque === null ? "0" : String(dados.estoque),
      custoTotal: custoTotal,
      custoUnitario: custoUnitario,
      custo: dados.custo === undefined || dados.custo === null ? "0" : String(dados.custo),
      totalEmbalagem: totalEmbalagem,
      estoqueMinimo: dados.estoqueMinimo === undefined || dados.estoqueMinimo === null ? "" : String(dados.estoqueMinimo),
    };

    const produto = await prisma.produto.update({
      where: { id },
      data: dadosProduto,
    });

    res.json(produto);
  } catch (err) {
    console.error("ERRO AO ATUALIZAR PRODUTO:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETAR PRODUTO
/**
 * @swagger
 * /produtos/{id}:
 *   delete:
 *     tags: [Produtos]
 *     summary: Remove um produto pelo ID
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.produto.delete({
      where: { id },
    });
    res.status(204).end();
  } catch (err) {
    console.error("ERRO AO DELETAR PRODUTO:", err);
    res.status(500).json({ error: err.message });
  }
});

// ENTRADA DE ESTOQUE
router.post("/entrada-estoque", auth, bloqueiaMovimentacaoGratuito, async (req, res) => {
  try {
    const { produtoId, quantidade, lote, valor, data } = req.body;
    const userId = req.userId;

    if (!produtoId || !quantidade || quantidade <= 0) {
      return res.status(400).json({ error: "Produto e quantidade obrigatórios." });
    }

    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) return res.status(404).json({ error: "Produto não encontrado." });

    const estoqueAtual = Number(produto.estoque || 0);
    const novoEstoque = estoqueAtual + Number(quantidade);

    let dataEntradaFormatada = undefined;
    if (data) {
      if (typeof data === "string" && data.length >= 10) {
        dataEntradaFormatada = data.slice(0, 10);
      } else {
        const d = new Date(data);
        if (!isNaN(d)) {
          dataEntradaFormatada = d.toISOString().slice(0, 10);
        }
      }
    }

    const entrada = await prisma.entradaEstoque.create({
      data: {
        produtoId,
        quantidade: Number(quantidade),
        lote: lote || null,
        valor: valor ? Number(valor) : null,
        userId,
        data: dataEntradaFormatada
      }
    });

    await prisma.produto.update({
      where: { id: produtoId },
      data: {
        estoque: String(novoEstoque),
        ...(valor !== undefined && valor !== null
          ? { custoTotal: String(valor) }
          : {})
      }
    });

    res.status(201).json({ message: "Entrada registrada com sucesso.", entrada });
  } catch (err) {
    console.error("ERRO NA ENTRADA DE ESTOQUE:", err);
    res.status(500).json({ error: err.message });
  }
});

// SAÍDA DE ESTOQUE
router.post("/saida-estoque", auth, bloqueiaMovimentacaoGratuito, async (req, res) => {
  try {
    const { produtoId, quantidade } = req.body;
    const userId = req.userId;

    if (!produtoId || !quantidade || quantidade <= 0) {
      return res.status(400).json({ error: "Produto e quantidade obrigatórios." });
    }

    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) return res.status(404).json({ error: "Produto não encontrado" });

    const estoqueAtual = Number(produto.estoque || 0);
    if (estoqueAtual < Number(quantidade)) {
      return res.status(400).json({ error: "Estoque insuficiente" });
    }

    const novoEstoque = estoqueAtual - Number(quantidade);
    await prisma.produto.update({
      where: { id: produtoId },
      data: { estoque: String(novoEstoque) }
    });

    await prisma.saidaEstoque.create({
      data: {
        produtoId,
        quantidade: Number(quantidade),
        userId,
        data: new Date()
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("ERRO NA SAÍDA DE ESTOQUE:", err);
    return res.status(500).json({ error: "Erro interno ao registrar saída" });
  }
});

// HISTÓRICO DE ENTRADAS DE UM PRODUTO
router.get('/:id/entradas', async (req, res) => {
  const { id } = req.params;
  try {
    const entradas = await prisma.entradaEstoque.findMany({
      where: { produtoId: id },
      include: { user: { select: { name: true } } },
      orderBy: { data: 'desc' }
    });
    res.json(entradas);
  } catch (e) {
    console.error("ERRO AO BUSCAR ENTRADAS:", e); 
    res.status(500).json({ erro: "Erro ao buscar entradas do produto.", detalhes: e.message });
  }
});

// IMPORTAR XML DA NFE
router.post("/importar-xml-nfe", auth, bloqueiaMovimentacaoGratuito, upload.single("xml"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Arquivo XML não enviado" });
    }

    const xmlStr = req.file.buffer.toString("utf-8");
    const parser = new xml2js.Parser({ explicitArray: false });

    parser.parseString(xmlStr, async (err, result) => {
      if (err || !result) {
        return res.status(400).json({ error: "Falha ao ler o XML" });
      }

      let itens = [];
      try {
        const dets = result.nfeProc
          ? result.nfeProc.NFe.infNFe.det
          : result.NFe.infNFe.det;
        itens = Array.isArray(dets) ? dets : [dets];
      } catch (e) {
        return res.status(400).json({ error: "Produtos não encontrados no XML" });
      }

      const userId = req.userId;
      let produtosCriados = [];
      let erros = [];

      for (let item of itens) {
        try {
          const prod = item.prod;
          const nome = prod.xProd;
          const codBarras = prod.cEAN || "";
          const quantidade = Number(prod.qCom || 1);
          const valorUnitario = Number(prod.vUnCom || 0);
          const valorTotal = Number(prod.vProd || valorUnitario * quantidade);

          if (!nome) continue;

          let produtoExistente = await prisma.produto.findFirst({
            where: {
              OR: [
                { nome: nome },
                codBarras ? { codBarras } : undefined
              ].filter(Boolean)
            }
          });

          if (produtoExistente) {
            await prisma.produto.update({
              where: { id: produtoExistente.id },
              data: {
                estoque: String(Number(produtoExistente.estoque || 0) + quantidade),
                custoTotal: String(valorTotal)
              }
            });
            produtosCriados.push({ nome, atualizado: true });
          } else {
            await prisma.produto.create({
              data: {
                nome,
                codBarras,
                estoque: String(quantidade),
                custoTotal: String(valorTotal),
                categoria: "",
                marca: "",
                unidade: "Unidade",
                codigo: "",
                ativo: true,
                totalEmbalagem: "",
                estoqueMinimo: "",
                userId: userId
              }
            });
            produtosCriados.push({ nome, criado: true });
          }
        } catch (e) {
          erros.push(e.message);
        }
      }

      res.json({
        mensagem: "Importação finalizada",
        produtosCriados,
        erros
      });
    });

  } catch (e) {
    console.error("ERRO AO IMPORTAR XML:", e);
    res.status(500).json({ error: "Erro ao processar XML" });
  }
});

module.exports = router;
