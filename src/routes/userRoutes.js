// src/routes/userRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const path = require("path");

// ---- S3 (Cloudflare R2) ----
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const R2_ENDPOINT = process.env.R2_ENDPOINT; // ex: https://<accountid>.r2.cloudflarestorage.com
const R2_BUCKET = process.env.R2_BUCKET; // ex: calculaai-uploads
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_URL_PREFIX = (process.env.R2_PUBLIC_URL_PREFIX || "").replace(/\/+$/, ""); // sem barra no fim

const s3 =
  R2_ENDPOINT && R2_BUCKET && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: "auto",
        endpoint: R2_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      })
    : null;

const router = express.Router();
const prisma = new PrismaClient();

const SECRET = process.env.JWT_SECRET || "sua_chave_secreta";
const TOKEN_DIAS = 7;
const TOKEN_TTL_MS = TOKEN_DIAS * 24 * 60 * 60 * 1000;

// ====== Cookies cross-site ======
const cookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
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

// Healthcheck
router.get("/debug-existe", (_req, res) => res.send({ ok: true }));

/* ---------- Multer (avatar em MEMÓRIA) ---------- */
// Limite de 5MB por avatar (ajuste se quiser)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/* ---------- helpers ---------- */
function extractTokenFromAuthHeader(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (!auth) return null;
  const [scheme, token] = String(auth).split(" ");
  if (/^Bearer$/i.test(scheme) && token) return token;
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

function sanitizeUser(u) {
  if (!u) return null;
  const { passwordHash, senha, ...rest } = u;
  return rest;
}

// Dado um avatarUrl antigo, se for do R2, extrai a chave (Key) relativa ao bucket
function keyFromPublicUrl(url) {
  if (!url || !R2_PUBLIC_URL_PREFIX) return null;
  const normalized = String(url).trim();
  if (!normalized.startsWith(R2_PUBLIC_URL_PREFIX)) return null;
  let key = normalized.slice(R2_PUBLIC_URL_PREFIX.length);
  key = key.replace(/^\/+/, "");
  return key || null;
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

// ===== Upload de avatar para o R2 =====
router.post("/me/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Arquivo não enviado." });
    if (!s3) return res.status(500).json({ error: "R2 não configurado no servidor." });

    const userId = req.userId;
    const file = req.file;

    const originalExt = (path.extname(file.originalname) || "").toLowerCase();
    const ext = originalExt && originalExt.length <= 6 ? originalExt : ".png";

    // Ex: avatars/<userId>/<timestamp>.png
    const key = `avatars/${userId}/${Date.now()}${ext}`;

    // Envia para o R2
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    // Apaga o avatar antigo (se existia e era do mesmo R2)
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    const oldKey = keyFromPublicUrl(current?.avatarUrl);
    if (oldKey) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
      } catch (_) {
        // silencioso — não falha o upload se não conseguiu deletar o antigo
      }
    }

    // Monta URL pública
    const publicUrl = R2_PUBLIC_URL_PREFIX
      ? `${R2_PUBLIC_URL_PREFIX}/${key}`
      : `${R2_ENDPOINT}/${R2_BUCKET}/${key}`; // fallback (recomendo sempre usar o prefixo público)

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
    });

    return res.json({ ok: true, avatarUrl: publicUrl });
  } catch (error) {
    console.error("[avatar upload R2]", error);
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
