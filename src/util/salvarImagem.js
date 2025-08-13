// src/util/salvarImagem.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const crypto = require('crypto');

// Inicialização do cliente S3 da forma correta e simplificada
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Salva um buffer de imagem no Cloudflare R2 e retorna a URL pública.
 * @param {Buffer} fileBuffer O buffer do arquivo de imagem.
 * @param {string} originalName O nome original do arquivo para pegar a extensão.
 * @param {string} mimeType O MIME type do arquivo (ex: 'image/jpeg').
 * @returns {Promise<string>} A URL pública completa da imagem salva.
 */
async function salvarImagem(fileBuffer, originalName, mimeType) {
  // Gera um nome de arquivo único para evitar conflitos
  const ext = path.extname(originalName || '') || '.jpg';
  const key = `${crypto.randomUUID()}${ext}`;

  // Prepara e envia o comando de upload para o R2
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  }));

  // Monta a URL pública final
  const base = (process.env.R2_PUBLIC_URL_PREFIX || '').replace(/\/+$/, '');
  return `${base}/${key}`;
}

module.exports = salvarImagem;
