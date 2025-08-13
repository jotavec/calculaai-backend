// src/middleware/auth.js
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

function requireAuth(req, res, next) {
  // 1) Tenta pegar do cookie (first-party)
  let token = req.cookies?.token;

  // 2) Se não achou no cookie, tenta pelo Authorization: Bearer <token>
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const [scheme, value] = authHeader.split(' ');
      if (/^Bearer$/i.test(scheme) && value) {
        token = value.trim();
      }
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido.' });
  }

  try {
    const payload = jwt.verify(token, SECRET);
    // Disponibiliza o payload para as próximas camadas
    req.user = payload;
    if (payload.userId) req.userId = payload.userId; // compatibilidade
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

module.exports = requireAuth;
