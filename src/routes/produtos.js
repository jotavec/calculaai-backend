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

// LISTAR TODOS
router.get("/", async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany();
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRIAR NOVO PRODUTO ***LIMITADO PELO PLANO***
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.userId;
    // Limite pelo plano
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const plano = user?.plano || "gratuito";
    const count = await prisma.produto.count({ where: { userId } });

    let limite = Infinity;
    if (plano === "gratuito") limite = 30;
    if (plano === "padrao") limite = Infinity;
    if (plano === "premium") limite = Infinity;

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

    // --- AJUSTE PARA UNIDADE: sempre salva o value! ---
    if (unidadeLabelToValue[unidade]) unidade = unidadeLabelToValue[unidade];

    // ---- CALCULA O CUSTO UNITÁRIO ----
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
        userId // garante vínculo
      },
    });

    res.status(201).json(produto);
  } catch (err) {
    console.error("ERRO AO CRIAR PRODUTO:", err);
    res.status(500).json({ error: err.message });
  }
});

// IMPORTAR PRODUTOS EM LOTE (PLANILHA) ***TAMBÉM LIMITA PLANO***
router.post("/importar", auth, async (req, res) => {
  try {
    const { produtos } = req.body;
    const userId = req.userId;

    if (!Array.isArray(produtos) || produtos.length === 0) {
      return res.status(400).json({ error: "Nenhum produto enviado" });
    }

    // CAMPOS OBRIGATÓRIOS (igual à planilha)
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

    // === Limitação para importação também ===
    // Conta quantos produtos já existem
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const plano = user?.plano || "gratuito";
    const count = await prisma.produto.count({ where: { userId } });
    let limite = Infinity;
    if (plano === "gratuito") limite = 30;
    if (plano === "padrao") limite = Infinity;
    if (plano === "premium") limite = Infinity;

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

      // --- CRIA MARCA SE NÃO EXISTIR (modal) ---
      const nomeMarca = getCampo(produto, "Marca*") || getCampo(produto, "Marca") || "";
      let marcaModal = await prisma.marca.findFirst({ where: { nome: nomeMarca, userId: String(userId) } });
      if (!marcaModal && nomeMarca) {
        marcaModal = await prisma.marca.create({ data: { nome: nomeMarca, userId: String(userId) } });
      }

      // --- CRIA CATEGORIA SE NÃO EXISTIR (modal) ---
      const nomeCategoria = getCampo(produto, "Categoria*") || getCampo(produto, "Categoria") || "";
      let categoriaModal = await prisma.categoria.findFirst({ where: { nome: nomeCategoria, userId: String(userId) } });
      if (!categoriaModal && nomeCategoria) {
        categoriaModal = await prisma.categoria.create({ data: { nome: nomeCategoria, userId: String(userId) } });
      }

      // --------- CONVERTE LABEL DE UNIDADE PARA VALUE ----------
      let unidadeBruta = String(getCampo(produto, "Unidade*") ?? getCampo(produto, "Unidade") ?? "");
      let unidade = unidadeLabelToValue[unidadeBruta] || unidadeBruta;

      // ---- CALCULA O CUSTO UNITÁRIO ----
      let custoTotal = String(getCampo(produto, "Custo Total*") ?? getCampo(produto, "Custo Total") ?? "0");
      let totalEmbalagem = String(getCampo(produto, "Total Embalagem*") ?? getCampo(produto, "Total na Embalagem") ?? "");
      let custoUnitario = "0";
      if (Number(custoTotal) > 0 && Number(totalEmbalagem) > 0) {
        custoUnitario = (Number(custoTotal) / Number(totalEmbalagem)).toFixed(4);
      }

      // CADASTRO REAL DO PRODUTO (apenas texto)
      const dados = {
        codigo: String(getCampo(produto, "Código") ?? ""),
        codBarras: String(getCampo(produto, "Código de Barras") ?? ""),
        nome: String(getCampo(produto, "Nome*") ?? getCampo(produto, "Nome") ?? ""),
        categoria: String(nomeCategoria ?? ""),
        marca: String(nomeMarca ?? ""),
        unidade: unidade,
        estoque: String(getCampo(produto, "Estoque*") ?? getCampo(produto, "Estoque") ?? "0"),
        custoTotal: custoTotal,
        custoUnitario: custoUnitario,
        custo: "0",
        ativo: String(getCampo(produto, "Ativo*") ?? getCampo(produto, "Ativo") ?? "1") === "1" ||
          String(getCampo(produto, "Ativo*") ?? getCampo(produto, "Ativo")).toLowerCase() === "sim",
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

// EDITAR PRODUTO (sem limitação)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    // --- AJUSTE PARA UNIDADE: sempre salva o value! ---
    if (dados.unidade && unidadeLabelToValue[dados.unidade]) {
      dados.unidade = unidadeLabelToValue[dados.unidade];
    }

    // ---- CALCULA O CUSTO UNITÁRIO ----
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

// DELETAR PRODUTO POR ID
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

// ========== ENTRADA DE ESTOQUE ==========
// *** BLOQUEIA PLANO GRATUITO ***
router.post("/entrada-estoque", auth, bloqueiaMovimentacaoGratuito, async (req, res) => {
  try {
    const { produtoId, quantidade, lote, valor, data } = req.body;
    const userId = req.userId;

    if (!produtoId || !quantidade || quantidade <= 0) {
      return res.status(400).json({ error: "Produto e quantidade obrigatórios." });
    }

    // Busca o produto
    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) return res.status(404).json({ error: "Produto não encontrado." });

    // Atualiza o estoque do produto
    const estoqueAtual = Number(produto.estoque || 0);
    const novoEstoque = estoqueAtual + Number(quantidade);

    // --- NOVO: Garantir data yyyy-MM-dd ---
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

    // Salva entrada no histórico (tabela EntradaEstoque)
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

    // Atualiza o estoque e o custoTotal no Produto!
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

// ========== SAÍDA DE ESTOQUE ==========
// *** BLOQUEIA PLANO GRATUITO ***
router.post("/saida-estoque", auth, bloqueiaMovimentacaoGratuito, async (req, res) => {
  try {
    const { produtoId, quantidade } = req.body;
    const userId = req.userId;

    if (!produtoId || !quantidade || quantidade <= 0) {
      return res.status(400).json({ error: "Produto e quantidade obrigatórios." });
    }

    // Busca produto no banco
    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) return res.status(404).json({ error: "Produto não encontrado" });

    // Verifica se tem estoque suficiente
    const estoqueAtual = Number(produto.estoque || 0);
    if (estoqueAtual < Number(quantidade)) {
      return res.status(400).json({ error: "Estoque insuficiente" });
    }

    // Atualiza o estoque (abate)
    const novoEstoque = estoqueAtual - Number(quantidade);
    await prisma.produto.update({
      where: { id: produtoId },
      data: { estoque: String(novoEstoque) }
    });

    // REGISTRA A SAÍDA NO HISTÓRICO! (agora FUNCIONANDO)
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

router.get('/:id/entradas', async (req, res) => {
  const { id } = req.params;
  try {
    // Busca todas as entradas desse produto
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

// =================== IMPORTAR XML DA NFE =======================
// *** BLOQUEIA PLANO GRATUITO ***
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

      // NFe pode estar em vários caminhos, tenta o padrão nacional
      let itens = [];
      try {
        const dets = result.nfeProc
          ? result.nfeProc.NFe.infNFe.det // XML baixado da SEFAZ
          : result.NFe.infNFe.det;        // XML assinado

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

          if (!nome) continue; // Pula item inválido

          // Procura se já existe pelo nome ou código de barras (ajuste se quiser)
          let produtoExistente = await prisma.produto.findFirst({
            where: {
              OR: [
                { nome: nome },
                codBarras ? { codBarras } : undefined
              ].filter(Boolean)
            }
          });

          if (produtoExistente) {
            // Atualiza estoque e valor se desejar!
            await prisma.produto.update({
              where: { id: produtoExistente.id },
              data: {
                estoque: String(Number(produtoExistente.estoque || 0) + quantidade),
                custoTotal: String(valorTotal)
              }
            });
            produtosCriados.push({ nome, atualizado: true });
          } else {
            // Cria novo produto (bem simples, pode enriquecer depois)
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
                userId: userId // Adicione aqui se seu model exigir
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
