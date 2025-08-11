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
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
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
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
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
 *     summary: Login (define cookie httpOnly e também retorna token no JSON)
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
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     tags: [Users]
 *     summary: Dados do usuário logado
 *     responses:
 *       200:
 *         description: Usuário
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *   put:
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
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
 *             schema:
 *               $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /users/me/avatar:
 *   post:
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
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
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
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
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
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
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
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
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     tags: [Users]
 *     summary: Busca filtro de média de faturamento do usuário
 *     responses:
 *       200:
 *         description: Filtro atual
 *   post:
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
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

/* ---------- Multer (avatar) ---------- */
const avatarsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || ".png").toLowerCase();
    cb(null, `${req.userId}${ext}`);
  }
});
const upload = multer({ storage });

/* ---------- helpers ---------- */
function extractTokenFromAuthHeader(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (!auth) return null;
  const parts = String(auth).split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  return null;
}

function authMiddleware(req, res, next) {
  let token = extractTokenFromAuthHeader(req);
  if (!token && req.cookies) token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Token não fornecido." });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido." });
  }
}

// normaliza para algo como: /uploads/avatars/xxx.png
function toPublicUploadsPath(p) {
  if (!p) return '';
  let rel = String(p).replace(/\\/g, '/');
  rel = rel.replace(/^public\//, ''); // caso tenha vindo 'public/uploads/...'
  if (!rel.startsWith('uploads/')) {
    const i = rel.indexOf('uploads/');
    if (i >= 0) rel = rel.slice(i);
  }
  if (!rel.startsWith('/')) rel = '/' + rel;
  return rel;
}

/* ---------- rotas ---------- */

// cadastro
router.post("/", async (req, res) => {
  const { name, email, password, cpf, telefone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Preencha todos os campos." });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "Email já cadastrado." });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { name, email, passwordHash, cpf, telefone },
    });

    const token = jwt.sign({ userId: newUser.id }, SECRET, { expiresIn: "7d" });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: "Usuário cadastrado!",
      token,
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

// login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email e senha obrigatórios." });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Usuário ou senha inválidos." });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Usuário ou senha inválidos." });

    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl || "" }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no login." });
  }
});

// me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar usuário." });
  }
});

// atualizar perfil
router.put("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, email, cpf, telefone } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name, email, cpf, telefone },
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar perfil." });
  }
});

// upload avatar
router.post('/me/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado.' });
    }

    const userId = req.userId;

    // Remove arquivos antigos de outras extensões (se existirem)
    const exts = ['.png', '.jpg', '.jpeg', '.webp'];
    for (const e of exts) {
      const f = path.join(avatarsDir, `${userId}${e}`);
      if (fs.existsSync(f) && f !== req.file.path) {
        try { fs.unlinkSync(f); } catch (_) {}
      }
    }

    // Caminho público que o front vai usar
    const avatarPathPublic = toPublicUploadsPath(`uploads/avatars/${req.file.filename}`);

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatarPathPublic }
    });

    res.json({ ok: true, avatarUrl: avatarPathPublic });
  } catch (error) {
    console.error('[avatar upload]', error);
    res.status(500).json({ error: 'Erro ao salvar avatar.' });
  }
});

// troca de senha
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { senhaNova } = req.body;

    if (!senhaNova || senhaNova.length < 6) {
      return res.status(400).json({ error: "Senha muito curta (mínimo 6 caracteres)." });
    }

    const senhaHash = await bcrypt.hash(senhaNova, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: senhaHash } });

    res.json({ ok: true, message: "Senha alterada com sucesso!" });
  } catch {
    res.status(500).json({ error: "Erro ao alterar senha." });
  }
});

// listagem
router.get("/", authMiddleware, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true }
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: "Erro ao buscar usuários." });
  }
});

// update por id
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, cpf, telefone } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: String(id) },
      data: { name, email, cpf, telefone },
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true }
    });
    res.json(updatedUser);
  } catch {
    res.status(500).json({ error: "Erro ao atualizar usuário." });
  }
});

// buscar por id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: String(id) },
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true }
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Erro ao buscar usuário." });
  }
});

// logout
router.post("/logout", (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none', path: '/' });
  res.json({ message: "Logout realizado!" });
});

// filtro de média de faturamento
router.get("/filtro-faturamento", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { filtroFaturamentoMediaTipo: true }
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
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
