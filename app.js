'use strict';

/* ===================== ENV ===================== */
// Carrega .env localmente APENAS se DATABASE_URL não existir (em prod o host injeta)
if (!process.env.DATABASE_URL) {
  require('dotenv').config();
}

/* =================== IMPORTS =================== */
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

/* ============= Proxy awareness (Cloudflare/Nginx) ============= */
// Necessário para cookies Secure/SameSite atrás de proxy e para req.secure funcionar
app.set('trust proxy', 1);

/* ==================== CORS ====================== */
/**
 * Permitidos:
 * - https://app.calculaaibr.com (frontend produção)
 * - *.vercel.app (previews da Vercel)
 * - FRONTEND_ORIGIN/FRONTEND_URL das envs (fallback)
 */
const normalize = (u) => (typeof u === 'string' ? u.replace(/\/+$/, '') : u);

const allowlist = new Set(
  [
    'https://app.calculaaibr.com',
    process.env.FRONTEND_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.FRONTEND_ORIGIN_2,
    process.env.FRONTEND_ORIGIN_3,
  ]
    .filter(Boolean)
    .map(normalize)
);

const isVercel = (origin) =>
  /^https?:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin || '');

// Ajuda caches a respeitarem a variação por Origem
app.use((req, res, next) => {
  res.setHeader('Vary', 'Origin');
  next();
});

const corsDelegate = (req, cb) => {
  const origin = normalize(req.header('Origin') || '');
  const allowed =
    !origin || allowlist.has(origin) || isVercel(origin);

  cb(
    null,
    allowed
      ? {
          origin: true, // ecoa a Origin recebida
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
          optionsSuccessStatus: 204,
          maxAge: 86400,
        }
      : { origin: false, optionsSuccessStatus: 204 }
  );
};

app.use(cors(corsDelegate));
app.options('*', cors(corsDelegate));

/* ============== PARSERS & COOKIES ============== */
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

/* ======== ARQUIVOS ESTÁTICOS /uploads ========= */
const uploadsPublic = path.join(__dirname, 'public', 'uploads');
const uploadsLegacy = path.join(__dirname, 'uploads');

app.use('/uploads', express.static(uploadsPublic, { maxAge: '1d', fallthrough: true }));
app.use('/uploads', express.static(uploadsLegacy, { maxAge: '1d' }));
app.use('/uploads/receitas', express.static(path.join(uploadsPublic, 'receitas'), { maxAge: '1d' }));
app.use('/uploads/avatars', express.static(path.join(uploadsLegacy, 'avatars'), { maxAge: '1d' }));

/* ================== SWAGGER (no-op) ================== */
// Mantido “no-op” para não quebrar deploy; troque quando quiser habilitar real.
const swaggerUi = { serve: (req, res, next) => next(), setup: () => (req, res, next) => next() };
const swaggerSpec = { openapi: '3.0.0', info: { title: 'API', version: '1.0.0' } };
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/openapi.json', (_req, res) => res.type('application/json').send(swaggerSpec));
app.get('/docs-json', (_req, res) => res.type('application/json').send(swaggerSpec));

/* ===================== MIDDLEWARES ===================== */
const errorHandler = require('./src/middleware/errorHandler');
const auth = require('./src/middleware/auth');

/* ======================== ROTAS ======================== */
const despesasFixasRoutes          = require('./src/routes/despesasFixas');
const folhaDePagamentoRoutes       = require('./src/routes/folhaDePagamento');
const userRoutes                   = require('./src/routes/userRoutes.js');
const encargosSobreVendaRoutes     = require('./src/routes/encargosSobreVenda');
const filtroFaturamentoRoutes      = require('./src/routes/filtroFaturamento');
const markupIdealRoutes            = require('./src/routes/markupIdeal');
const blocoAtivosRoutes            = require('./src/routes/blocoAtivos');
const produtosRoutes               = require('./src/routes/produtos');
const preferenciasRoutes           = require('./src/routes/preferenciasRoutes');
const fornecedorRoutes             = require('./src/routes/fornecedores');
const movimentacoesRoutes          = require('./src/routes/movimentacoes');
const receitasRoutes               = require('./src/routes/receitas');
const uploadsReceitaRoutes         = require('./src/routes/uploadsReceita');
const rotuloNutricionalRoutes      = require('./src/routes/rotuloNutricional');
const categoriasNutricionaisRouter = require('./src/routes/categoriasNutricionais');
const mercadopagoRoutes            = require('./src/routes/mercadopagoRoutes');
const sugestoesRoutes              = require('./src/routes/sugestoes');

/* =================== MOUNT =================== */
app.use('/api/despesasfixas', despesasFixasRoutes);
app.use('/api/folhapagamento/funcionarios', folhaDePagamentoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/encargos-sobre-venda', encargosSobreVendaRoutes);
app.use('/api', filtroFaturamentoRoutes);
app.use('/api/markup-ideal', markupIdealRoutes);
app.use('/api/bloco-ativos', blocoAtivosRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/preferencias', preferenciasRoutes);
app.use('/api/fornecedores', fornecedorRoutes(prisma));
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/receitas', receitasRoutes);
app.use('/api/rotulo-nutricional', rotuloNutricionalRoutes);
app.use('/api/categorias-nutricionais', categoriasNutricionaisRouter);
app.use('/api/uploads', uploadsReceitaRoutes);
app.use('/api/mercadopago', mercadopagoRoutes);
app.use('/api/sugestoes', sugestoesRoutes);

/* ========================= MARCAS ========================= */
app.get('/api/marcas', auth, async (req, res) => {
  const userId = req.userId;
  try {
    const marcas = await prisma.marca.findMany({ where: { userId: String(userId) } });
    res.json(marcas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/marcas', auth, async (req, res) => {
  const userId = req.userId;
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
  try {
    const existe = await prisma.marca.findFirst({ where: { userId: String(userId), nome } });
    if (existe) return res.status(400).json({ error: 'Marca já existe' });
    const marca = await prisma.marca.create({ data: { nome, userId: String(userId) } });
    res.status(201).json(marca);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/marcas/:id', auth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });

  try {
    const marca = await prisma.marca.findUnique({ where: { id } });
    if (!marca) return res.status(404).json({ error: 'Marca não encontrada' });
    if (marca.userId !== userId) return res.status(403).json({ error: 'Acesso negado' });

    const marcaAtualizada = await prisma.marca.update({
      where: { id },
      data: { nome },
    });
    res.json(marcaAtualizada);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/marcas/:id', auth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  try {
    const marca = await prisma.marca.findUnique({ where: { id } });
    if (!marca) return res.status(404).json({ error: 'Marca não encontrada' });
    if (marca.userId !== userId) return res.status(403).json({ error: 'Acesso negado' });
    await prisma.marca.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================= CATEGORIAS ========================= */
app.get('/api/categorias', auth, async (req, res) => {
  const userId = req.userId;
  try {
    const categorias = await prisma.categoria.findMany({ where: { userId: String(userId) } });
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categorias', auth, async (req, res) => {
  const userId = req.userId;
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
  try {
    const existe = await prisma.categoria.findFirst({ where: { userId: String(userId), nome } });
    if (existe) return res.status(400).json({ error: 'Categoria já existe' });
    const categoria = await prisma.categoria.create({ data: { nome, userId: String(userId) } });
    res.status(201).json(categoria);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categorias/:id', auth, async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });

  try {
    const cat = await prisma.categoria.findUnique({ where: { id } });
    if (!cat) return res.status(404).json({ error: 'Categoria não encontrada' });
    if (cat.userId !== userId) return res.status(403).json({ error: 'Acesso negado' });

    const categoriaAtualizada = await prisma.categoria.update({
      where: { id },
      data: { nome },
    });
    res.json(categoriaAtualizada);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categorias/:id', auth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  try {
    const cat = await prisma.categoria.findUnique({ where: { id } });
    if (!cat) return res.status(404).json({ error: 'Categoria não encontrada' });
    if (cat.userId !== userId) return res.status(403).json({ error: 'Acesso negado' });
    await prisma.categoria.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =================== COMPANY CONFIG =================== */
app.get('/api/company-config', auth, async (req, res) => {
  const userId = req.userId;
  try {
    const config = await prisma.companyConfig.findUnique({ where: { userId } });
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/company-config', auth, async (req, res) => {
  const userId = req.userId;
  const {
    companyName, cnpj, phone, cep, rua, numero, bairro, cidade, estado,
    rentCost, energyCost, salaryCost, defaultMarkup, defaultTax, defaultCommission,
  } = req.body;

  try {
    let config = await prisma.companyConfig.findUnique({ where: { userId } });

    if (config) {
      config = await prisma.companyConfig.update({
        where: { userId },
        data: {
          companyName, cnpj, phone, cep, rua, numero, bairro, cidade, estado,
          rentCost, energyCost, salaryCost, defaultMarkup, defaultTax, defaultCommission,
        },
      });
    } else {
      config = await prisma.companyConfig.create({
        data: {
          userId,
          companyName, cnpj, phone, cep, rua, numero, bairro, cidade, estado,
          rentCost, energyCost, salaryCost, defaultMarkup, defaultTax, defaultCommission,
        },
      });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ buscar-nome-codbarras ------------------ */
app.get('/api/buscar-nome-codbarras/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  if (!codigo) return res.status(400).json({ erro: 'Código de barras obrigatório' });

  try {
    const foodRes = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${codigo}.json`,
      { timeout: 5000 }
    );
    if (foodRes.data && foodRes.data.product) {
      const produto = foodRes.data.product;
      const nome =
        produto.product_name ||
        produto.generic_name ||
        (produto.brands_tags && produto.brands_tags[0]) ||
        '';
      if (nome) return res.json({ nome });
    }
  } catch (e) {}

  try {
    const upcRes = await axios.get(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${codigo}`,
      { timeout: 5000 }
    );
    if (upcRes.data && upcRes.data.items && upcRes.data.items.length > 0) {
      const item = upcRes.data.items[0];
      const nome = item.title || item.description || '';
      if (nome) return res.json({ nome });
    }
  } catch (e) {}

  return res.json({ nome: '' });
});

/* ================== HEALTHCHECK ================== */
app.get('/health', (_req, res) => {
  res.send({ status: 'ok' });
});

/* ================ ERROR HANDLER ================ */
app.use(require('./src/middleware/errorHandler') || errorHandler);

/* ============ EXPORTA O APP ============ */
/**
 * Se você usa um arquivo separado que dá `app.listen(...)`,
 * mantenha o `module.exports = app;`.
 * Se preferir subir direto aqui, descomente o listen abaixo.
 */
module.exports = app;

// // Descomente se quiser ouvir aqui mesmo:
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`API rodando na porta ${PORT}`);
// });
