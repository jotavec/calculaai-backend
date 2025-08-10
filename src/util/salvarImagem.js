// src/util/salvarImagem.js
const fs = require("fs");
const path = require("path");

function salvarImagemBase64(base64, prefixo = "img") {
  if (!base64.startsWith("data:image")) return base64; // Já é URL? Só retorna!
  const matches = base64.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return null;
  const ext = matches[1].split("/")[1].split(";")[0];
  const data = matches[2];
  const buffer = Buffer.from(data, "base64");
  const uploadDir = path.join(__dirname, "../../public/uploads/");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const fileName = `${prefixo}_${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${fileName}`;
}

module.exports = salvarImagemBase64;
