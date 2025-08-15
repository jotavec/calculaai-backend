// src/routes/userRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const path = require("path");
const https = require("https");

// ---- AWS SDK / R2 (opcional) ----
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const router = express.Router();
const prisma = new PrismaClient();

// =============================================================================
// Configuração / Env
// =============================================================================
const SECRET = process.env.JWT_SECRET || "sua_chave_secreta";
const TOKEN_DIAS = Number(process.env.TOKEN_DIAS || 7);
const TOKEN_TTL_MS = TOKEN_DIAS * 24 * 60 * 60 * 1000;

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN.trim(); // ex.: .calculaai.com.br

// R2 (Cloudflare) - opcional
const R2_ENDPOINT = (process.env.R2_ENDPOINT || "").replace(/\/+$/, "");
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
// Ex.: https://pub-xxxx.r2.dev/seu-bucket
const R2_PUBLIC_URL_PREFIX = (process.env.R2_PUBLIC_URL_PREFIX || "").replace(/\/+$/, "");

// =============================================================================
// Utilidades
// =============================================================================
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  minVersion: "TLSv1.2",
});

const s3 =
  R2_ENDPOINT && R2_BUCKET && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: "auto",
        endpoint: R2_ENDPOINT,
        forcePathStyle: true,
        requestHandler: new NodeHttpHandler({ httpsAgent }),
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      })
    : null;

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function signToken(userId) {
  return jwt.sign({ userId }, SECRET, { expiresIn: `${TOKEN_DIAS}d` });
}

function extractTokenFromAuthHeader(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (!auth) return null;
  const [scheme, token] = String(auth).split(" ");
  return /^Bearer$/i.test(scheme) ? token : null;
}

function sanitizeUser(u) {
  if (!u) return null;
  const { passwordHash, senha, ...rest } = u;
  return rest;
}

function keyFromPublicUrl(url) {
  if (!url || !R2_PUBLIC_URL_PREFIX) return null;
  const normalized = String(url).trim();
  if (!normalized.startsWith(R2_PUBLIC_URL_PREFIX)) return null;
  let key = normalized.slice(R2_PUBLIC_URL_PREFIX.length).replace(/^\/+/, "");
  return key || null;
}

function isHttps(req) {
  // precisa de app.set('trust proxy', 1) no app principal
  return req.secure || String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https";
}

function buildCookieOpts(req) {
  // Em produção exigimos Secure/None + domain (se informado).
  // Em desenvolvimento/teste (sem HTTPS) usamos Lax e sem domain para funcionar por IP.
  const secure = IS_PROD ? true : isHttps(req);
  const sameSite = secure ? "none" : "lax";
  const domain = IS_PROD && COOKIE_DOMAIN ? COOKIE_DOMAIN : undefined;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: TOKEN_TTL_MS,
    ...(domain ? { domain } : {}),
  };
}

// =============================================================================
/** Middleware de Auth: cookie "token" OU Authorization: Bearer */
function authMiddleware(req, res, next) {
  let token = extractTokenFromAuthHeader(req);
  if (!token && req.cookies) token = req.cookies.token;
  if (!token) return res.status(401).json({ ok: false, error: "Token não fornecido." });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Token inválido." });
  }
}

// =============================================================================
// Multer (imagens)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype || "");
    cb(ok ? null : new Error("INVALID_FILE_TYPE"), ok);
  },
});

// Avatar pré-definido
const ALLOWED_PRESETS = new Set([
  "confeiteiro",
  "mecanico",
  "medico",
  "engenheiro",
  "chef",
  "atendente",
  "padeiro",
  "default",
]);

// =============================================================================
// Rotas
// =============================================================================

/** Health (útil p/ monitor e para proxy de saúde) */
router.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

/** Debug simples */
router.get("/debug-existe", (_req, res) => res.json({ ok: true }));

// -----------------------------------------------------------------------------
// Cadastro
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, email, password, cpf, telefone } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: "Preencha todos os campos." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ ok: false, error: "Email já cadastrado." });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { name, email, passwordHash, cpf, telefone },
    });

    const token = signToken(newUser.id);
    res.cookie("token", token, buildCookieOpts(req));

    return res.status(201).json({
      ok: true,
      message: "Usuário cadastrado!",
      token,
      user: sanitizeUser(newUser),
    });
  })
);

// -----------------------------------------------------------------------------
// Login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, error: "Email e senha obrigatórios." });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ ok: false, error: "Usuário ou senha inválidos." });

    const hash = user.passwordHash || user.senha;
    const valid = hash ? await bcrypt.compare(password, hash) : false;
    if (!valid) return res.status(401).json({ ok: false, error: "Usuário ou senha inválidos." });

    const token = signToken(user.id);
    res.cookie("token", token, buildCookieOpts(req));

    return res.json({ ok: true, token, user: sanitizeUser(user) });
  })
);

// -----------------------------------------------------------------------------
// Refresh de sessão (renova cookie sem alterar claims)
router.post(
  "/refresh",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const token = signToken(req.userId);
    res.cookie("token", token, buildCookieOpts(req));
    return res.json({ ok: true, token });
  })
);

// -----------------------------------------------------------------------------
// Dados do usuário logado
router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true },
    });
    if (!user) return res.status(404).json({ ok: false, error: "Usuário não encontrado." });
    return res.json({ ok: true, ...user });
  })
);

// -----------------------------------------------------------------------------
// Atualizar perfil (parcial)
router.put(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { name, email, cpf, telefone } = req.body || {};

    if (email) {
      const dupe = await prisma.user.findFirst({
        where: { email, NOT: { id: req.userId } },
        select: { id: true },
      });
      if (dupe) return res.status(400).json({ ok: false, error: "Email já em uso." });
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { name, email, cpf, telefone },
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true },
    });
    return res.json({ ok: true, ...updated });
  })
);

// -----------------------------------------------------------------------------
// Avatar preset (sem upload)
router.post(
  "/me/avatar-preset",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const key = String((req.body || {}).preset || "").toLowerCase().trim();
    if (!ALLOWED_PRESETS.has(key)) return res.status(400).json({ ok: false, error: "Preset inválido." });

    const val = `preset:${key}`;
    await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: val },
    });

    return res.json({ ok: true, avatarUrl: val });
  })
);

// -----------------------------------------------------------------------------
// Upload de avatar ao R2 (opcional)
router.post(
  "/me/avatar",
  authMiddleware,
  upload.single("avatar"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, error: "Arquivo não enviado." });
    if (!s3) return res.status(501).json({ ok: false, error: "R2 não configurado no servidor." });

    const userId = req.userId;
    const file = req.file;

    const originalExt = (path.extname(file.originalname) || "").toLowerCase();
    const ext = originalExt && originalExt.length <= 6 ? originalExt : ".png";
    const key = `avatars/${userId}/${Date.now()}${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    // apaga o avatar anterior (se público no R2)
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    const oldKey = keyFromPublicUrl(current?.avatarUrl);
    if (oldKey) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
      } catch (_) {}
    }

    const publicUrl = R2_PUBLIC_URL_PREFIX
      ? `${R2_PUBLIC_URL_PREFIX}/${key}`
      : `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
    });

    return res.json({ ok: true, avatarUrl: publicUrl });
  })
);

// -----------------------------------------------------------------------------
// Remover avatar (apaga no R2 se for URL pública; limpa campo)
router.delete(
  "/me/avatar",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const current = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { avatarUrl: true },
    });

    const oldKey = keyFromPublicUrl(current?.avatarUrl);
    if (oldKey && s3) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
      } catch (_) {}
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: null },
    });

    return res.json({ ok: true });
  })
);

// -----------------------------------------------------------------------------
// Troca de senha
router.post(
  "/change-password",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { senhaNova } = req.body || {};
    if (!senhaNova || senhaNova.length < 6) {
      return res.status(400).json({ ok: false, error: "Senha muito curta (mínimo 6 caracteres)." });
    }

    const senhaHash = await bcrypt.hash(senhaNova, 10);
    await prisma.user.update({ where: { id: req.userId }, data: { passwordHash: senhaHash } });

    return res.json({ ok: true, message: "Senha alterada com sucesso!" });
  })
);

// -----------------------------------------------------------------------------
// Listagem (admin simples – ajuste permissão conforme necessário)
router.get(
  "/",
  authMiddleware,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true },
    });
    return res.json({ ok: true, users });
  })
);

// -----------------------------------------------------------------------------
// Update por id (admin simples)
router.put(
  "/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, cpf, telefone } = req.body || {};

    if (email) {
      const dupe = await prisma.user.findFirst({
        where: { email, NOT: { id: String(id) } },
        select: { id: true },
      });
      if (dupe) return res.status(400).json({ ok: false, error: "Email já em uso." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: String(id) },
      data: { name, email, cpf, telefone },
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true },
    });
    return res.json({ ok: true, user: updatedUser });
  })
);

// -----------------------------------------------------------------------------
// Buscar por id
router.get(
  "/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: String(id) },
      select: { id: true, name: true, email: true, cpf: true, telefone: true, avatarUrl: true },
    });
    if (!user) return res.status(404).json({ ok: false, error: "Usuário não encontrado." });
    return res.json({ ok: true, user });
  })
);

// -----------------------------------------------------------------------------
// Logout
router.post(
  "/logout",
  asyncHandler((req, res) => {
    const opts = buildCookieOpts(req);
    res.clearCookie("token", { ...opts, maxAge: 0 });
    return res.json({ ok: true, message: "Logout realizado!" });
  })
);

module.exports = router;
