const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Rotas de usuários
 *
 * components:
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: token
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         email: { type: string, format: email }
 *         cpf: { type: string, nullable: true }
 *         telefone: { type: string, nullable: true }
 *         avatarUrl: { type: string, nullable: true }
 *     UserCreate:
 *       type: object
 *       required: [name, email, password]
 *       properties:
 *         name: { type: string }
 *         email: { type: string, format: email }
 *         password: { type: string, format: password }
 *         cpf: { type: string }
 *         telefone: { type: string }
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, format: email }
 *         password: { type: string, format: password }
 *     UserUpdate:
 *       type: object
 *       properties:
 *         name: { type: string }
 *         email: { type: string, format: email }
 *         cpf: { type: string }
 *         telefone: { type: string }
 *     ChangePassword:
 *       type: object
 *       required: [senhaNova]
 *       properties:
 *         senhaNova: { type: string, minLength: 6 }
 *     FiltroFaturamentoSave:
 *       type: object
 *       required: [filtro]
 *       properties:
 *         filtro: { type: string, example: "6" }
 */

/**
 * @swagger
 * /users/debug-existe:
 *   get:
 *     tags: [Users]
 *     summary: Healthcheck simples
 *     responses:
 *       200: { description: OK }
 */

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Cadastrar usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserCreate' }
 *     responses:
 *       201:
 *         description: Usuário criado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *   get:
 *     security: [ { cookieAuth: [] } ]
 *     tags: [Users]
 *     summary: Listar usuários (protegido)
 *     responses:
 *       200:
 *         description: Lista de usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/User' }
 */

/**
 * @swagger
 * /users/login:
 *   post:
 *     tags: [Users]
 *     summary: Login (define cookie httpOnly)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       200:
 *         description: Usuário autenticado
 */

/**
 * @swagger
 * /users/logout:
 *   post:
 *     tags: [Users]
 *     summary: Logout (apaga cookie)
 *     responses:
 *       200: { description: OK }
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     security: [ { cookieAuth: [] } ]
 *     tags: [Users]
 *     summary: Dados do usuário logado
 *     responses:
 *       200:
 *         description: Usuário
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *   put:
 *     security: [ { cookieAuth: [] } ]
 *     tags: [Users]
 *     summary: Atualiza perfil do usuário logado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserUpdate' }
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 */

/**
 * @swagger
 * /users/me/avatar:
 *   post:
 *     security: [ { cookieAuth: [] } ]
 *     tags: [Users]
 *     summary: Upload de avatar do usuário logado
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar salvo
 */

/**
 * @swagger
 * /users/change-password:
 *   post:
 *     security: [ { cookieAuth: [] } ]
 *     tags: [Users]
 *     summary: Trocar senha
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ChangePassword' }
 *     responses:
 *       200: { description: OK }
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     security: [ { cookieAuth: [] } ]
 *     tags: [Users]
 *     summary: Buscar usuário por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuário
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *   put:
 *     security: [ { cookieAuth: [] } ]
 *     tags: [Users]
 *     summary: Atualizar usuário por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserUpdate' }
 *     responses:
 *       200:
 *         description: Usuário atualizado
 */

/**
 * @swagger
 * /users/filtro-faturamento:
 *   get:
 *     security: [ { cookieAuth: [] } ]
 *     tags: [Users]
 *     summary: Busca filtro de média de faturamento do usuário
 *     responses:
 *       200:
 *         description: Filtro atual
 *   post:
 *     security: [ { cookieAuth: [] } ]
 *     tags: [Users]
 *     summary: Salva filtro de média de faturamento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/FiltroFaturamentoSave' }
 *     responses:
 *       200: { description: OK }
 */

router.get("/debug-existe", (req, res) => {
  res.send({ ok: true });
});

const prisma = new PrismaClient();

const SECRET = process.env.JWT_SECRET || "sua_chave_secreta";

// ===== Multer setup para upload de avatar =====
const avatarsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${req.userId}${ext}`);
  }
});
const upload = multer({ storage });

// Servir estático os arquivos de avatar (acessa via /uploads/avatars/nome.png)
router.use('/uploads/avatars', express.static(avatarsDir));

// ===== Middleware para autenticação =====
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Token não fornecido." });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido." });
  }
}

// ========== CADASTRAR USUÁRIO ==========
router.post("/", async (req, res) => {
  const { name, email, password, cpf, telefone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Preencha todos os campos." });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email já cadastrado." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, passwordHash, cpf, telefone },
    });

    // Gera token JWT
    const token = jwt.sign({ userId: newUser.id }, SECRET, { expiresIn: "7d" });

    // Cookie cross-site (frontend localhost -> backend Render)
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,        // Render é HTTPS
      sameSite: 'none',    // necessário p/ enviar cookie cross-site
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: "Usuário cadastrado!",
      token, // <- ADICIONADO
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        cpf: newUser.cpf || "",
        telefone: newUser.telefone || "",
        avatarUrl: newUser.avatarUrl || "",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao cadastrar usuário." });
  }
});

// ========== LOGIN ==========
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email e senha obrigatórios." });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return res.status(401).json({ error: "Usuário ou senha inválidos." });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(401).json({ error: "Usuário ou senha inválidos." });

    // Gera o token com o id do usuário
    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" });

    // Cookie cross-site (frontend localhost -> backend Render)
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,        // Render é HTTPS
      sameSite: 'none',    // necessário p/ enviar cookie cross-site
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // <- ADICIONADO: também devolve o token no JSON
    res.json({ 
      token,
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl || "" } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no login." });
  }
});

// ========== ROTA GET /me ==========
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        telefone: true,
        avatarUrl: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar usuário." });
  }
});

// ========== ROTA PUT /me ==========
router.put("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, email, cpf, telefone } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name, email, cpf, telefone },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        telefone: true,
        avatarUrl: true,
      }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar perfil." });
  }
});

// ========== ROTA DE UPLOAD DE AVATAR ==========
router.post('/me/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.userId;
    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatarPath }
    });

    res.json({ ok: true, avatarUrl: avatarPath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar avatar.' });
  }
});

// ========== TROCA DE SENHA ==========
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { senhaNova } = req.body;

    if (!senhaNova || senhaNova.length < 6) {
      return res.status(400).json({ error: "Senha muito curta (mínimo 6 caracteres)." });
    }

    const senhaHash = await bcrypt.hash(senhaNova, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: senhaHash }
    });

    res.json({ ok: true, message: "Senha alterada com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao alterar senha." });
  }
});

// ========== OUTRAS ROTAS ==========
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar usuários." });
  }
});
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, cpf, telefone } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: String(id) },
      data: { name, email, cpf, telefone },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        telefone: true,
        avatarUrl: true,
      }
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar usuário." });
  }
});
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: String(id) },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        telefone: true,
        avatarUrl: true,
      }
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar usuário." });
  }
});

// ========== LOGOUT ==========
router.post("/logout", (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
  });
  res.json({ message: "Logout realizado!" });
});

// ==================== FILTRO DE MÉDIA DE FATURAMENTO ====================
router.get("/filtro-faturamento", authMiddleware, async (req, res) => {
  try {
    console.log('ID recebido no filtro-faturamento:', req.userId);
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { filtroFaturamentoMediaTipo: true }
    });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    res.json({ filtro: user.filtroFaturamentoMediaTipo || "6" });
  } catch {
    res.status(500).json({ error: "Erro ao buscar filtro" });
  }
});

router.post("/filtro-faturamento", authMiddleware, async (req, res) => {
  try {
    const { filtro } = req.body;
    await prisma.user.update({
      where: { id: req.userId },
      data: { filtroFaturamentoMediaTipo: filtro }
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao salvar filtro" });
  }
});

module.exports = router;
