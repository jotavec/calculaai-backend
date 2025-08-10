const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "sua_chave_secreta";

function authMiddleware(req, res, next) {
    // Primeiro tenta pegar do cookie
  let token = req.cookies && req.cookies.token;
  
  // Se não achou no cookie, tenta pelo header Authorization
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const [type, tokenHeader] = authHeader.split(" ");
      if (type === "Bearer" && tokenHeader) {
        token = tokenHeader;
      }
    }
  }

  if (!token) return res.status(401).json({ error: "Token não fornecido." });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

module.exports = authMiddleware;