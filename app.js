// Carrega .env localmente se a DATABASE_URL não existir no ambiente
if (!process.env.DATABASE_URL) {
  require('dotenv').config();
}

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const axios = require('axios');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Swagger (protege a importação para não derrubar o servidor se der erro)
let swaggerUi, swaggerSpec;
try {
  ({ swaggerUi, swaggerSpec } = require('./swagger'));
} catch (e) {
  console.warn('Swagger desabilitado:', e.message);
  // middlewares no-op para não quebrar /docs e /docs-json
  swaggerUi = {
    serve: (req, res, next) => next(),
    setup: () => (req, res, next) => next(),
  };
  swaggerSpec = { openapi: '3.0.0', info: { title: 'API', version: '1.0.0' } };
}

// Middlewares próprios
const errorHandler = require('./src/middleware/errorHandler');
const auth = require('./src/middleware/auth');

// Rotas
const despesasFixasRoutes = require('./src/routes/despesasFixas');
const folhaDePagamentoRoutes = require('./src/routes/folhaDePagamento');
const userRoutes = require('./src/routes/userRoutes.js');
const encargosSobreVendaRoutes = require('./src/routes/encargosSobreVenda');
const filtroFaturamentoRoutes = require('./src/routes/filtroFaturamento');
const markupIdealRoutes = require('./src/routes/markupIdeal');
const blocoAtivosRoutes = require('./src/routes/blocoAtivos');
const produtosRoutes = require('./src/routes/produtos');
const preferenciasRoutes = require('./src/routes/preferenciasRoutes');
const fornecedorRoutes = require('./src/routes/fornecedores');
const movimentacoesRoutes = require('./src/routes/movimentacoes');
const receitasRoutes = require('./src/routes/receitas');
const uploadsReceitaRoutes = require('./src/routes/uploadsReceita');
const rotuloNutricionalRoutes = require('./src/routes/rotuloNutricional');
const categoriasNutricionaisRouter = require('./src/routes/categoriasNutricionais');
const mercadopagoRoutes = require('./src/routes/mercadopagoRoutes');
const sugestoesRoutes = require('./src/routes/sugestoes');

const app = express();

/* ==================== CORS ======================
 * Em produção, defina FRONTEND_ORIGIN no ambiente.
 */
const allowedOrigins = ['http://localhost:5173'];
if (process.env.FRONTEND_ORIGIN) allowedOrigins.push(process.env.FRONTEND_ORIGIN);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
/* =============================================== */

/**
 * --------- SERVIR ARQUIVOS ESTÁTICOS /uploads ----------
 * 1) public/uploads  -> uploads de receitas
 * 2) uploads         -> legado (avatars etc)
 */
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Swagger UI (declare APENAS UMA vez)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// JSON do OpenAPI (dois aliases pra facilitar testes)
app.get('/openapi.json', (_req, res) => {
  res.type('application/json').send(swaggerSpec);
});
app.get('/docs-json', (_req, res) => {
  res.type('application/json').send(swaggerSpec);
});

/* =================== ROTAS PRINCIPAIS =================== */
app.use('/api/despesasfixas', despesasFixasRoutes);
app.use('/api/folhapagamento/funcionarios', folhaDePagamentoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/encargos-sobre-venda', encargosSobreVendaRoutes);
app.use('/api/filtro-faturamento', filtroFaturamentoRoutes);
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
    companyName,
    cnpj,
    phone,
    cep,
    rua,
    numero,
    bairro,
    cidade,
    estado,
    rentCost,
    energyCost,
    salaryCost,
    defaultMarkup,
    defaultTax,
    defaultCommission,
  } = req.body;

  try {
    let config = await prisma.companyConfig.findUnique({ where: { userId } });

    if (config) {
      config = await prisma.companyConfig.update({
        where: { userId },
        data: {
          companyName,
          cnpj,
          phone,
          cep,
          rua,
          numero,
          bairro,
          cidade,
          estado,
          rentCost,
          energyCost,
          salaryCost,
          defaultMarkup,
          defaultTax,
          defaultCommission,
        },
      });
    } else {
      config = await prisma.companyConfig.create({
        data: {
          userId,
          companyName,
          cnpj,
          phone,
          cep,
          rua,
          numero,
          bairro,
          cidade,
          estado,
          rentCost,
          energyCost,
          salaryCost,
          defaultMarkup,
          defaultTax,
          defaultCommission,
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

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/health', (_req, res) => {
  res.send({ status: 'ok' });
});

// Middleware de erro sempre por último
app.use(errorHandler);

module.exports = app;
