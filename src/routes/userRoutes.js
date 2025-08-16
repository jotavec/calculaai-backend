const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const path = require("path");
const https = require("https");

// ---- AWS SDK / R2 (opcional) ----
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const router = express.Router();
const prisma = new PrismaClient();

// =============================================================================
// Configuração / Env
// =============================================================================
const SECRET = process.env.JWT_SECRET || "GUILHERME_JOAO_E_DORTA_REI_DA_BALA";
const TOKEN_DIAS = Number(process.env.TOKEN_DIAS || 7);
const TOKEN_TTL_MS = TOKEN_DIAS * 24 * 60 * 60 * 1000;

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

// Defina no .env -> COOKIE_DOMAIN=.calculaaibr.com para funcionar em app. e api.
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN.trim();

const COOKIE_SECURE_ENV = (process.env.COOKIE_SECURE || "").trim();   // "true" | "false" | ""
const COOKIE_SAMESITE_ENV_RAW = (process.env.COOKIE_SAMESITE || "").trim(); // "None" | "Lax" | "Strict" | "none"...

function parseBool(v) {
  return /^(1|true|yes|on)$/i.test(String(v || "").trim());
}

function normalizeSameSite(v) {
  const s = String(v || "").toLowerCase().trim();
  if (s === "lax" || s === "strict" || s === "none") return s;
  return ""; // inválido -> forçamos padrão abaixo
}

// =============================================================================
/** Configuração R2 (opcional) */
// =============================================================================
const R2_ENDPOINT = (process.env.R2_ENDPOINT || "").replace(/\/+$/, "");
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_URL_PREFIX = (process.env.R2_PUBLIC_URL_PREFIX || "").replace(/\/+$/, "");

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

// =============================================================================
// Funções utilitárias
// =============================================================================
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
  // ⚠️ Requer app.set('trust proxy', 1) no app principal quando atrás de proxy
  return req.secure || String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https";
}

function buildCookieOpts(req) {
  // Secure: usa override do .env se presente; senão detecta HTTPS real
  const forcedSecure = COOKIE_SECURE_ENV !== "" ? parseBool(COOKIE_SECURE_ENV) : undefined;
  const secure = typeof forcedSecure === "boolean" ? forcedSecure : isHttps(req);

  // SameSite normalizado: se não vier algo válido, usamos "none" quando secure e "lax" quando não
  const samesiteEnv = normalizeSameSite(COOKIE_SAMESITE_ENV_RAW);
  const sameSite = samesiteEnv || (secure ? "none" : "lax");

  // Domain: só quando tiver domínio próprio E conexão segura (evita bloquear em http)
  const domain = secure && COOKIE_DOMAIN ? COOKIE_DOMAIN : undefined;

  return {
    httpOnly: true,
    secure,
    sameSite, // "none" | "lax" | "strict"
    path: "/",
    maxAge: TOKEN_TTL_MS,
    ...(domain ? { domain } : {}),
  };
}

// =============================================================================
// Middleware de autenticação
// =============================================================================
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
// Configuração de upload (avatar)
// =============================================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype || "");
    if (ok) return cb(null, true);
    return cb(new Error("INVALID_FILE_TYPE"));
  },
});

const ALLOWED_PRESETS = new Set([
  "confeiteiro", "mecanico", "medico", "engenheiro",
  "chef", "atendente", "padeiro", "default",
]);

// =============================================================================
// Rotas
// =============================================================================

/** Health (debug rápido) */
router.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

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
// Refresh de sessão (renova cookie com novo exp)
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
  (req, res, next) =>
    upload.single("avatar")(req, res, (err) => {
      if (err) {
        if (err.message === "INVALID_FILE_TYPE") {
          return res.status(400).json({ ok: false, error: "Tipo de arquivo inválido." });
        }
        return next(err);
      }
      return next();
    }),
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
// Remover avatar
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
