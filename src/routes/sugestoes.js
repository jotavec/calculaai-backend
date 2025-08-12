// src/routes/sugestoes.js
if (!process.env.DATABASE_URL) {
  require('dotenv').config();
}

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');

/**
 * @swagger
 * tags:
 *   - name: Sugestões
 *     description: Endpoints para envio de sugestões pelos usuários
 */

/* ========================= helpers ========================= */
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  console.warn('[Sugestoes] SMTP não configurado. Usando streamTransport (somente log).');
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
}

async function resolveUsuario(req) {
  const tentativas = [];

  if (req.userId) {
    tentativas.push({ tipo: 'id(req.userId)', where: { id: String(req.userId) } });
  }
  if (req.user && req.user.id) {
    tentativas.push({ tipo: 'id(req.user.id)', where: { id: String(req.user.id) } });
  }
  if (req.user && req.user.email) {
    tentativas.push({ tipo: 'email(req.user.email)', where: { email: String(req.user.email) } });
  }
  if (req.email) {
    tentativas.push({ tipo: 'email(req.email)', where: { email: String(req.email) } });
  }

  for (const t of tentativas) {
    try {
      const user =
        t.where.id
          ? await prisma.user.findUnique({ where: { id: t.where.id }, select: { id: true, name: true, email: true, cpf: true, telefone: true } })
          : await prisma.user.findUnique({ where: { email: t.where.email }, select: { id: true, name: true, email: true, cpf: true, telefone: true } });

      if (user) {
        return { user, via: t.tipo };
      }
    } catch (e) {
      console.warn('[Sugestoes] Falha ao buscar usuário via %s: %s', t.tipo, e?.message);
    }
  }

  return { user: null, via: null };
}

/**
 * @swagger
 * /sugestoes:
 *   post:
 *     tags: [Sugestões]
 *     summary: Envia uma nova sugestão
 *     description: Envia uma sugestão para o e-mail configurado no sistema
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assunto
 *               - descricao
 *             properties:
 *               assunto:
 *                 type: string
 *                 example: Melhorar o layout da página inicial
 *               descricao:
 *                 type: string
 *                 example: Acho que o layout poderia ser mais claro e com cores mais suaves.
 *     responses:
 *       201:
 *         description: Sugestão enviada com sucesso
 *       400:
 *         description: Campos obrigatórios não informados
 *       500:
 *         description: Erro interno ao enviar sugestão
 */
router.post('/', auth, async (req, res) => {
  const startedAt = new Date();

  try {
    const { assunto, descricao } = req.body || {};
    if (!assunto || !descricao) {
      return res.status(400).json({ error: 'assunto e descricao são obrigatórios' });
    }

    const { user, via } = await resolveUsuario(req);
    if (!user) {
      console.warn('[Sugestoes] Usuário não encontrado a partir do token. Campos disponíveis no req:', { userId: req.userId, user: req.user, email: req.email });
    } else {
      console.log('[Sugestoes] Usuário resolvido via %s -> id=%s email=%s', via, user.id, user.email);
    }

    const remetenteNome = user?.name || 'Usuário';
    const remetenteEmail = user?.email || 'email-nao-encontrado@dominio';
    const userIdExibicao = String(user?.id || req.userId || '-');

    const to = process.env.SUGESTOES_TO || process.env.MAIL_TO || process.env.SMTP_USER || 'dev@calculaa.ai';
    const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@calculaa.ai';

    const transporter = buildTransporter();

    const subject = `[CalculaAI] Nova sugestão: ${assunto}`;
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size:14px; color:#111827;">
        <h2 style="margin:0 0 10px 0;">Nova sugestão recebida</h2>
        <p><b>Assunto:</b> ${escapeHtml(assunto)}</p>
        <p><b>De:</b> ${escapeHtml(remetenteNome)} &lt;${escapeHtml(remetenteEmail)}&gt;</p>
        <p><b>User ID:</b> ${escapeHtml(userIdExibicao)}</p>
        <hr />
        <p style="white-space:pre-wrap; line-height:1.55;"><b>Descrição:</b><br>${escapeHtml(descricao)}</p>
        <p style="margin-top:16px; font-size:12px; color:#6b7280;">Enviado em: ${startedAt.toISOString()}</p>
      </div>
    `;

    const mailOptions = {
      to,
      from,
      subject,
      html,
    };

    if (remetenteEmail && remetenteEmail.includes('@') && !remetenteEmail.includes('nao-encontrado')) {
      mailOptions.replyTo = `${remetenteNome} <${remetenteEmail}>`;
    }

    const info = await transporter.sendMail(mailOptions);

    if (info?.message) console.log('[Sugestoes] Email stream (dev):\n', info.message.toString());
    if (info?.response) console.log('[Sugestoes] SMTP response:', info.response);

    return res.status(201).json({ ok: true, message: 'Sugestão enviada com sucesso.' });
  } catch (err) {
    console.error('[Sugestoes] Erro ao enviar sugestão:', err?.message, err);
    return res.status(500).json({ error: 'Falha ao enviar sugestão.' });
  }
});

module.exports = router;
