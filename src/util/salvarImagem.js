// src/util/salvarImagem.js
// Envia um buffer para o Cloudflare R2 e retorna a URL pública

const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const https = require('https');

const {
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL_PREFIX, // precisa incluir o bucket: ex: https://pub-xxxx.r2.dev/seu-bucket
} = process.env;

// Cliente S3 (R2) — TLS >= 1.2 e path-style habilitado
const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  requestHandler: new NodeHttpHandler({
    httpsAgent: new https.Agent({ keepAlive: true, minVersion: 'TLSv1.2' }),
  }),
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Salva um arquivo (buffer) no R2.
 * @param {Buffer} buffer - conteúdo do arquivo
 * @param {string} originalname - nome original para slug/ extensão
 * @param {string} mimetype - Content-Type
 * @param {string} basePath - pasta (ex: 'uploads/receitas')
 * @returns {Promise<string>} URL pública do arquivo
 */
async function salvarImagem(buffer, originalname, mimetype, basePath) {
  // Normaliza nome + extensão
  const ext = (path.extname(originalname) || '').toLowerCase();
  const nameOnly = (path.basename(originalname, ext) || 'file')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');

  const stamp = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');

  const key = `${basePath.replace(/^\/+|\/+$/g, '')}/${stamp}-${rand}-${nameOnly}${ext || ''}`;

  // Envia para o bucket
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype || 'application/octet-stream',
    ACL: 'private', // público será entregue pelo domínio / prefixo público
  }));

  // Monta URL pública (prefixo já deve conter o bucket)
  const prefix = (R2_PUBLIC_URL_PREFIX || '').replace(/\/+$/, '');
  return `${prefix}/${key}`;
}

module.exports = salvarImagem;
