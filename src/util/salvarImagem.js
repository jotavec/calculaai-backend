// src/util/salvarImagem.js
// Upload de arquivos para Cloudflare R2 usando AWS SDK v3
// Retorna a URL pública do arquivo

const path = require('path');
const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');

// ----- ENV OBRIGATÓRIAS -----
// R2_ACCESS_KEY_ID
// R2_SECRET_ACCESS_KEY
// R2_BUCKET
// R2_ENDPOINT              (ex.: https://<id>.r2.cloudflarestorage.com)
// R2_PUBLIC_URL_PREFIX     (ex.: https://pub-xxxxxx.r2.dev/calculaai-uploads)
const REQUIRED_ENVS = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_ENDPOINT',
  'R2_PUBLIC_URL_PREFIX',
];

for (const k of REQUIRED_ENVS) {
  if (!process.env[k]) {
    /* eslint-disable no-console */
    console.error(`[salvarImagem] Variável de ambiente ausente: ${k}`);
    /* eslint-enable no-console */
  }
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

/**
 * Faz upload no bucket R2 e retorna a URL pública.
 * @param {Buffer} buffer - conteúdo do arquivo
 * @param {string} originalName - nome original (para extrair a extensão)
 * @param {string} mimeType - content-type
 * @param {string} keyPrefix - subpasta dentro do bucket (ex.: 'uploads/receitas')
 * @returns {Promise<string>} URL pública do arquivo
 */
async function salvarImagem(buffer, originalName, mimeType, keyPrefix = 'uploads/receitas') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('[salvarImagem] Buffer inválido.');
  }

  const bucket = process.env.R2_BUCKET;
  const pub = (process.env.R2_PUBLIC_URL_PREFIX || '').replace(/\/+$/, '');

  const ext = path.extname(originalName || '') || '';
  const hash = crypto.randomBytes(6).toString('hex');
  const timestamp = Date.now();

  const key = `${String(keyPrefix).replace(/^\/+|\/+$/g, '')}/${timestamp}-${hash}${ext}`
    .replace(/\/{2,}/g, '/');

  const put = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType || 'application/octet-stream',
  });

  await s3.send(put);

  // Como já habilitamos a URL pública (R2_PUBLIC_URL_PREFIX), é só concatenar:
  const url = `${pub}/${key}`;
  return url;
}

module.exports = salvarImagem;
