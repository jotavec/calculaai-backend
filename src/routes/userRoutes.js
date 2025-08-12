// src/routes/userRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const prisma = new PrismaClient();

const SECRET = process.env.JWT_SECRET || "sua_chave_secreta";
const TOKEN_DIAS = 7;
const TOKEN_TTL_MS = TOKEN_DIAS * 24 * 60 * 60 * 1000;

// ====== Opções do cookie de sessão (cross-site) ======
const cookieOpts = {
  httpOnly: true,
  secure: true,         // obrigatório junto com SameSite=None
  sameSite: "none",     // permite envio entre domínios (vercel.app -> onrender.com)
  path: "/",
  maxAge: TOKEN_TTL_MS,
};

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
router.get("/debug-existe", (_req, res) => {
  res.send({ ok: true });
});

/* ---------- Multer (avatar) ---------- */
const avatarsDir = path.join(__dirname, "../../uploads/avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || ".png").toLowerCase();
    cb(null, `${req.userId}${ext}`);
  },
});
const upload = multer({ storage });

/* ---------- helpers ---------- */
function extractTokenFromAuthHeader(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (!auth) return null;
  const [scheme, token] = String(auth).split(" ");
  if (/^Bearer$/i.test(scheme) && token) return token;
  return null;
}

function toPublicUploadsPath(p) {
  if (!p) return "";
  let rel = String(p).replace(/\\/g, "/");
  rel = rel.replace(/^public\//, "");
  if (!rel.startsWith("uploads/")) {
    const i = rel.indexOf("uploads/");
    if (i >= 0) rel = rel.slice(i);
  }
  if (!rel.startsWith("/")) rel = "/" + rel;
  return rel;
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

function sanitizeUser(u) {
  if (!u) return null;
  const { passwordHash, senha, ...rest } = u;
  return rest;
}

/* ---------- rotas ---------- */

// cadastro
router.post("/", async (req, res) => {
  const { name, email, password, cpf, telefone } = req.body || {};
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

    const token = jwt.sign({ userId: newUser.id }, SECRET, { expiresIn: `${TOKEN_DIAS}d` });
    res.cookie("token", token, cookieOpts);

    res.status(201).json({
      message: "Usuário cadastrado!",
      token,
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error("[users POST]", error);
    res.status(500).json({ error: "Erro ao cadastrar usuário." });
  }
});

// login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email e senha obrigatórios." });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Usuário ou senha inválidos." });

    const hash = user.passwordHash || user.senha;
    const valid = hash ? await bcrypt.compare(password, hash) : false;
    if (!valid) return res.status(401).json({ error: "Usuário ou senha inválidos." });

    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: `${TOKEN_DIAS}d` });
    res.cookie("token", token, cookieOpts);

    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error("[users/login]", error);
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
    console.error("[users/me]", error);
    res.status(500).json({ error: "Erro ao buscar usuário." });
  }
});

// atualizar perfil
router.put("/me", authMiddleware, async (req, res) => {
  try {
    const { name, email, cpf, telefone } = req.body || {};
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { name, email, cpf, telefone },
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true },
    });
    res.json(updated);
  } catch (error) {
    console.error("[users PUT /me]", error);
    res.status(500).json({ error: "Erro ao atualizar perfil." });
  }
});

// upload avatar
router.post("/me/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Arquivo não enviado." });

    const exts = [".png", ".jpg", ".jpeg", ".webp"];
    for (const e of exts) {
      const f = path.join(avatarsDir, `${req.userId}${e}`);
      if (fs.existsSync(f) && f !== req.file.path) {
        try { fs.unlinkSync(f); } catch (_) {}
      }
    }

    const avatarPathPublic = toPublicUploadsPath(`uploads/avatars/${req.file.filename}`);
    await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: avatarPathPublic },
    });

    res.json({ ok: true, avatarUrl: avatarPathPublic });
  } catch (error) {
    console.error("[avatar upload]", error);
    res.status(500).json({ error: "Erro ao salvar avatar." });
  }
});

// troca de senha
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { senhaNova } = req.body || {};
    if (!senhaNova || senhaNova.length < 6) {
      return res.status(400).json({ error: "Senha muito curta (mínimo 6 caracteres)." });
    }

    const senhaHash = await bcrypt.hash(senhaNova, 10);
    await prisma.user.update({ where: { id: req.userId }, data: { passwordHash: senhaHash } });

    res.json({ ok: true, message: "Senha alterada com sucesso!" });
  } catch (error) {
    console.error("[change-password]", error);
    res.status(500).json({ error: "Erro ao alterar senha." });
  }
});

// listagem (protegido)
router.get("/", authMiddleware, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true },
    });
    res.json(users);
  } catch (error) {
    console.error("[users GET /]", error);
    res.status(500).json({ error: "Erro ao buscar usuários." });
  }
});

// update por id
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, cpf, telefone } = req.body || {};
    const updatedUser = await prisma.user.update({
      where: { id: String(id) },
      data: { name, email, cpf, telefone },
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true },
    });
    res.json(updatedUser);
  } catch (error) {
    console.error("[users PUT /:id]", error);
    res.status(500).json({ error: "Erro ao atualizar usuário." });
  }
});

// buscar por id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: String(id) },
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true },
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json(user);
  } catch (error) {
    console.error("[users GET /:id]", error);
    res.status(500).json({ error: "Erro ao buscar usuário." });
  }
});

// logout
router.post("/logout", (_req, res) => {
  // precisa usar mesmos atributos do setCookie
  res.clearCookie("token", { ...cookieOpts, maxAge: 0 });
  res.json({ message: "Logout realizado!" });
});

// filtro de média de faturamento
router.get("/filtro-faturamento", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { filtroFaturamentoMediaTipo: true },
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ filtro: user.filtroFaturamentoMediaTipo || "6" });
  } catch (error) {
    console.error("[GET filtro-faturamento]", error);
    res.status(500).json({ error: "Erro ao buscar filtro" });
  }
});

router.post("/filtro-faturamento", authMiddleware, async (req, res) => {
  try {
    const { filtro } = req.body || {};
    await prisma.user.update({
      where: { id: req.userId },
      data: { filtroFaturamentoMediaTipo: filtro },
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("[POST filtro-faturamento]", error);
    res.status(500).json({ error: "Erro ao salvar filtro" });
  }
});

module.exports = router;
