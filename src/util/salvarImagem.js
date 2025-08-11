// src/util/salvarImagem.js
// Cloudflare R2 via S3 (HTTP/1.1 + path-style para evitar handshake/host-style)

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const path = require('path');
const crypto = require('crypto');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,           // ex.: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  forcePathStyle: true,                        // R2 precisa de path-style
  requestHandler: new NodeHttpHandler({ http2: false }), // força HTTP/1.1
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function salvarImagem(fileBuffer, originalName, mimeType) {
  const ext = path.extname(originalName || '') || '.jpg';
  const key = `${crypto.randomUUID()}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  }));

  const base = (process.env.R2_PUBLIC_URL_PREFIX || '').replace(/\/+$/, '');
  return `${base}/${key}`;
}

module.exports = salvarImagem;
