// src/util/salvarImagem.js
// Sobe um buffer para o Cloudflare R2 e retorna a URL pública do arquivo.

const path = require('path');
const https = require('https');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { NodeHttpHandler } = require('@smithy/node-http-handler');

// ====== ENV OBRIGATÓRIAS ======
const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT,
  R2_PUBLIC_URL_PREFIX,
} = process.env;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT || !R2_PUBLIC_URL_PREFIX) {
  /* eslint-disable no-console */
  console.warn(
    '[salvarImagem] Variáveis R2 ausentes. ' +
      'Necessário: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT, R2_PUBLIC_URL_PREFIX'
  );
  /* eslint-enable no-console */
}

// ====== CLIENT S3 (R2) ======
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  minVersion: 'TLSv1.2', // força TLS >= 1.2
});

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  // Em endpoints S3-compatíveis, path-style costuma ser mais previsível.
  forcePathStyle: true,
  requestHandler: new NodeHttpHandler({ httpsAgent }),
});

// ====== HELPERS ======
function slugifyBaseName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sanitizePrefix(prefix) {
  if (!prefix) return '';
  return String(prefix).replace(/^\/+|\/+$/g, '');
}

function extFromMime(mimetype) {
  if (!mimetype) return '';
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
  };
  return map[mimetype] || '';
}

/**
 * Faz upload do buffer para o R2 e retorna a URL pública.
 *
 * @param {Buffer} buffer - conteúdo do arquivo
 * @param {string} originalname - nome original (para base do arquivo)
 * @param {string} mimetype - content-type do arquivo
 * @param {string} prefix - pasta/“diretório” dentro do bucket (ex.: "uploads/receitas")
 * @returns {Promise<string>} URL pública do arquivo
 */
async function salvarImagem(buffer, originalname, mimetype, prefix = 'uploads') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Buffer inválido para upload.');
  }
  if (!R2_BUCKET || !R2_PUBLIC_URL_PREFIX) {
    throw new Error('Configuração R2 incompleta (R2_BUCKET/R2_PUBLIC_URL_PREFIX ausentes).');
  }

  const safePrefix = sanitizePrefix(prefix);

  // base name sanitizado
  const extFromName = path.extname(originalname || '').toLowerCase();
  const baseName = slugifyBaseName(path.basename(originalname || 'arquivo', extFromName)) || 'arquivo';

  // escolhe extensão por prioridade: nome original -> mimetype -> vazio
  const ext =
    extFromName ||
    extFromMime(mimetype) ||
    '';

  // torna único
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const fileName = `${baseName}-${stamp}-${rand}${ext}`;

  // chave S3 (prefix + file)
  const key = safePrefix ? `${safePrefix}/${fileName}` : fileName;

  const putParams = {
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype || 'application/octet-stream',
    CacheControl: 'public, max-age=31536000, immutable',
  };

  await s3.send(new PutObjectCommand(putParams));

  // Gera URL pública usando o prefixo público (já contendo o nome do bucket)
  const pub = R2_PUBLIC_URL_PREFIX.replace(/\/+$/, ''); // remove barra final
  const url = `${pub}/${key}`;

  return url;
}

module.exports = salvarImagem;
